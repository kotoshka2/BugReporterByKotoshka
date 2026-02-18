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

// ── Notion Settings ──
function NotionSettings({ client, onUpdate }) {
    const [notionKey, setNotionKey] = useState(client?.notion_key || '');
    const [notionDbId, setNotionDbId] = useState(client?.notion_db_id || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage('');

        const updateData = {
            notion_key: notionKey || null,
            notion_db_id: notionDbId || null,
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
                <h2 className="card__title">📋 Notion</h2>
                <p className="card__desc">
                    Автоматически создавайте тикеты в Notion.{' '}
                    <a href="https://developers.notion.com" target="_blank" rel="noopener">Создать интеграцию →</a>
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
                {saving ? 'Сохранение…' : 'Сохранить'}
            </button>
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
