import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';

// ── Telegram Settings ──
function TelegramSettings({ client, onUpdate }) {
    const [botMode, setBotMode] = useState(client?.tg_bot_token ? 'custom' : 'system');
    const [tgBotToken, setTgBotToken] = useState(client?.tg_bot_token || '');
    const [tgChatId, setTgChatId] = useState(client?.tg_chat_id || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        const updateData = {
            tg_bot_token: botMode === 'custom' ? (tgBotToken || null) : null,
            tg_chat_id: tgChatId || null,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('clients')
            .update(updateData)
            .eq('id', client.id);

        if (error) {
            setMessage('Ошибка сохранения: ' + error.message);
        } else {
            setMessage('Настройки сохранены! ✅');
            onUpdate();
        }
        setSaving(false);
    };

    return (
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
                        <p>1. Начните диалог или добавьте в беседу нашего бота: <a href="https://t.me/ErroraBot" target="_blank" rel="noopener">@ErroraBot</a></p>
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

            {message && (
                <div className={`alert ${message.includes('Ошибка') ? 'alert--error' : 'alert--success'}`}>
                    {message}
                </div>
            )}

            <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
        </form>
    );
}

// ── Notion Settings (OAuth) ──
function NotionSettings({ client, onUpdate }) {
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const isConnected = !!(client?.notion_access_token || client?.notion_key);

    // Check for OAuth callback status in URL
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const reason = params.get('reason');

        if (status === 'success') {
            setMessage('Notion подключён! ✅');
            onUpdate();
            // Clean URL
            navigate('/dashboard/integrations/notion', { replace: true });
        } else if (status === 'error') {
            const reasons = {
                token_exchange_failed: 'Ошибка при обмене токена',
                no_pages_found: 'Не удалось найти доступные страницы',
                no_pages_shared: 'Вы не поделились ни одной страницей. Пожалуйста, выберите хотя бы одну страницу при авторизации.',
                db_creation_failed: 'Ошибка при создании базы данных',
                save_failed: 'Ошибка при сохранении',
                missing_params: 'Отсутствуют параметры авторизации',
            };
            setMessage(`Ошибка: ${reasons[reason] || reason || 'Неизвестная ошибка'}`);
            navigate('/dashboard/integrations/notion', { replace: true });
        }
    }, []);

    const apiBaseUrl = import.meta.env.VITE_API_URL.replace('/api/report', '');

    const handleConnect = () => {
        const url = `${apiBaseUrl}/api/notion/auth?clientId=${encodeURIComponent(client.id)}`;
        window.location.href = url;
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
        setMessage('');

        try {
            const resp = await fetch(`${apiBaseUrl}/api/notion/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: client.api_key }),
            });

            if (resp.ok) {
                setMessage('Notion отключён ✅');
                onUpdate();
            } else {
                setMessage('Ошибка при отключении');
            }
        } catch (err) {
            setMessage('Ошибка сети: ' + err.message);
        }
        setDisconnecting(false);
    };

    return (
        <div>
            <div className="card">
                <h2 className="card__title">📋 Notion</h2>

                {isConnected ? (
                    <div className="notion-connected">
                        <div className="notion-status">
                            <span className="notion-status__badge">✅ Подключено</span>
                            {client.notion_workspace_name && (
                                <span className="notion-status__workspace">
                                    Workspace: <strong>{client.notion_workspace_name}</strong>
                                </span>
                            )}
                        </div>

                        {client.notion_db_url && (
                            <a
                                href={client.notion_db_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn btn--ghost btn--sm"
                                style={{ marginTop: '12px', display: 'inline-block' }}
                            >
                                🔗 Открыть базу данных в Notion
                            </a>
                        )}

                        <div style={{ marginTop: '16px' }}>
                            <button
                                onClick={handleDisconnect}
                                className="btn btn--danger btn--sm"
                                disabled={disconnecting}
                            >
                                {disconnecting ? 'Отключение…' : '🔴 Отключить Notion'}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="notion-connect">
                        <p className="card__desc">
                            Подключите Notion, чтобы баг-репорты автоматически создавались как записи в вашей базе данных.
                        </p>
                        <div className="notion-connect__steps">
                            <p>1. Нажмите кнопку ниже</p>
                            <p>2. Выберите страницу для базы данных</p>
                            <p>3. Готово! База «🐞 Errora Bug Reports» создастся автоматически</p>
                        </div>
                        <button onClick={handleConnect} className="btn btn--primary" style={{ marginTop: '16px' }}>
                            🔗 Подключить Notion
                        </button>
                    </div>
                )}
            </div>

            {message && (
                <div className={`alert ${message.includes('Ошибка') ? 'alert--error' : 'alert--success'}`}>
                    {message}
                </div>
            )}
        </div>
    );
}

// ── Discord Settings ──
function DiscordSettings({ client, onUpdate }) {
    const [botToken, setBotToken] = useState(client?.discord_bot_token || '');
    const [channelId, setChannelId] = useState(client?.discord_channel_id || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const isConnected = !!client?.discord_bot_token && !!client?.discord_channel_id;

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        const updateData = {
            discord_bot_token: botToken || null,
            discord_channel_id: channelId || null,
            updated_at: new Date().toISOString(),
        };

        const { error } = await supabase
            .from('clients')
            .update(updateData)
            .eq('id', client.id);

        if (error) {
            setMessage('Ошибка сохранения: ' + error.message);
        } else {
            setMessage('Настройки сохранены! ✅');
            onUpdate();
        }
        setSaving(false);
    };

    const handleDisconnect = async () => {
        setSaving(true);
        setMessage('');

        const { error } = await supabase
            .from('clients')
            .update({
                discord_bot_token: null,
                discord_channel_id: null,
                updated_at: new Date().toISOString(),
            })
            .eq('id', client.id);

        if (error) {
            setMessage('Ошибка: ' + error.message);
        } else {
            setBotToken('');
            setChannelId('');
            setMessage('Discord отключён ✅');
            onUpdate();
        }
        setSaving(false);
    };

    return (
        <form onSubmit={handleSave}>
            <div className="card">
                <h2 className="card__title">🎮 Discord</h2>
                <p className="card__desc">Получайте баг-репорты прямо в канал Discord.</p>

                {isConnected && (
                    <div style={{ marginBottom: '16px' }}>
                        <span className="badge badge--green">Подключено</span>
                    </div>
                )}

                <div className="bot-instructions">
                    <p>1. Перейдите в <a href="https://discord.com/developers/applications" target="_blank" rel="noopener">Discord Developer Portal</a></p>
                    <p>2. Создайте приложение → Bot → скопируйте <strong>Bot Token</strong></p>
                    <p>3. Включите <code>MESSAGE CONTENT INTENT</code> в настройках бота</p>
                    <p>4. Добавьте бота на сервер (OAuth2 → scope: <code>bot</code>, permissions: <code>Send Messages</code>, <code>Embed Links</code>)</p>
                    <p>5. Скопируйте <strong>Channel ID</strong> нужного канала (ПКМ → «Копировать ID канала», нужен включённый режим разработчика)</p>
                </div>

                <div className="form-row">
                    <div className="form-group">
                        <label htmlFor="discord-token">Bot Token</label>
                        <input
                            id="discord-token"
                            type="text"
                            value={botToken}
                            onChange={(e) => setBotToken(e.target.value)}
                            placeholder="MTIzNDU2Nzg5MDEyMzQ1Njc4OQ..."
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="discord-channel">Channel ID</label>
                        <input
                            id="discord-channel"
                            type="text"
                            value={channelId}
                            onChange={(e) => setChannelId(e.target.value)}
                            placeholder="1234567890123456789"
                        />
                    </div>
                </div>
            </div>

            {message && (
                <div className={`alert ${message.includes('Ошибка') ? 'alert--error' : 'alert--success'}`}>
                    {message}
                </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                    {saving ? 'Сохранение…' : 'Сохранить'}
                </button>
                {isConnected && (
                    <button type="button" className="btn btn--danger btn--sm" onClick={handleDisconnect} disabled={saving}>
                        🔴 Отключить
                    </button>
                )}
            </div>
        </form>
    );
}

// ── Coming Soon Placeholder ──
function ComingSoonPlaceholder({ name, icon }) {
    return (
        <div className="card">
            <div className="empty-state">
                <span className="empty-state__icon">{icon}</span>
                <h3>{name}</h3>
                <p>Эта интеграция скоро будет доступна. Следите за обновлениями!</p>
            </div>
        </div>
    );
}

// ── Meta info for integrations ──
const INTEGRATION_META = {
    telegram: { name: 'Telegram', icon: '📱' },
    notion: { name: 'Notion', icon: '📋' },
    jira: { name: 'Jira', icon: '🎯' },
    slack: { name: 'Slack', icon: '💬' },
    discord: { name: 'Discord', icon: '🎮' },
    email: { name: 'Email', icon: '✉️' },
};

export default function IntegrationSettings({ client, onUpdate }) {
    const { integrationId } = useParams();
    const navigate = useNavigate();
    const meta = INTEGRATION_META[integrationId];

    if (!meta) {
        return (
            <div className="page">
                <div className="empty-state">
                    <span className="empty-state__icon">❓</span>
                    <h3>Интеграция не найдена</h3>
                </div>
            </div>
        );
    }

    const renderSettings = () => {
        switch (integrationId) {
            case 'telegram':
                return <TelegramSettings client={client} onUpdate={onUpdate} />;
            case 'notion':
                return <NotionSettings client={client} onUpdate={onUpdate} />;
            case 'discord':
                return <DiscordSettings client={client} onUpdate={onUpdate} />;
            default:
                return <ComingSoonPlaceholder name={meta.name} icon={meta.icon} />;
        }
    };

    return (
        <div className="page">
            <button
                className="btn btn--ghost btn--sm integration-back-btn"
                onClick={() => navigate('/dashboard/integrations')}
            >
                ← Назад к интеграциям
            </button>
            <h1 className="page__title">
                {meta.icon} {meta.name}
            </h1>
            {renderSettings()}
        </div>
    );
}
