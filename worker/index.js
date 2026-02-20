/**
 * Errora — Cloudflare Worker API Gateway
 *
 * Multi-tenant SaaS Architecture:
 * 1. Validates the API key against the `clients` table in Supabase
 * 2. Uploads screenshot to Supabase Storage
 * 3. Sends notification to the CLIENT's Telegram, Notion, and/or Discord
 * 4. Logs the report in the `reports` table
 *
 * Environment Variables (set via wrangler.toml or `wrangler secret put`):
 *   SUPABASE_URL          — https://xxx.supabase.co
 *   SUPABASE_KEY          — service_role key (bypasses RLS)
 *   ALLOWED_ORIGINS       — Comma-separated list of allowed origins (optional, * for any)
 *   NOTION_CLIENT_ID      — Notion OAuth public integration client ID
 *   NOTION_CLIENT_SECRET  — Notion OAuth client secret
 *   NOTION_REDIRECT_URI   — OAuth callback URL (this worker's /api/notion/callback)
 *   DASHBOARD_URL         — Dashboard base URL for post-OAuth redirect
 */

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

        // ── Health check ──
        if (url.pathname === '/health') {
            return jsonResponse({ status: 'ok', timestamp: new Date().toISOString() });
        }

        return jsonResponse({ error: 'Not Found' }, 404);
    },
};

// ────────────────────────────────────────────
// Route Handler: /api/report
// ────────────────────────────────────────────

async function handleReport(request, env) {
    try {
        const body = await request.json();
        const { comment, screenshot, metadata, apiKey, consoleLogs } = body;

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
        const report = {
            comment: comment || '(no comment)',
            screenshotUrl,
            metadata: metadata || {},
            consoleLogs: Array.isArray(consoleLogs) ? consoleLogs : [],
            receivedAt: new Date().toISOString(),
        };

        // ── Send to client's integrations (in parallel) ──
        const integrationTasks = {};

        if (client.tg_chat_id && (client.tg_bot_token || env.SYSTEM_TG_BOT_TOKEN)) {
            integrationTasks.telegram = sendToTelegram(report, client, env);
        }

        const notionToken = client.notion_access_token || client.notion_key;
        if (notionToken && client.notion_db_id) {
            integrationTasks.notion = sendToNotion(report, client, notionToken);
        }

        if (client.discord_bot_token && client.discord_channel_id) {
            integrationTasks.discord = sendToDiscord(report, client);
        }

        const keys = Object.keys(integrationTasks);
        const results = await Promise.allSettled(Object.values(integrationTasks));

        const sentStatus = {};
        keys.forEach((key, i) => {
            sentStatus[key] = results[i]?.status === 'fulfilled';
        });

        // Check for errors
        const errors = results
            .filter((r) => r.status === 'rejected')
            .map((r) => r.reason?.message || 'Unknown error');

        if (errors.length > 0) {
            console.error('Integration errors:', errors);
        }

        // ── Log the report ──
        await logReport(client.id, report, screenshotUrl, sentStatus.telegram || false, sentStatus.notion || false, sentStatus.discord || false, env);

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

async function logReport(clientId, report, screenshotUrl, tgSent, notionSent, discordSent, env) {
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

async function sendToDiscord(report, client) {
    const token = client.discord_bot_token;
    const channelId = client.discord_channel_id;
    const meta = report.metadata || {};

    const embed = {
        title: '🐞 Новый баг-репорт',
        color: 0xff4444,
        description: report.comment,
        fields: [
            { name: '🌐 URL', value: meta.url || 'N/A', inline: false },
            { name: '🖥 Браузер', value: meta.browser || 'N/A', inline: true },
            { name: '💻 ОС', value: meta.os || 'N/A', inline: true },
            { name: '📐 Экран', value: meta.screenSize || 'N/A', inline: true },
        ],
        timestamp: report.receivedAt,
        footer: { text: 'Errora Bug Reporter' },
    };

    // Add console logs field if present
    if (report.consoleLogs && report.consoleLogs.length > 0) {
        const logsText = report.consoleLogs
            .slice(-10)
            .map((l) => `[${(l.level || 'log').toUpperCase()}] ${(l.message || String(l)).slice(0, 100)}`)
            .join('\n');
        embed.fields.push({
            name: `📋 Консоль (последние ${Math.min(report.consoleLogs.length, 10)})`,
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

async function sendToTelegram(report, client, env) {
    const token = client.tg_bot_token || env.SYSTEM_TG_BOT_TOKEN;
    const meta = report.metadata;

    let caption = [
        '🐞 *Новый баг-репорт*',
        '',
        `💬 *Комментарий:* ${escapeMarkdown(report.comment)}`,
        '',
        `🌐 *URL:* ${escapeMarkdown(meta.url || 'N/A')}`,
        `🖥 *Браузер:* ${escapeMarkdown(meta.browser || 'N/A')}`,
        `💻 *ОС:* ${escapeMarkdown(meta.os || 'N/A')}`,
        `📐 *Экран:* ${escapeMarkdown(meta.screenSize || 'N/A')}`,
        `🕐 *Время:* ${report.receivedAt}`,
    ].join('\n');

    // Append console logs section if present
    if (report.consoleLogs && report.consoleLogs.length > 0) {
        const logsSection = report.consoleLogs
            .slice(-15) // last 15 entries for TG readability
            .map(l => `\`[${l.level.toUpperCase()}]\` ${escapeMarkdown(l.message.slice(0, 120))}`)
            .join('\n');
        const section = `\n\n📋 *Консоль (последние ${Math.min(report.consoleLogs.length, 15)}):*\n${logsSection}`;
        // TG caption max is 1024 for photos, 4096 for messages
        caption += section;
    }

    if (report.screenshotUrl) {
        const url = `https://api.telegram.org/bot${token}/sendPhoto`;
        const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: client.tg_chat_id,
                photo: report.screenshotUrl,
                caption: caption.slice(0, 1024),
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
                text: caption,
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

async function sendToNotion(report, client, token) {
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
        Status: {
            select: { name: 'New' },
        },
        Attachments: {
            files: report.screenshotUrl ? [
                {
                    name: 'Screenshot',
                    external: { url: report.screenshotUrl }
                }
            ] : []
        }
    };

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
                rich_text: [{ text: { content: '📋 Console Logs' } }]
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
