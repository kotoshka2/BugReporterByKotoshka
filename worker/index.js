/**
 * Errora — Cloudflare Worker API Gateway
 *
 * Multi-tenant SaaS Architecture:
 * 1. Validates the API key against the `clients` table in Supabase
 * 2. Uploads screenshot to Supabase Storage
 * 3. Sends notification to the CLIENT's Telegram and/or Notion
 * 4. Logs the report in the `reports` table
 *
 * Environment Variables (set via wrangler.toml or `wrangler secret put`):
 *   SUPABASE_URL        — https://xxx.supabase.co
 *   SUPABASE_KEY        — service_role key (bypasses RLS)
 *   ALLOWED_ORIGINS     — Comma-separated list of allowed origins (optional, * for any)
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
        const tasks = [];

        if (client.tg_chat_id && (client.tg_bot_token || env.SYSTEM_TG_BOT_TOKEN)) {
            tasks.push(sendToTelegram(report, client, env));
        }

        if (client.notion_key && client.notion_db_id) {
            tasks.push(sendToNotion(report, client));
        }

        const results = await Promise.allSettled(tasks);

        const tgSent = results[0]?.status === 'fulfilled';
        const notionSent = client.notion_key
            ? results[tasks.length - 1]?.status === 'fulfilled'
            : false;

        // Check for errors
        const errors = results
            .filter((r) => r.status === 'rejected')
            .map((r) => r.reason?.message || 'Unknown error');

        if (errors.length > 0) {
            console.error('Integration errors:', errors);
        }

        // ── Log the report ──
        await logReport(client.id, report, screenshotUrl, tgSent, notionSent, env);

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

async function logReport(clientId, report, screenshotUrl, tgSent, notionSent, env) {
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
    return text.replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

// ────────────────────────────────────────────
// Notion Integration
// ────────────────────────────────────────────

async function sendToNotion(report, client) {
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
    };

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

    const resp = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${client.notion_key}`,
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
