/**
 * Admin CLI — управление клиентами Bug Report Widget
 *
 * Использование:
 *   node scripts/admin.js add "Client Name" --tg-token=XXX --tg-chat=YYY
 *   node scripts/admin.js add "Client Name" --tg-token=XXX --tg-chat=YYY --mode=restricted --secret-hash=SHA256HEX
 *   node scripts/admin.js add "Client Name" --notion-key=XXX --notion-db=YYY
 *   node scripts/admin.js list
 *
 * Environment:
 *   SUPABASE_URL  — URL проекта Supabase
 *   SUPABASE_KEY  — Service Role Key
 *
 * Можно задать через .env файл или экспортировать:
 *   set SUPABASE_URL=https://xxx.supabase.co
 *   set SUPABASE_KEY=eyJ...
 */

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_KEY environment variables.');
    console.error('   Set them before running this script:');
    console.error('   $env:SUPABASE_URL = "https://xxx.supabase.co"');
    console.error('   $env:SUPABASE_KEY = "eyJ..."');
    process.exit(1);
}

// ── Generate a random API key ──
function generateApiKey() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const prefix = 'brw_';
    let key = prefix;
    for (let i = 0; i < 32; i++) {
        key += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return key;
}

// ── Parse CLI args ──
function parseArgs(args) {
    const result = {};
    for (const arg of args) {
        if (arg.startsWith('--')) {
            const [key, ...valueParts] = arg.slice(2).split('=');
            result[key] = valueParts.join('=') || true;
        }
    }
    return result;
}

// ── Add client ──
async function addClient(name, flags) {
    const apiKey = generateApiKey();

    const clientData = {
        api_key: apiKey,
        name: name,
        tg_bot_token: flags['tg-token'] || null,
        tg_chat_id: flags['tg-chat'] || null,
        notion_key: flags['notion-key'] || null,
        notion_db_id: flags['notion-db'] || null,
        widget_mode: flags['mode'] || 'public',
        widget_secret_hash: flags['secret-hash'] || null,
    };

    const resp = await fetch(`${SUPABASE_URL}/rest/v1/clients`, {
        method: 'POST',
        headers: {
            apikey: SUPABASE_KEY,
            Authorization: `Bearer ${SUPABASE_KEY}`,
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
        },
        body: JSON.stringify(clientData),
    });

    if (!resp.ok) {
        const err = await resp.text();
        console.error(`❌ Failed to create client: ${err}`);
        process.exit(1);
    }

    const [created] = await resp.json();

    console.log('');
    console.log('✅ Клиент создан!');
    console.log('─────────────────────────────────────────');
    console.log(`   Имя:      ${created.name}`);
    console.log(`   API Key:  ${created.api_key}`);
    console.log(`   ID:       ${created.id}`);
    console.log(`   Mode:     ${created.widget_mode}`);
    console.log('');
    console.log('📋 Сниппет для клиента:');
    console.log('');
    console.log(`   <script>`);
    console.log(`     window.BugWidgetConfig = {`);
    console.log(`       apiUrl: 'https://YOUR-WORKER.workers.dev/api/report',`);
    console.log(`       apiKey: '${created.api_key}'`);
    console.log(`     };`);
    console.log(`   </script>`);
    console.log(`   <script src="https://cdn.your-domain.com/widget.iife.js" defer></script>`);
    console.log('');
}

// ── List clients ──
async function listClients() {
    const resp = await fetch(
        `${SUPABASE_URL}/rest/v1/clients?select=id,name,api_key,is_active,created_at&order=created_at.desc`,
        {
            headers: {
                apikey: SUPABASE_KEY,
                Authorization: `Bearer ${SUPABASE_KEY}`,
            },
        }
    );

    if (!resp.ok) {
        const err = await resp.text();
        console.error(`❌ Failed to list clients: ${err}`);
        process.exit(1);
    }

    const clients = await resp.json();

    if (clients.length === 0) {
        console.log('📭 Нет зарегистрированных клиентов.');
        return;
    }

    console.log('');
    console.log(`📋 Клиенты (${clients.length}):`);
    console.log('─────────────────────────────────────────');
    for (const c of clients) {
        const status = c.is_active ? '🟢' : '🔴';
        console.log(`  ${status} ${c.name}`);
        console.log(`     Key: ${c.api_key}`);
        console.log(`     Created: ${c.created_at}`);
        console.log('');
    }
}

// ── Main ──
async function main() {
    const [command, ...rest] = process.argv.slice(2);

    switch (command) {
        case 'add': {
            const name = rest.find((a) => !a.startsWith('--'));
            if (!name) {
                console.error('Usage: node scripts/admin.js add "Client Name" --tg-token=XXX --tg-chat=YYY');
                process.exit(1);
            }
            const flags = parseArgs(rest);
            await addClient(name, flags);
            break;
        }
        case 'list':
            await listClients();
            break;
        default:
            console.log('Bug Report Widget — Admin CLI');
            console.log('');
            console.log('Commands:');
            console.log('  add "Name" --tg-token=X --tg-chat=Y   Add a new client');
            console.log('  list                                    List all clients');
            break;
    }
}

main().catch(console.error);
