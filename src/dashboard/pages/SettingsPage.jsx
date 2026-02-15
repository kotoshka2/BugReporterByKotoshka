import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

// ── SHA-256 helper ──
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function SettingsPage({ client, onUpdate }) {
    const [botMode, setBotMode] = useState(client?.tg_bot_token ? 'custom' : 'system');
    const [tgBotToken, setTgBotToken] = useState(client?.tg_bot_token || '');
    const [tgChatId, setTgChatId] = useState(client?.tg_chat_id || '');
    const [notionKey, setNotionKey] = useState(client?.notion_key || '');
    const [notionDbId, setNotionDbId] = useState(client?.notion_db_id || '');
    const [allowedDomains, setAllowedDomains] = useState(
        (client?.allowed_domains || []).join(', ')
    );
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [copied, setCopied] = useState(false);

    // ── Widget Visibility ──
    const [widgetMode, setWidgetMode] = useState(client?.widget_mode || 'public');
    const [secretPassword, setSecretPassword] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        // Parse domains: "example.com, app.example.com" → ["example.com", "app.example.com"]
        const domainsArray = allowedDomains
            .split(',')
            .map((d) => d.trim())
            .filter(Boolean);

        // Build update payload
        const updateData = {
            tg_bot_token: botMode === 'custom' ? (tgBotToken || null) : null,
            tg_chat_id: tgChatId || null,
            notion_key: notionKey || null,
            notion_db_id: notionDbId || null,
            allowed_domains: domainsArray.length > 0 ? domainsArray : null,
            widget_mode: widgetMode,
            updated_at: new Date().toISOString(),
        };

        // If a new password was entered, hash it
        if (secretPassword.trim()) {
            updateData.widget_secret_hash = await sha256(secretPassword.trim());
        }

        const { error } = await supabase
            .from('clients')
            .update(updateData)
            .eq('id', client.id);

        if (error) {
            setMessage('Ошибка сохранения: ' + error.message);
        } else {
            setMessage('Настройки сохранены! ✅');
            setSecretPassword(''); // Clear password field after save
            onUpdate();
        }
        setSaving(false);
    };

    const copySnippet = () => {
        const snippet = `<script>
  window.BugWidgetConfig = {
    apiKey: '${client?.api_key || 'YOUR_API_KEY'}'
  };
</script>
<script src="https://today-is-friday.tech/bug-reporter/widget.js" defer></script>`;
        navigator.clipboard.writeText(snippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="page">
            <h1 className="page__title">⚙️ Настройки</h1>

            {/* API Key Section */}
            <div className="card">
                <h2 className="card__title">Ваш API Key</h2>
                <p className="card__desc">Используйте этот ключ для установки виджета на ваш сайт.</p>
                <div className="api-key-box">
                    <code>{client?.api_key || '—'}</code>
                    <button onClick={copySnippet} className="btn btn--sm btn--outline">
                        {copied ? '✅ Скопировано' : '📋 Копировать сниппет'}
                    </button>
                </div>
            </div>

            {/* Domain Protection */}
            <div className="card">
                <h2 className="card__title">🔒 Разрешённые домены</h2>
                <p className="card__desc">
                    Укажите домены, с которых разрешено отправлять баг-репорты.
                    Если оставить пустым — запросы принимаются с любого сайта.
                </p>
                <div className="form-group">
                    <label htmlFor="allowed-domains">Домены (через запятую)</label>
                    <input
                        id="allowed-domains"
                        type="text"
                        value={allowedDomains}
                        onChange={(e) => setAllowedDomains(e.target.value)}
                        placeholder="example.com, app.example.com"
                    />
                </div>
            </div>

            {/* Widget Visibility */}
            <div className="card">
                <h2 className="card__title">👁️ Видимость виджета</h2>
                <p className="card__desc">
                    Выберите, кто может видеть виджет баг-репортов на вашем сайте.
                </p>

                <div className="bot-mode-toggle">
                    <label
                        className={`bot-mode-option ${widgetMode === 'public' ? 'bot-mode-option--active' : ''}`}
                        onClick={() => setWidgetMode('public')}
                    >
                        <input
                            type="radio"
                            name="widgetMode"
                            value="public"
                            checked={widgetMode === 'public'}
                            onChange={() => setWidgetMode('public')}
                        />
                        <div>
                            <strong>🌍 Публичный</strong>
                            <span>Виджет видят все посетители сайта</span>
                        </div>
                    </label>
                    <label
                        className={`bot-mode-option ${widgetMode === 'restricted' ? 'bot-mode-option--active' : ''}`}
                        onClick={() => setWidgetMode('restricted')}
                    >
                        <input
                            type="radio"
                            name="widgetMode"
                            value="restricted"
                            checked={widgetMode === 'restricted'}
                            onChange={() => setWidgetMode('restricted')}
                        />
                        <div>
                            <strong>🔐 Ограниченный</strong>
                            <span>Только по Magic Link с паролем</span>
                        </div>
                    </label>
                </div>

                {widgetMode === 'restricted' && (
                    <>
                        <div className="form-group" style={{ marginTop: '16px' }}>
                            <label htmlFor="secret-password">Пароль доступа</label>
                            <input
                                id="secret-password"
                                type="text"
                                value={secretPassword}
                                onChange={(e) => setSecretPassword(e.target.value)}
                                placeholder={client?.widget_secret_hash ? 'Введите новый пароль для смены…' : 'Введите пароль…'}
                            />
                            {client?.widget_secret_hash && !secretPassword && (
                                <small style={{ color: 'var(--color-text-muted, #94a3b8)', marginTop: '4px', display: 'block' }}>
                                    Пароль уже установлен. Оставьте пустым, чтобы не менять.
                                </small>
                            )}
                        </div>

                        {secretPassword && (
                            <div className="bot-instructions" style={{ marginTop: '12px' }}>
                                <p><strong>🔗 Magic Link для тестировщиков:</strong></p>
                                <div className="api-key-box" style={{ marginTop: '8px' }}>
                                    <code style={{ wordBreak: 'break-all', fontSize: '0.85em' }}>
                                        ?brw_secret={secretPassword}
                                    </code>
                                    <button
                                        type="button"
                                        className="btn btn--sm btn--outline"
                                        onClick={() => {
                                            navigator.clipboard.writeText(`?brw_secret=${secretPassword}`);
                                            setLinkCopied(true);
                                            setTimeout(() => setLinkCopied(false), 2000);
                                        }}
                                    >
                                        {linkCopied ? '✅ Скопировано' : '📋 Копировать'}
                                    </button>
                                </div>
                                <small style={{ color: 'var(--color-text-muted, #94a3b8)', marginTop: '8px', display: 'block' }}>
                                    Добавьте этот параметр к URL вашего сайта и отправьте тестировщику.
                                    Не забудьте сохранить настройки!
                                </small>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Integrations */}
            <form onSubmit={handleSave}>
                <div className="card">
                    <h2 className="card__title">📱 Telegram</h2>
                    <p className="card__desc">Получайте баг-репорты прямо в чат Telegram.</p>

                    {/* Bot Mode Toggle */}
                    <div className="bot-mode-toggle">
                        <label
                            className={`bot-mode-option ${botMode === 'system' ? 'bot-mode-option--active' : ''}`}
                            onClick={() => setBotMode('system')}
                        >
                            <input
                                type="radio"
                                name="botMode"
                                value="system"
                                checked={botMode === 'system'}
                                onChange={() => setBotMode('system')}
                            />
                            <div>
                                <strong>🤖 Системный бот</strong>
                                <span>Быстрый старт — нужен только Chat ID</span>
                            </div>
                        </label>
                        <label
                            className={`bot-mode-option ${botMode === 'custom' ? 'bot-mode-option--active' : ''}`}
                            onClick={() => setBotMode('custom')}
                        >
                            <input
                                type="radio"
                                name="botMode"
                                value="custom"
                                checked={botMode === 'custom'}
                                onChange={() => setBotMode('custom')}
                            />
                            <div>
                                <strong>🔧 Свой бот</strong>
                                <span>Полный контроль — укажите свой токен</span>
                            </div>
                        </label>
                    </div>

                    {/* System bot instructions */}
                    {botMode === 'system' && (
                        <div className="bot-instructions">
                            <p>1. Начните диалог или добавьте в беседу нашего бота: <a href="https://t.me/BugReporterbykotoshka" target="_blank" rel="noopener">@bug_reporter_by_kotoshka_bot</a></p>
                            <p>2. Отправьте команду <code>/chatid</code></p>
                            <p>3. Скопируйте Chat ID и вставьте ниже</p>
                        </div>
                    )}

                    {/* Custom bot instructions */}
                    {botMode === 'custom' && (
                        <div className="bot-instructions">
                            <p>1. Создайте бота через <a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a></p>
                            <p>2. Скопируйте токен и вставьте ниже</p>
                            <p>3. Добавьте бота в чат/группу и укажите Chat ID</p>
                        </div>
                    )}

                    <div className="form-row">
                        {botMode === 'custom' && (
                            <div className="form-group">
                                <label htmlFor="tg-token">Bot Token</label>
                                <input
                                    id="tg-token"
                                    type="text"
                                    value={tgBotToken}
                                    onChange={(e) => setTgBotToken(e.target.value)}
                                    placeholder="123456:ABC-DEF..."
                                />
                            </div>
                        )}
                        <div className="form-group">
                            <label htmlFor="tg-chat">Chat ID</label>
                            <input
                                id="tg-chat"
                                type="text"
                                value={tgChatId}
                                onChange={(e) => setTgChatId(e.target.value)}
                                placeholder="-1001234567890"
                            />
                        </div>
                    </div>
                </div>

                <div className="card">
                    <h2 className="card__title">📋 Notion W.I.P.</h2>
                    <p className="card__desc">
                        Автоматически создавайте тикеты в Notion.
                        <a href="https://developers.notion.com" target="_blank" rel="noopener"> Создать интеграцию →</a>
                    </p>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="notion-key">Integration Secret</label>
                            <input
                                id="notion-key"
                                type="text"
                                value={notionKey}
                                onChange={(e) => setNotionKey(e.target.value)}
                                placeholder="secret_..."
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="notion-db">Database ID</label>
                            <input
                                id="notion-db"
                                type="text"
                                value={notionDbId}
                                onChange={(e) => setNotionDbId(e.target.value)}
                                placeholder="abc123..."
                            />
                        </div>
                    </div>
                </div>

                {message && (
                    <div className={`alert ${message.includes('Ошибка') ? 'alert--error' : 'alert--success'}`}>
                        {message}
                    </div>
                )}

                <button type="submit" className="btn btn--primary" disabled={saving}>
                    {saving ? 'Сохранение…' : 'Сохранить настройки'}
                </button>
            </form>
        </div>
    );
}
