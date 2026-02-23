/**
 * Errora — Cloudflare Worker API Gateway
 *
 * Multi-tenant SaaS Architecture:
 * 1. Validates the API key against the `clients` table in Supabase
 * 2. Uploads screenshot to Supabase Storage
 * 3. Sends notification to the CLIENT's Telegram, Notion, Discord, and/or Slack
 * 4. Logs the report in the `reports` table
 *
 * Environment Variables (set via wrangler.toml or `wrangler secret put`):
 *   SUPABASE_URL          — https://xxx.supabase.co
 *   SUPABASE_KEY          — service_role key (bypasses RLS)
 *   ALLOWED_ORIGINS       — Comma-separated list of allowed origins (optional, * for any)
 *   NOTION_CLIENT_ID      — Notion OAuth public integration client ID
 *   NOTION_CLIENT_SECRET  — Notion OAuth client secret
 *   NOTION_REDIRECT_URI   — OAuth callback URL (this worker's /api/notion/callback)
 *   SLACK_CLIENT_ID       — Slack OAuth app client ID
 *   SLACK_CLIENT_SECRET   — Slack OAuth app client secret
 *   SLACK_REDIRECT_URI    — OAuth callback URL (this worker's /api/slack/callback)
 *   DASHBOARD_URL         — Dashboard base URL for post-OAuth redirect
 */

const translations = {
    en: {
        new_bug_report: '🐞 New bug report',
        comment: '💬 Comment:',
        url: '🌐 URL',
        browser: '🖥 Browser',
        os: '💻 OS',
        screen: '📐 Screen',
        time: '🕐 Time',
        console_logs: '📋 Console (last {COUNT})',
        footer_text: 'Errora Bug Reporter',
        no_comment: '(no comment)',
        status: 'Status',
        status_new: 'New',
        attachments: 'Attachments',
        screenshot: 'Screenshot',
        console: 'Console Logs',
        reporter_email: '📧 Reporter Email',
        severity: '🔥 Severity'
    },
    ru: {
        new_bug_report: '🐞 Новый баг-репорт',
        comment: '💬 Комментарий:',
        url: '🌐 URL',
        browser: '🖥 Браузер',
        os: '💻 ОС',
        screen: '📐 Экран',
        time: '🕐 Время',
        console_logs: '📋 Консоль (последние {COUNT})',
        footer_text: 'Errora Bug Reporter',
        no_comment: '(без комментария)',
        status: 'Статус',
        status_new: 'Новый',
        attachments: 'Вложения',
        screenshot: 'Скриншот',
        console: '📋 Консоль',
        reporter_email: '📧 Email автора',
        severity: '🔥 Срочность'
    }
};

const SEVERITY_EMOJIS = {
    low: '🟢',
    medium: '🟡',
    high: '🟠',
    critical: '🔴'
};

function t(key, lang = 'en', params = {}) {
    const dict = translations[lang] || translations['en'];
    let str = dict[key] || translations['en'][key] || key;

    Object.keys(params).forEach(p => {
        str = str.replace(`{${p}}`, params[p]);
    });

    return str;
}

export default {
    async fetch(request, env) {
        // ── CORS preflight ──
        if (request.method === 'OPTIONS') {
            return handleCORS(request, env);
        }

        const url = new URL(request.url);

        // ── Route: POST /api/report ──
        if (url.pathname === '/api/report' && request.method === 'POST') {
            return handleReport(request, env);
        }

        // ── Route: GET /api/config ──
        if (url.pathname === '/api/config' && request.method === 'GET') {
            return handleConfig(request, env, url);
        }

        // ── Route: GET /api/notion/auth — Start Notion OAuth ──
        if (url.pathname === '/api/notion/auth' && request.method === 'GET') {
            return handleNotionAuth(request, env, url);
        }

        // ── Route: GET /api/notion/callback — Notion OAuth callback ──
        if (url.pathname === '/api/notion/callback' && request.method === 'GET') {
            return handleNotionCallback(request, env, url);
        }

        // ── Route: POST /api/notion/disconnect — Disconnect Notion ──
        if (url.pathname === '/api/notion/disconnect' && request.method === 'POST') {
            return handleNotionDisconnect(request, env);
        }

        // ── Route: GET /api/slack/auth — Start Slack OAuth ──
        if (url.pathname === '/api/slack/auth' && request.method === 'GET') {
            return handleSlackAuth(request, env, url);
        }

        // ── Route: GET /api/slack/callback — Slack OAuth callback ──
        if (url.pathname === '/api/slack/callback' && request.method === 'GET') {
            return handleSlackCallback(request, env, url);
        }

        // ── Route: POST /api/slack/disconnect — Disconnect Slack ──
        if (url.pathname === '/api/slack/disconnect' && request.method === 'POST') {
            return handleSlackDisconnect(request, env);
        }

        // ── Health check ──
        if (url.pathname === '/health') {
            return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
        }

        return jsonResponse({ error: 'Not Found' }, 404);
    },
    async scheduled(event, env, ctx) {
        ctx.waitUntil(processNotionPolling(env));
    },
};

// ────────────────────────────────────────────
// Route Handler: /api/report
// ────────────────────────────────────────────

async function handleReport(request, env) {
    try {
        const body = await request.json();
        const { comment, screenshot, metadata, apiKey, consoleLogs, reporterEmail, severity } = body;

        // ── Validate API Key ──
        if (!apiKey) {
            return jsonResponse({ error: 'API key is required' }, 401, request);
        }

        const client = await getClientByApiKey(apiKey, env);
        if (!client) {
            return jsonResponse({ error: 'Invalid API key' }, 401, request);
        }

        if (!client.is_active) {
            return jsonResponse({ error: 'Account is deactivated' }, 403, request);
        }

        // ── Validate Origin (Domain Protection) ──
        if (client.allowed_domains && client.allowed_domains.length > 0) {
            const origin = request.headers.get('Origin') || '';
            const isAllowed = client.allowed_domains.some((domain) => {
                // Match origin exactly or match just the hostname
                return origin === domain || origin === `https://${domain}` || origin === `http://${domain}`;
            });
            if (!isAllowed) {
                return jsonResponse({ error: 'Domain not allowed' }, 403, request);
            }
        }

        // ── Validate payload ──
        if (!comment && !screenshot) {
            return jsonResponse({ error: 'Comment or screenshot is required' }, 400, request);
        }

        // ── Upload screenshot to Supabase Storage ──
        let screenshotUrl = null;
        if (screenshot) {
            screenshotUrl = await uploadToSupabase(screenshot, env);
        }

        // ── Build report object ──
        const lang = client.language || 'en';
        const report = {
            comment: comment || t('no_comment', lang),
            screenshotUrl,
            metadata: metadata || {},
            consoleLogs: Array.isArray(consoleLogs) ? consoleLogs : [],
            receivedAt: new Date().toISOString(),
            reporterEmail: reporterEmail ? reporterEmail.trim() : null,
            severity: severity || 'medium',
        };

        // ── Send to client's integrations (in parallel) ──
        const integrationTasks = {};

        if (client.tg_chat_id && (client.tg_bot_token || env.SYSTEM_TG_BOT_TOKEN)) {
            integrationTasks.telegram = sendToTelegram(report, client, env, lang);
        }

        const notionToken = client.notion_access_token || client.notion_key;
        if (notionToken && client.notion_db_id) {
            integrationTasks.notion = sendToNotion(report, client, notionToken, lang);
        }

        if (client.discord_bot_token && client.discord_channel_id) {
            integrationTasks.discord = sendToDiscord(report, client, lang);
        }

        if (client.slack_webhook_url) {
            integrationTasks.slack = sendToSlack(report, client, lang);
        }

        const keys = Object.keys(integrationTasks);
        const results = await Promise.allSettled(keys.map(k => integrationTasks[k]));

        const sentStatus = {};
        const externalIds = {};
        keys.forEach((key, i) => {
            const result = results[i];
            sentStatus[key] = result.status === 'fulfilled';
            if (result.status === 'fulfilled' && result.value) {
                externalIds[key] = result.value;
            }
        });

        // Check for errors
        const errors = results
            .filter((r) => r.status === 'rejected')
            .map((r) => r.reason?.message || 'Unknown error');

        if (errors.length > 0) {
            console.error('Integration errors:', errors);
        }

        // ── Log the report ──
        await logReport(client.id, report, screenshotUrl, sentStatus.telegram || false, sentStatus.notion || false, sentStatus.discord || false, sentStatus.slack || false, externalIds.notion || null, env);

        return jsonResponse(
            { success: true, message: 'Report received', errors },
            200,
            request
        );
    } catch (err) {
        console.error('handleReport error:', err);
        return jsonResponse(
            { error: 'Internal Server Error', details: err.message },
            500,
            request
        );
    }
}

// ────────────────────────────────────────────
// Route Handler: /api/config
// ────────────────────────────────────────────

async function handleConfig(request, env, url) {
    try {
        const apiKey = url.searchParams.get('apiKey');
        if (!apiKey) {
            return jsonResponse({ error: 'apiKey query parameter is required' }, 400, request);
        }

        const client = await getClientByApiKey(apiKey, env);
        if (!client) {
            return jsonResponse({ error: 'Invalid API key' }, 401, request);
        }

        if (!client.is_active) {
            return jsonResponse({ error: 'Account is deactivated' }, 403, request);
        }

        return jsonResponse({
            mode: client.widget_mode || 'public',
            secretHash: client.widget_secret_hash || null,
        }, 200, request);
    } catch (err) {
        console.error('handleConfig error:', err);
        return jsonResponse(
            { error: 'Internal Server Error', details: err.message },
            500,
            request
        );
    }
}

// ────────────────────────────────────────────
// Client Lookup (Supabase REST API)
// ────────────────────────────────────────────

async function getClientByApiKey(apiKey, env) {
    const url = `${env.SUPABASE_URL}/rest/v1/clients?api_key=eq.${encodeURIComponent(apiKey)}&select=*&limit=1`;

    const resp = await fetch(url, {
        headers: {
            apikey: env.SUPABASE_KEY,
            Authorization: `Bearer ${env.SUPABASE_KEY}`,
        },
    });

    if (!resp.ok) {
        console.error('Supabase client lookup failed:', await resp.text());
        return null;
    }

    const rows = await resp.json();
    return rows.length > 0 ? rows[0] : null;
}

// ────────────────────────────────────────────
// Report Logging (Supabase REST API)
// ────────────────────────────────────────────

async function logReport(clientId, report, screenshotUrl, tgSent, notionSent, discordSent, slackSent, notionPageId, env) {
    const meta = report.metadata || {};

    const url = `${env.SUPABASE_URL}/rest/v1/reports`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: {
                apikey: env.SUPABASE_KEY,
                Authorization: `Bearer ${env.SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({
                client_id: clientId,
                comment: report.comment,
                screenshot_url: screenshotUrl,
                page_url: meta.url || null,
                browser: meta.browser || null,
                os: meta.os || null,
                screen_size: meta.screenSize || null,
                console_logs: report.consoleLogs.length > 0 ? report.consoleLogs : null,
                tg_sent: tgSent,
                notion_sent: notionSent,
                discord_sent: discordSent,
                slack_sent: slackSent,
                reporter_email: report.reporterEmail,
                notion_page_id: notionPageId,
                severity: report.severity,
                status: 'open',
            }),
        });
    } catch (err) {
        // Non-critical: log but don't fail the request
        console.error('Failed to log report:', err.message);
    }
}

// ────────────────────────────────────────────
// Supabase Storage Upload
// ────────────────────────────────────────────

async function uploadToSupabase(base64Data, env) {
    const SUPABASE_URL = env.SUPABASE_URL;
    const SUPABASE_KEY = env.SUPABASE_KEY;
    const BUCKET = 'bug-reports';

    // Remove data URL prefix if present
    const base64Clean = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const binaryStr = atob(base64Clean);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
    }

    const fileName = `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.png`;

    const uploadUrl = `${SUPABASE_URL}/storage/v1/object/${BUCKET}/${fileName}`;

    const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'image/png',
            'x-upsert': 'true',
        },
        body: bytes.buffer,
    });

    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Supabase upload failed (${response.status}): ${errText}`);
    }

    // Build public URL
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${fileName}`;
}

// ────────────────────────────────────────────
// Discord Integration
// ────────────────────────────────────────────

async function sendToDiscord(report, client, lang = 'en') {
    const token = client.discord_bot_token;
    const channelId = client.discord_channel_id;
    const meta = report.metadata || {};

    const embed = {
        title: t('new_bug_report', lang),
        color: 0xff4444,
        description: report.comment,
        fields: [
            { name: t('url', lang), value: meta.url || 'N/A', inline: false },
            { name: t('browser', lang), value: meta.browser || 'N/A', inline: true },
            { name: t('os', lang), value: meta.os || 'N/A', inline: true },
            { name: t('screen', lang), value: meta.screenSize || 'N/A', inline: true },
            { name: t('severity', lang), value: `${SEVERITY_EMOJIS[report.severity]} ${report.severity.toUpperCase()}`, inline: true },
        ],
        timestamp: report.receivedAt,
        footer: { text: t('footer_text', lang) },
    };

    if (report.reporterEmail) {
        embed.fields.push({ name: t('reporter_email', lang), value: report.reporterEmail, inline: false });
    }

    // Add console logs field if present
    if (report.consoleLogs && report.consoleLogs.length > 0) {
        const logsText = report.consoleLogs
            .slice(-10)
            .map((l) => `[${(l.level || 'log').toUpperCase()}] ${(l.message || String(l)).slice(0, 100)}`)
            .join('\n');
        embed.fields.push({
            name: t('console_logs', lang, { COUNT: Math.min(report.consoleLogs.length, 10) }),
            value: '```\n' + logsText.slice(0, 1000) + '\n```',
            inline: false,
        });
    }

    // Add screenshot as embed image
    if (report.screenshotUrl) {
        embed.image = { url: report.screenshotUrl };
    }

    const url = `https://discord.com/api/v10/channels/${channelId}/messages`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bot ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ embeds: [embed] }),
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Discord send failed (${resp.status}): ${errText}`);
    }
}

// ────────────────────────────────────────────
// Telegram Integration
// ────────────────────────────────────────────

async function sendToTelegram(report, client, env, lang = 'en') {
    const token = client.tg_bot_token || env.SYSTEM_TG_BOT_TOKEN;
    const meta = report.metadata;

    let caption = [
        `*${t('new_bug_report', lang)}*`,
        '',
        `*${t('comment', lang)}* ${escapeMarkdown(report.comment)}`,
        '',
        `*${t('url', lang)}:* ${escapeMarkdown(meta.url || 'N/A')}`,
        `*${t('browser', lang)}:* ${escapeMarkdown(meta.browser || 'N/A')}`,
        `*${t('os', lang)}:* ${escapeMarkdown(meta.os || 'N/A')}`,
        `*${t('screen', lang)}:* ${escapeMarkdown(meta.screenSize || 'N/A')}`,
        `*${t('time', lang)}:* ${report.receivedAt}`,
        `*${t('severity', lang)}:* ${SEVERITY_EMOJIS[report.severity]} ${report.severity.toUpperCase()}`
    ];

    if (report.reporterEmail) {
        caption.push(`*${t('reporter_email', lang)}:* ${escapeMarkdown(report.reporterEmail)}`);
    }

    let captionText = caption.join('\n');

    // Append console logs section if present
    if (report.consoleLogs && report.consoleLogs.length > 0) {
        const logsSection = report.consoleLogs
            .slice(-15) // last 15 entries for TG readability
            .map(l => `\`[${l.level.toUpperCase()}]\` ${escapeMarkdown(l.message.slice(0, 120))}`)
            .join('\n');
        const count = Math.min(report.consoleLogs.length, 15);
        const sectionTitle = t('console_logs', lang, { COUNT: count });
        const section = `\n\n*${sectionTitle}:*\n${logsSection}`;
        // TG caption max is 1024 for photos, 4096 for messages
        captionText += section;
    }

    if (report.screenshotUrl) {
        const url = `https://api.telegram.org/bot${token}/sendPhoto`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: client.tg_chat_id,
                photo: report.screenshotUrl,
                caption: captionText.slice(0, 1024),
                parse_mode: 'Markdown',
            }),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Telegram sendPhoto failed: ${errText}`);
        }
    } else {
        const url = `https://api.telegram.org/bot${token}/sendMessage`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: client.tg_chat_id,
                text: captionText,
                parse_mode: 'Markdown',
            }),
        });

        if (!resp.ok) {
            const errText = await resp.text();
            throw new Error(`Telegram sendMessage failed: ${errText}`);
        }
    }
}

function escapeMarkdown(text) {
    if (!text) return '';
    // Telegram Markdown v1 only treats _ * ` [ as special
    return text.replace(/([_*`\[])/g, '\\$1');
}

// ────────────────────────────────────────────
// Notion Integration
// ────────────────────────────────────────────

async function sendToNotion(report, client, token, lang = 'en') {
    const meta = report.metadata;

    const properties = {
        Name: {
            title: [
                {
                    text: {
                        content: `Bug: ${report.comment.slice(0, 80)}`,
                    },
                },
            ],
        },
        Comment: {
            rich_text: [
                {
                    text: {
                        content: report.comment.slice(0, 2000),
                    },
                },
            ],
        },
        URL: {
            url: meta.url || null,
        },
        Browser: {
            rich_text: [
                {
                    text: { content: meta.browser || 'N/A' },
                },
            ],
        },
        OS: {
            rich_text: [
                {
                    text: { content: meta.os || 'N/A' },
                },
            ],
        },
        Screen: {
            rich_text: [
                {
                    text: { content: meta.screenSize || 'N/A' },
                },
            ],
        },
        [t('status', 'en')]: {
            select: { name: t('status_new', 'en') }, // Values here often must match the Notion DB English properties
        },
        [t('attachments', 'en')]: {
            files: report.screenshotUrl ? [
                {
                    name: t('screenshot', lang),
                    external: { url: report.screenshotUrl }
                }
            ] : []
        }
    };

    // Severity is usually mapped to a Select property in Notion if it exists.
    // We add a text representation in the page body as well to ensure it's visible.

    // Email property
    if (report.reporterEmail) {
        properties['Reporter Email'] = {
            email: report.reporterEmail
        };
    }

    // Format console logs
    const logsText = report.consoleLogs && report.consoleLogs.length > 0
        ? report.consoleLogs.map(l => `[${l.level || 'log'}] ${l.message || l}`).join('\n')
        : '';

    if (logsText) {
        properties['Console Logs'] = {
            rich_text: [{ text: { content: logsText.slice(0, 2000) } }]
        };
    }

    const children = [];

    if (report.screenshotUrl) {
        children.push({
            object: 'block',
            type: 'image',
            image: {
                type: 'external',
                external: {
                    url: report.screenshotUrl,
                },
            },
        });
    }

    children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
            rich_text: [
                {
                    text: { content: `${t('severity', lang)}: ${SEVERITY_EMOJIS[report.severity]} ${report.severity.toUpperCase()}` },
                },
            ],
        },
    });

    children.push({
        object: 'block',
        type: 'paragraph',
        paragraph: {
            rich_text: [
                {
                    text: { content: report.comment },
                },
            ],
        },
    });

    // Add console logs as code block
    if (logsText) {
        children.push({
            object: 'block',
            type: 'heading_3',
            heading_3: {
                rich_text: [{ text: { content: t('console', lang) } }]
            }
        });
        // Split into chunks of 2000 chars (Notion block limit)
        const chunks = [];
        for (let i = 0; i < logsText.length; i += 2000) {
            chunks.push(logsText.slice(i, i + 2000));
        }
        for (const chunk of chunks) {
            children.push({
                object: 'block',
                type: 'code',
                code: {
                    rich_text: [{ text: { content: chunk } }],
                    language: 'plain text'
                }
            });
        }
    }

    const resp = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
            parent: { database_id: client.notion_db_id },
            properties,
            children,
        }),
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Notion create page failed: ${errText}`);
    }

    const data = await resp.json();
    return data.id;
}

// ────────────────────────────────────────────
// Slack Integration
// ────────────────────────────────────────────

async function sendToSlack(report, client, lang = 'en') {
    const webhookUrl = client.slack_webhook_url;
    const meta = report.metadata || {};

    const blocks = [
        {
            type: 'header',
            text: { type: 'plain_text', text: t('new_bug_report', lang), emoji: true },
        },
        {
            type: 'section',
            text: { type: 'mrkdwn', text: `*${t('comment', lang)}*\n${report.comment}` },
        },
        {
            type: 'section',
            fields: [
                { type: 'mrkdwn', text: `*${t('url', lang)}:*\n${meta.url || 'N/A'}` },
                { type: 'mrkdwn', text: `*${t('browser', lang)}:*\n${meta.browser || 'N/A'}` },
                { type: 'mrkdwn', text: `*${t('os', lang)}:*\n${meta.os || 'N/A'}` },
                { type: 'mrkdwn', text: `*${t('screen', lang)}:*\n${meta.screenSize || 'N/A'}` },
                { type: 'mrkdwn', text: `*${t('severity', lang)}:*\n${SEVERITY_EMOJIS[report.severity]} ${report.severity.toUpperCase()}` },
            ],
        },
    ];

    if (report.reporterEmail) {
        blocks[2].fields.push({ type: 'mrkdwn', text: `*${t('reporter_email', lang)}:*\n${report.reporterEmail}` });
    }

    // Add console logs if present
    if (report.consoleLogs && report.consoleLogs.length > 0) {
        const logsText = report.consoleLogs
            .slice(-10)
            .map((l) => `[${(l.level || 'log').toUpperCase()}] ${(l.message || String(l)).slice(0, 100)}`)
            .join('\n');

        const count = Math.min(report.consoleLogs.length, 10);
        const consoleLabel = t('console_logs', lang, { COUNT: count });

        blocks.push({
            type: 'section',
            text: {
                type: 'mrkdwn',
                text: `*${consoleLabel}:*\n\`\`\`${logsText.slice(0, 2900)}\`\`\``,
            },
        });
    }

    // Add screenshot if present
    if (report.screenshotUrl) {
        blocks.push({
            type: 'image',
            image_url: report.screenshotUrl,
            alt_text: 'Bug report screenshot',
        });
    }

    blocks.push({
        type: 'context',
        elements: [
            { type: 'mrkdwn', text: `${t('footer_text', lang)} • ${report.receivedAt}` },
        ],
    });

    const resp = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blocks }),
    });

    if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Slack send failed (${resp.status}): ${errText}`);
    }
}

// ────────────────────────────────────────────
// Slack OAuth: Start Authorization
// ────────────────────────────────────────────

async function handleSlackAuth(request, env, url) {
    const clientId = url.searchParams.get('clientId');
    if (!clientId) {
        return jsonResponse({ error: 'clientId query parameter is required' }, 400, request);
    }

    const slackAuthUrl = new URL('https://slack.com/oauth/v2/authorize');
    slackAuthUrl.searchParams.set('client_id', env.SLACK_CLIENT_ID);
    slackAuthUrl.searchParams.set('scope', 'incoming-webhook');
    slackAuthUrl.searchParams.set('redirect_uri', env.SLACK_REDIRECT_URI);
    slackAuthUrl.searchParams.set('state', clientId);

    return Response.redirect(slackAuthUrl.toString(), 302);
}

// ────────────────────────────────────────────
// Slack OAuth: Callback (exchange code → token + webhook)
// ────────────────────────────────────────────

async function handleSlackCallback(request, env, url) {
    const code = url.searchParams.get('code');
    const clientId = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const dashboardUrl = env.DASHBOARD_URL || 'http://localhost:5173';

    if (error) {
        return Response.redirect(`${dashboardUrl}/dashboard/integrations/slack?status=error&reason=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !clientId) {
        return Response.redirect(`${dashboardUrl}/dashboard/integrations/slack?status=error&reason=missing_params`, 302);
    }

    try {
        // 1. Exchange authorization code for access token
        const tokenResp = await fetch('https://slack.com/api/oauth.v2.access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: env.SLACK_CLIENT_ID,
                client_secret: env.SLACK_CLIENT_SECRET,
                code,
                redirect_uri: env.SLACK_REDIRECT_URI,
            }),
        });

        if (!tokenResp.ok) {
            console.error('Slack token exchange HTTP error:', tokenResp.status);
            return Response.redirect(`${dashboardUrl}/dashboard/integrations/slack?status=error&reason=token_exchange_failed`, 302);
        }

        const tokenData = await tokenResp.json();
        if (!tokenData.ok) {
            console.error('Slack token exchange failed:', tokenData.error);
            return Response.redirect(`${dashboardUrl}/dashboard/integrations/slack?status=error&reason=${encodeURIComponent(tokenData.error || 'token_exchange_failed')}`, 302);
        }

        const accessToken = tokenData.access_token || '';
        const teamName = tokenData.team?.name || 'Slack Workspace';
        const webhookUrl = tokenData.incoming_webhook?.url || '';
        const channelName = tokenData.incoming_webhook?.channel || '';

        if (!webhookUrl) {
            console.error('Slack OAuth: no incoming webhook URL returned');
            return Response.redirect(`${dashboardUrl}/dashboard/integrations/slack?status=error&reason=no_webhook`, 302);
        }

        // 2. Save tokens to Supabase
        const updateUrl = `${env.SUPABASE_URL}/rest/v1/clients?id=eq.${encodeURIComponent(clientId)}`;
        const updateResp = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                apikey: env.SUPABASE_KEY,
                Authorization: `Bearer ${env.SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({
                slack_access_token: accessToken,
                slack_webhook_url: webhookUrl,
                slack_channel_name: channelName,
                slack_team_name: teamName,
                updated_at: new Date().toISOString(),
            }),
        });

        if (!updateResp.ok) {
            console.error('Supabase update failed:', await updateResp.text());
            return Response.redirect(`${dashboardUrl}/dashboard/integrations/slack?status=error&reason=save_failed`, 302);
        }

        return Response.redirect(`${dashboardUrl}/dashboard/integrations/slack?status=success`, 302);
    } catch (err) {
        console.error('handleSlackCallback error:', err);
        return Response.redirect(`${dashboardUrl}/dashboard/integrations/slack?status=error&reason=${encodeURIComponent(err.message)}`, 302);
    }
}

// ────────────────────────────────────────────
// Slack OAuth: Disconnect
// ────────────────────────────────────────────

async function handleSlackDisconnect(request, env) {
    try {
        const body = await request.json();
        const { apiKey } = body;

        if (!apiKey) {
            return jsonResponse({ error: 'apiKey is required' }, 400, request);
        }

        const client = await getClientByApiKey(apiKey, env);
        if (!client) {
            return jsonResponse({ error: 'Invalid API key' }, 401, request);
        }

        const updateUrl = `${env.SUPABASE_URL}/rest/v1/clients?id=eq.${encodeURIComponent(client.id)}`;
        await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                apikey: env.SUPABASE_KEY,
                Authorization: `Bearer ${env.SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({
                slack_access_token: null,
                slack_webhook_url: null,
                slack_channel_name: null,
                slack_team_name: null,
                updated_at: new Date().toISOString(),
            }),
        });

        return jsonResponse({ success: true, message: 'Slack disconnected' }, 200, request);
    } catch (err) {
        console.error('handleSlackDisconnect error:', err);
        return jsonResponse({ error: 'Internal Server Error', details: err.message }, 500, request);
    }
}

// ────────────────────────────────────────────
// Notion OAuth: Start Authorization
// ────────────────────────────────────────────

async function handleNotionAuth(request, env, url) {
    const clientId = url.searchParams.get('clientId');
    if (!clientId) {
        return jsonResponse({ error: 'clientId query parameter is required' }, 400, request);
    }

    const notionAuthUrl = new URL('https://api.notion.com/v1/oauth/authorize');
    notionAuthUrl.searchParams.set('client_id', env.NOTION_CLIENT_ID);
    notionAuthUrl.searchParams.set('response_type', 'code');
    notionAuthUrl.searchParams.set('owner', 'user');
    notionAuthUrl.searchParams.set('redirect_uri', env.NOTION_REDIRECT_URI);
    notionAuthUrl.searchParams.set('state', clientId);

    return Response.redirect(notionAuthUrl.toString(), 302);
}

// ────────────────────────────────────────────
// Notion OAuth: Callback (exchange code → token → create DB)
// ────────────────────────────────────────────

async function handleNotionCallback(request, env, url) {
    const code = url.searchParams.get('code');
    const clientId = url.searchParams.get('state');
    const error = url.searchParams.get('error');
    const dashboardUrl = env.DASHBOARD_URL || 'http://localhost:5173';

    if (error) {
        return Response.redirect(`${dashboardUrl}/dashboard/integrations/notion?status=error&reason=${encodeURIComponent(error)}`, 302);
    }

    if (!code || !clientId) {
        return Response.redirect(`${dashboardUrl}/dashboard/integrations/notion?status=error&reason=missing_params`, 302);
    }

    try {
        // 1. Exchange authorization code for access token
        const tokenResp = await fetch('https://api.notion.com/v1/oauth/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Basic ${btoa(`${env.NOTION_CLIENT_ID}:${env.NOTION_CLIENT_SECRET}`)}`,
            },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                code,
                redirect_uri: env.NOTION_REDIRECT_URI,
            }),
        });

        if (!tokenResp.ok) {
            const errText = await tokenResp.text();
            console.error('Notion token exchange failed:', errText);
            return Response.redirect(`${dashboardUrl}/dashboard/integrations/notion?status=error&reason=token_exchange_failed`, 302);
        }

        const tokenData = await tokenResp.json();
        const accessToken = tokenData.access_token;
        const workspaceName = tokenData.workspace_name || 'Notion Workspace';
        const botId = tokenData.bot_id || '';

        // 2. Find an accessible page to create the database in
        const searchResp = await fetch('https://api.notion.com/v1/search', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28',
            },
            body: JSON.stringify({
                filter: { value: 'page', property: 'object' },
                page_size: 1,
            }),
        });

        if (!searchResp.ok) {
            console.error('Notion search failed:', await searchResp.text());
            return Response.redirect(`${dashboardUrl}/dashboard/integrations/notion?status=error&reason=no_pages_found`, 302);
        }

        const searchData = await searchResp.json();
        if (!searchData.results || searchData.results.length === 0) {
            return Response.redirect(`${dashboardUrl}/dashboard/integrations/notion?status=error&reason=no_pages_shared`, 302);
        }

        const parentPageId = searchData.results[0].id;

        // 3. Create "Errora Bug Reports" database
        const dbResp = await fetch('https://api.notion.com/v1/databases', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28',
            },
            body: JSON.stringify({
                parent: { type: 'page_id', page_id: parentPageId },
                title: [
                    { type: 'text', text: { content: '🐞 Errora Bug Reports' } },
                ],
                properties: {
                    Name: { title: {} },
                    Status: {
                        select: {
                            options: [
                                { name: 'New', color: 'red' },
                                { name: 'In Progress', color: 'yellow' },
                                { name: 'Done', color: 'green' },
                            ],
                        },
                    },
                    Comment: { rich_text: {} },
                    URL: { url: {} },
                    Browser: { rich_text: {} },
                    OS: { rich_text: {} },
                    Screen: { rich_text: {} },
                    'Console Logs': { rich_text: {} },
                    Attachments: { files: {} }
                },
            }),
        });

        if (!dbResp.ok) {
            console.error('Notion DB creation failed:', await dbResp.text());
            return Response.redirect(`${dashboardUrl}/dashboard/integrations/notion?status=error&reason=db_creation_failed`, 302);
        }

        const dbData = await dbResp.json();
        const notionDbId = dbData.id;
        const notionDbUrl = dbData.url || '';

        // 4. Save tokens to Supabase
        const updateUrl = `${env.SUPABASE_URL}/rest/v1/clients?id=eq.${encodeURIComponent(clientId)}`;
        const updateResp = await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                apikey: env.SUPABASE_KEY,
                Authorization: `Bearer ${env.SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({
                notion_access_token: accessToken,
                notion_db_id: notionDbId,
                notion_workspace_name: workspaceName,
                notion_bot_id: botId,
                notion_db_url: notionDbUrl,
                updated_at: new Date().toISOString(),
            }),
        });

        if (!updateResp.ok) {
            console.error('Supabase update failed:', await updateResp.text());
            return Response.redirect(`${dashboardUrl}/dashboard/integrations/notion?status=error&reason=save_failed`, 302);
        }

        return Response.redirect(`${dashboardUrl}/dashboard/integrations/notion?status=success`, 302);
    } catch (err) {
        console.error('handleNotionCallback error:', err);
        return Response.redirect(`${dashboardUrl}/dashboard/integrations/notion?status=error&reason=${encodeURIComponent(err.message)}`, 302);
    }
}

// ────────────────────────────────────────────
// Notion OAuth: Disconnect
// ────────────────────────────────────────────

async function handleNotionDisconnect(request, env) {
    try {
        const body = await request.json();
        const { apiKey } = body;

        if (!apiKey) {
            return jsonResponse({ error: 'apiKey is required' }, 400, request);
        }

        const client = await getClientByApiKey(apiKey, env);
        if (!client) {
            return jsonResponse({ error: 'Invalid API key' }, 401, request);
        }

        const updateUrl = `${env.SUPABASE_URL}/rest/v1/clients?id=eq.${encodeURIComponent(client.id)}`;
        await fetch(updateUrl, {
            method: 'PATCH',
            headers: {
                apikey: env.SUPABASE_KEY,
                Authorization: `Bearer ${env.SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                Prefer: 'return=minimal',
            },
            body: JSON.stringify({
                notion_access_token: null,
                notion_db_id: null,
                notion_workspace_name: null,
                notion_bot_id: null,
                notion_db_url: null,
                notion_key: null,
                updated_at: new Date().toISOString(),
            }),
        });

        return jsonResponse({ success: true, message: 'Notion disconnected' }, 200, request);
    } catch (err) {
        console.error('handleNotionDisconnect error:', err);
        return jsonResponse({ error: 'Internal Server Error', details: err.message }, 500, request);
    }
}

// ────────────────────────────────────────────
// CORS Helpers
// ────────────────────────────────────────────

function handleCORS(request, env) {
    const origin = request.headers.get('Origin') || '*';
    const allowedOrigins = env.ALLOWED_ORIGINS
        ? env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
        : ['*'];

    const isAllowed =
        allowedOrigins.includes('*') || allowedOrigins.includes(origin);

    return new Response(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': isAllowed ? origin : '',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '86400',
        },
    });
}

function jsonResponse(data, status = 200, request = null) {
    const headers = {
        'Content-Type': 'application/json',
    };

    if (request) {
        const origin = request.headers.get('Origin') || '*';
        headers['Access-Control-Allow-Origin'] = origin;
    } else {
        headers['Access-Control-Allow-Origin'] = '*';
    }

    return new Response(JSON.stringify(data), { status, headers });
}

// ────────────────────────────────────────────
// CRON Polling: Check Notion statuses & Send Emails
// ────────────────────────────────────────────

async function processNotionPolling(env) {
    if (!env.RESEND_API_KEY) {
        console.error('RESEND_API_KEY is not configured.');
        return;
    }

    try {
        // 1. Fetch reports that are open, have a Notion ID, and a reporter email
        const reportsUrl = `${env.SUPABASE_URL}/rest/v1/reports?status=eq.open&notified_at=is.null&notion_page_id=not.is.null&reporter_email=not.is.null&select=id,client_id,reporter_email,notion_page_id,comment`;
        const reportsResp = await fetch(reportsUrl, {
            headers: {
                apikey: env.SUPABASE_KEY,
                Authorization: `Bearer ${env.SUPABASE_KEY}`,
            }
        });

        if (!reportsResp.ok) throw new Error(`Fetch reports failed: ${await reportsResp.text()}`);
        const reports = await reportsResp.json();

        if (reports.length === 0) return;

        // Group reports by client to batch fetch client configs
        const clientIds = [...new Set(reports.map(r => r.client_id))];
        const clientsUrl = `${env.SUPABASE_URL}/rest/v1/clients?id=in.(${clientIds.join(',')})&select=id,notion_access_token,notion_key,notion_done_status,language`;
        const clientsResp = await fetch(clientsUrl, {
            headers: {
                apikey: env.SUPABASE_KEY,
                Authorization: `Bearer ${env.SUPABASE_KEY}`,
            }
        });

        if (!clientsResp.ok) throw new Error(`Fetch clients failed: ${await clientsResp.text()}`);
        const clientsData = await clientsResp.json();
        const clientsMap = {};
        for (const c of clientsData) clientsMap[c.id] = c;

        // 3. Process each report
        for (const report of reports) {
            const client = clientsMap[report.client_id];
            if (!client) continue;

            const notionToken = client.notion_access_token || client.notion_key;
            if (!notionToken) continue;

            try {
                // Fetch Notion page
                const notionResp = await fetch(`https://api.notion.com/v1/pages/${report.notion_page_id}`, {
                    headers: {
                        Authorization: `Bearer ${notionToken}`,
                        'Notion-Version': '2022-06-28',
                    }
                });

                if (!notionResp.ok) {
                    if (notionResp.status === 404) {
                        console.warn(`Notion page ${report.notion_page_id} not found.`);
                    }
                    continue;
                }

                const page = await notionResp.json();
                const doneStatus = client.notion_done_status || 'Done';

                // Find status property
                let isDone = false;
                if (page.properties) {
                    for (const prop of Object.values(page.properties)) {
                        if (prop.type === 'status' && prop.status?.name === doneStatus) {
                            isDone = true;
                            break;
                        }
                        if (prop.type === 'select' && prop.select?.name === doneStatus) {
                            isDone = true;
                            break;
                        }
                    }
                }

                if (isDone) {
                    // Send Email via Resend
                    const lang = client.language || 'en';
                    const subject = lang === 'ru'
                        ? 'Отличные новости! Ваш баг-репорт решён 🎉'
                        : 'Good news! Your bug report has been resolved 🎉';

                    const bodyHtml = lang === 'ru'
                        ? `<p>Здравствуйте!</p><p>Хотим сообщить, что баг, о котором вы сообщили:</p><blockquote>"${report.comment}"</blockquote><p>был успешно исправлен!</p><p>Спасибо, что помогаете нам становиться лучше!</p>`
                        : `<p>Hello!</p><p>We wanted to let you know that the bug you reported:</p><blockquote>"${report.comment}"</blockquote><p>has been successfully resolved!</p><p>Thank you for helping us improve!</p>`;

                    const resendResp = await fetch('https://api.resend.com/emails', {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${env.RESEND_API_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            from: env.RESEND_FROM_EMAIL || 'Errora Bug Tracker <noreply@errora.io>',
                            to: report.reporter_email,
                            subject: subject,
                            html: bodyHtml
                        })
                    });

                    if (!resendResp.ok) {
                        console.error('Failed to send email:', await resendResp.text());
                        continue;
                    }

                    // Update report status in DB
                    await fetch(`${env.SUPABASE_URL}/rest/v1/reports?id=eq.${report.id}`, {
                        method: 'PATCH',
                        headers: {
                            apikey: env.SUPABASE_KEY,
                            Authorization: `Bearer ${env.SUPABASE_KEY}`,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            status: 'closed',
                            notified_at: new Date().toISOString()
                        })
                    });
                }
            } catch (err) {
                console.error(`Error processing report ${report.id}:`, err);
            }
        }
    } catch (err) {
        console.error('Polling error:', err);
    }
}
