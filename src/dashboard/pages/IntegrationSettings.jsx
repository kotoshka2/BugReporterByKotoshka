import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTranslation, Trans } from 'react-i18next';

// ── Telegram Settings ──
function TelegramSettings({ client, onUpdate }) {
    const { t } = useTranslation();
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
            setMessage(t('integrations.msg_save_error') + error.message);
        } else {
            setMessage(t('integrations.msg_save_success'));
            onUpdate();
        }
        setSaving(false);
    };

    return (
        <form onSubmit={handleSave}>
            <div className="card">
                <h2 className="card__title">📱 {t('integrations.tg_title')}</h2>
                <p className="card__desc">{t('integrations.tg_desc')}</p>

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
                            <strong>{t('integrations.tg_bot_system')}</strong>
                            <span>{t('integrations.tg_bot_system_desc')}</span>
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
                            <strong>{t('integrations.tg_bot_custom')}</strong>
                            <span>{t('integrations.tg_bot_custom_desc')}</span>
                        </div>
                    </label>
                </div>

                {/* System bot instructions */}
                {botMode === 'system' && (
                    <div className="bot-instructions">
                        <p>{t('integrations.tg_inst_sys_1')}<a href="https://t.me/ErroraBot" target="_blank" rel="noopener">@ErroraBot</a></p>
                        <p><Trans i18nKey="integrations.tg_inst_sys_2">2. Send the command <code>/chatid</code></Trans></p>
                        <p>{t('integrations.tg_inst_sys_3')}</p>
                    </div>
                )}

                {/* Custom bot instructions */}
                {botMode === 'custom' && (
                    <div className="bot-instructions">
                        <p>{t('integrations.tg_inst_cus_1')}<a href="https://t.me/BotFather" target="_blank" rel="noopener">@BotFather</a></p>
                        <p>{t('integrations.tg_inst_cus_2')}</p>
                        <p>{t('integrations.tg_inst_cus_3')}</p>
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
                <div className={`alert ${message.includes('error') || message.includes('Ошибка') ? 'alert--error' : 'alert--success'}`}>
                    {message}
                </div>
            )}

            <button type="submit" className="btn btn--primary" disabled={saving}>
                {saving ? t('integrations.btn_saving') : t('integrations.btn_save')}
            </button>
        </form>
    );
}

// ── Notion Settings (OAuth) ──
function NotionSettings({ client, onUpdate }) {
    const { t } = useTranslation();
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState('');
    const [doneStatus, setDoneStatus] = useState(client?.notion_done_status || 'Done');
    const [savingStatus, setSavingStatus] = useState(false);
    const navigate = useNavigate();
    const isConnected = !!(client?.notion_access_token || client?.notion_key);

    // Check for OAuth callback status in URL
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const reason = params.get('reason');

        if (status === 'success') {
            setMessage(t('integrations.notion_connected'));
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
            setMessage(`Ошибка/Error: ${reasons[reason] || reason || 'Неизвестная ошибка'}`);
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
                setMessage(t('integrations.notion_disconnected'));
                onUpdate();
            } else {
                setMessage(t('integrations.msg_disconnect_error'));
            }
        } catch (err) {
            setMessage(t('integrations.msg_network_error') + err.message);
        }
        setDisconnecting(false);
    };

    const handleSaveDoneStatus = async () => {
        setSavingStatus(true);
        setMessage('');
        const { error } = await supabase
            .from('clients')
            .update({ notion_done_status: doneStatus || 'Done', updated_at: new Date().toISOString() })
            .eq('id', client.id);

        if (error) {
            setMessage(t('integrations.msg_save_error') + error.message);
        } else {
            setMessage(t('integrations.msg_save_success'));
            onUpdate();
        }
        setSavingStatus(false);
    };

    return (
        <div>
            <div className="card">
                <h2 className="card__title">📋 {t('integrations.notion_title')}</h2>

                {isConnected ? (
                    <div className="notion-connected">
                        <div className="notion-status">
                            <span className="notion-status__badge">✅ {t('integrations.status_connected')}</span>
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
                                {t('integrations.notion_btn_open')}
                            </a>
                        )}

                        <div className="form-group" style={{ marginTop: '16px' }}>
                            <label htmlFor="notion-done-status">{t('integrations.notion_done_status', 'Done Status')}</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    id="notion-done-status"
                                    type="text"
                                    value={doneStatus}
                                    onChange={(e) => setDoneStatus(e.target.value)}
                                    placeholder="Done"
                                    style={{ flex: 1 }}
                                />
                                <button
                                    className="btn btn--primary btn--sm"
                                    onClick={handleSaveDoneStatus}
                                    disabled={savingStatus}
                                >
                                    {savingStatus ? t('integrations.btn_saving') : t('integrations.btn_save')}
                                </button>
                            </div>
                            <small style={{ color: '#64748b', display: 'block', marginTop: '4px' }}>
                                {t('integrations.notion_done_status_desc', 'Exact text for the "Done" status property to trigger email notifications.')}
                            </small>
                        </div>

                        <div style={{ marginTop: '24px' }}>
                            <button
                                onClick={handleDisconnect}
                                className="btn btn--danger btn--sm"
                                disabled={disconnecting}
                            >
                                {disconnecting ? t('integrations.btn_disconnecting') : t('integrations.notion_btn_disconnect')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="notion-connect">
                        <p className="card__desc">
                            {t('integrations.notion_desc')}
                        </p>
                        <div className="notion-connect__steps">
                            <p>{t('integrations.notion_step_1')}</p>
                            <p>{t('integrations.notion_step_2')}</p>
                            <p>{t('integrations.notion_step_3')}</p>
                        </div>
                        <button onClick={handleConnect} className="btn btn--primary" style={{ marginTop: '16px' }}>
                            {t('integrations.notion_btn_connect')}
                        </button>
                    </div>
                )}
            </div>

            {message && (
                <div className={`alert ${message.includes('error') || message.includes('Ошибка') ? 'alert--error' : 'alert--success'}`}>
                    {message}
                </div>
            )}
        </div>
    );
}

// ── Discord Settings ──
function DiscordSettings({ client, onUpdate }) {
    const { t } = useTranslation();
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
            setMessage(t('integrations.msg_save_error') + error.message);
        } else {
            setMessage(t('integrations.msg_save_success'));
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
            setMessage(t('integrations.msg_save_error') + error.message);
        } else {
            setBotToken('');
            setChannelId('');
            setMessage(t('integrations.discord_disconnected'));
            onUpdate();
        }
        setSaving(false);
    };

    return (
        <form onSubmit={handleSave}>
            <div className="card">
                <h2 className="card__title">🎮 {t('integrations.discord_title')}</h2>
                <p className="card__desc">{t('integrations.discord_desc')}</p>

                {isConnected && (
                    <div style={{ marginBottom: '16px' }}>
                        <span className="badge badge--green">{t('integrations.status_connected')}</span>
                    </div>
                )}

                <div className="bot-instructions">
                    <p>{t('integrations.discord_inst_1')} <a href="https://discord.com/developers/applications" target="_blank" rel="noopener">Discord Developer Portal</a></p>
                    <p><Trans i18nKey="integrations.discord_inst_2">2. Create application → Bot → copy <strong>Bot Token</strong></Trans></p>
                    <p><Trans i18nKey="integrations.discord_inst_3">3. Enable <code>MESSAGE CONTENT INTENT</code> in bot settings</Trans></p>
                    <p><Trans i18nKey="integrations.discord_inst_4">4. Add bot to server (OAuth2 → scope: <code>bot</code>, permissions: <code>Send Messages</code>, <code>Embed Links</code>)</Trans></p>
                    <p><Trans i18nKey="integrations.discord_inst_5">5. Copy <strong>Channel ID</strong> of the desired channel</Trans></p>
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
                <div className={`alert ${message.includes('error') || message.includes('Ошибка') ? 'alert--error' : 'alert--success'}`}>
                    {message}
                </div>
            )}

            <div style={{ display: 'flex', gap: '12px' }}>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                    {saving ? t('integrations.btn_saving') : t('integrations.btn_save')}
                </button>
                {isConnected && (
                    <button type="button" className="btn btn--danger btn--sm" onClick={handleDisconnect} disabled={saving}>
                        {t('integrations.btn_disconnect')}
                    </button>
                )}
            </div>
        </form>
    );
}

// ── Slack Settings (OAuth) ──
function SlackSettings({ client, onUpdate }) {
    const { t } = useTranslation();
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState('');
    const navigate = useNavigate();
    const isConnected = !!client?.slack_webhook_url;

    // Check for OAuth callback status in URL
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const reason = params.get('reason');

        if (status === 'success') {
            setMessage(t('integrations.slack_connected'));
            onUpdate();
            navigate('/dashboard/integrations/slack', { replace: true });
        } else if (status === 'error') {
            const reasons = {
                token_exchange_failed: 'Ошибка при обмене токена',
                no_webhook: 'Не удалось получить Webhook URL от Slack',
                save_failed: 'Ошибка при сохранении',
                missing_params: 'Отсутствуют параметры авторизации',
                access_denied: 'Доступ отклонён пользователем',
            };
            setMessage(`Ошибка/Error: ${reasons[reason] || reason || 'Неизвестная ошибка'}`);
            navigate('/dashboard/integrations/slack', { replace: true });
        }
    }, []);

    const apiBaseUrl = import.meta.env.VITE_API_URL.replace('/api/report', '');

    const handleConnect = () => {
        const url = `${apiBaseUrl}/api/slack/auth?clientId=${encodeURIComponent(client.id)}`;
        window.location.href = url;
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
        setMessage('');

        try {
            const resp = await fetch(`${apiBaseUrl}/api/slack/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: client.api_key }),
            });

            if (resp.ok) {
                setMessage(t('integrations.slack_disconnected'));
                onUpdate();
            } else {
                setMessage(t('integrations.msg_disconnect_error'));
            }
        } catch (err) {
            setMessage(t('integrations.msg_network_error') + err.message);
        }
        setDisconnecting(false);
    };

    return (
        <div>
            <div className="card">
                <h2 className="card__title">💬 {t('integrations.slack_title')}</h2>

                {isConnected ? (
                    <div className="notion-connected">
                        <div className="notion-status">
                            <span className="notion-status__badge">✅ {t('integrations.status_connected')}</span>
                            {client.slack_team_name && (
                                <span className="notion-status__workspace">
                                    Workspace: <strong>{client.slack_team_name}</strong>
                                </span>
                            )}
                            {client.slack_channel_name && (
                                <span className="notion-status__workspace">
                                    {t('integrations.slack_channel')} <strong>{client.slack_channel_name}</strong>
                                </span>
                            )}
                        </div>

                        <div style={{ marginTop: '16px' }}>
                            <button
                                onClick={handleDisconnect}
                                className="btn btn--danger btn--sm"
                                disabled={disconnecting}
                            >
                                {disconnecting ? t('integrations.btn_disconnecting') : t('integrations.slack_btn_disconnect')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="notion-connect">
                        <p className="card__desc">
                            {t('integrations.slack_desc')}
                        </p>
                        <div className="notion-connect__steps">
                            <p>{t('integrations.slack_step_1')}</p>
                            <p>{t('integrations.slack_step_2')}</p>
                            <p>{t('integrations.slack_step_3')}</p>
                        </div>
                        <button onClick={handleConnect} className="btn btn--primary" style={{ marginTop: '16px' }}>
                            {t('integrations.slack_btn_connect')}
                        </button>
                    </div>
                )}
            </div>

            {message && (
                <div className={`alert ${message.includes('error') || message.includes('Ошибка') ? 'alert--error' : 'alert--success'}`}>
                    {message}
                </div>
            )}
        </div>
    );
}

// ── Jira Settings (OAuth) ──
function JiraSettings({ client, onUpdate }) {
    const { t } = useTranslation();
    const [disconnecting, setDisconnecting] = useState(false);
    const [message, setMessage] = useState('');
    const [jiraConfig, setJiraConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [projectKey, setProjectKey] = useState('');
    const [savingKey, setSavingKey] = useState(false);
    const navigate = useNavigate();

    // Fetch Jira config from separate table
    const fetchJiraConfig = async () => {
        const { data, error } = await supabase
            .from('jira_integrations')
            .select('*')
            .eq('client_id', client.id)
            .maybeSingle();

        if (data) {
            setJiraConfig(data);
            setProjectKey(data.project_key || '');
        } else {
            setJiraConfig(null);
        }
        setLoading(false);
    };

    React.useEffect(() => {
        if (client) fetchJiraConfig();
    }, [client]);

    // Check for OAuth callback status in URL
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const status = params.get('status');
        const reason = params.get('reason');

        if (status === 'success') {
            setMessage(t('integrations.jira_connected'));
            fetchJiraConfig();
            onUpdate();
            navigate('/dashboard/integrations/jira', { replace: true });
        } else if (status === 'error') {
            const reasons = {
                token_exchange_failed: 'Token exchange failed',
                no_sites_found: 'No Jira sites found for this account',
                resources_fetch_failed: 'Failed to fetch Jira resources',
                save_failed: 'Failed to save credentials',
                missing_params: 'Missing authorization parameters',
                no_access_token: 'No access token received',
                access_denied: 'Access denied by user',
            };
            setMessage(`Error: ${reasons[reason] || reason || 'Unknown error'}`);
            navigate('/dashboard/integrations/jira', { replace: true });
        }
    }, []);

    const apiBaseUrl = import.meta.env.VITE_API_URL.replace('/api/report', '');

    const handleConnect = () => {
        const url = `${apiBaseUrl}/api/jira/auth?clientId=${encodeURIComponent(client.id)}`;
        window.location.href = url;
    };

    const handleDisconnect = async () => {
        setDisconnecting(true);
        setMessage('');

        try {
            const resp = await fetch(`${apiBaseUrl}/api/jira/disconnect`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ apiKey: client.api_key }),
            });

            if (resp.ok) {
                setMessage(t('integrations.jira_disconnected'));
                setJiraConfig(null);
                onUpdate();
            } else {
                setMessage(t('integrations.msg_disconnect_error'));
            }
        } catch (err) {
            setMessage(t('integrations.msg_network_error') + err.message);
        }
        setDisconnecting(false);
    };

    const handleSaveProjectKey = async () => {
        setSavingKey(true);
        setMessage('');
        const { error } = await supabase
            .from('jira_integrations')
            .update({ project_key: projectKey || null, updated_at: new Date().toISOString() })
            .eq('client_id', client.id);

        if (error) {
            setMessage(t('integrations.msg_save_error') + error.message);
        } else {
            setMessage(t('integrations.msg_save_success'));
            onUpdate();
        }
        setSavingKey(false);
    };

    if (loading) {
        return <div className="card"><div className="loading-spinner" /></div>;
    }

    const isConnected = !!jiraConfig?.access_token;

    return (
        <div>
            <div className="card">
                <h2 className="card__title">🎯 {t('integrations.jira_title')}</h2>

                {isConnected ? (
                    <div className="notion-connected">
                        <div className="notion-status">
                            <span className="notion-status__badge">✅ {t('integrations.status_connected')}</span>
                            {jiraConfig.workspace_name && (
                                <span className="notion-status__workspace">
                                    Site: <strong>{jiraConfig.workspace_name}</strong>
                                </span>
                            )}
                        </div>

                        <div className="form-group" style={{ marginTop: '16px' }}>
                            <label htmlFor="jira-project-key">{t('integrations.jira_project_key')}</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <input
                                    id="jira-project-key"
                                    type="text"
                                    value={projectKey}
                                    onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                                    placeholder={t('integrations.jira_project_key_placeholder')}
                                    style={{ flex: 1 }}
                                />
                                <button
                                    className="btn btn--primary btn--sm"
                                    onClick={handleSaveProjectKey}
                                    disabled={savingKey}
                                >
                                    {savingKey ? t('integrations.btn_saving') : t('integrations.btn_save')}
                                </button>
                            </div>
                            <small style={{ color: 'var(--text-muted)', display: 'block', marginTop: '4px' }}>
                                {t('integrations.jira_project_key_desc')}
                            </small>
                        </div>

                        <div style={{ marginTop: '24px' }}>
                            <button
                                onClick={handleDisconnect}
                                className="btn btn--danger btn--sm"
                                disabled={disconnecting}
                            >
                                {disconnecting ? t('integrations.btn_disconnecting') : t('integrations.jira_btn_disconnect')}
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="notion-connect">
                        <p className="card__desc">
                            {t('integrations.jira_desc')}
                        </p>
                        <div className="notion-connect__steps">
                            <p>{t('integrations.jira_step_1')}</p>
                            <p>{t('integrations.jira_step_2')}</p>
                            <p>{t('integrations.jira_step_3')}</p>
                        </div>
                        <button onClick={handleConnect} className="btn btn--primary" style={{ marginTop: '16px' }}>
                            {t('integrations.jira_btn_connect')}
                        </button>
                    </div>
                )}
            </div>

            {message && (
                <div className={`alert ${message.includes('error') || message.includes('Ошибка') || message.includes('Error') ? 'alert--error' : 'alert--success'}`}>
                    {message}
                </div>
            )}
        </div>
    );
}

// ── Coming Soon Placeholder ──
function ComingSoonPlaceholder({ name, icon }) {
    const { t } = useTranslation();
    return (
        <div className="card">
            <div className="empty-state">
                <span className="empty-state__icon">{icon}</span>
                <h3>{name}</h3>
                <p>{t('integrations.coming_soon')}</p>
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
    const { t } = useTranslation();
    const meta = INTEGRATION_META[integrationId];

    if (!meta) {
        return (
            <div className="page">
                <div className="empty-state">
                    <span className="empty-state__icon">❓</span>
                    <h3>{t('integrations.not_found')}</h3>
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
            case 'slack':
                return <SlackSettings client={client} onUpdate={onUpdate} />;
            case 'jira':
                return <JiraSettings client={client} onUpdate={onUpdate} />;
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
                {t('integrations.btn_back')}
            </button>
            <h1 className="page__title">
                {meta.icon} {meta.name}
            </h1>
            {renderSettings()}
        </div>
    );
}
