import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useTranslation } from 'react-i18next';

// ── SHA-256 helper ──
async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default function SettingsPage({ client, onUpdate }) {
    const [allowedDomains, setAllowedDomains] = useState(
        (client?.allowed_domains || []).join(', ')
    );
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [copied, setCopied] = useState(false);
    const { t } = useTranslation();

    // ── Widget Visibility ──
    const [widgetMode, setWidgetMode] = useState(client?.widget_mode || 'public');
    const [secretPassword, setSecretPassword] = useState('');
    const [linkCopied, setLinkCopied] = useState(false);

    // ── Widget Configurator ──
    const [snippetLang, setSnippetLang] = useState('en');
    const [snippetPosition, setSnippetPosition] = useState('bottom-right');

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
            setMessage(t('settings.msg_error') + error.message);
        } else {
            setMessage(t('settings.msg_success'));
            setSecretPassword(''); // Clear password field after save
            onUpdate();
        }
        setSaving(false);
    };

    const copySnippet = () => {
        const snippet = `<script>
  window.ErroraWidgetConfig = {
    apiKey: '${client?.api_key || 'YOUR_API_KEY'}',
    lang: '${snippetLang}',
    position: '${snippetPosition}'
  };
</script>
<script src="https://errora.net/errora-widget.iife.js" defer></script>`;
        navigator.clipboard.writeText(snippet);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="page">
            <h1 className="page__title">{t('dashboard.title_settings')}</h1>

            {/* Widget Configurator */}
            <div className="card">
                <h2 className="card__title">{t('settings.config_title')}</h2>
                <p className="card__desc">{t('settings.config_desc')}</p>

                <div className="form-row" style={{ marginBottom: '20px' }}>
                    <div className="form-group" style={{ gap: '10px' }}>
                        <label>{t('settings.config_lang_label')}</label>
                        <div className="bot-mode-toggle">
                            <label className={`bot-mode-option ${snippetLang === 'en' ? 'bot-mode-option--active' : ''}`} onClick={() => setSnippetLang('en')}>
                                <input type="radio" value="en" checked={snippetLang === 'en'} onChange={() => setSnippetLang('en')} />
                                <div>
                                    <strong>{t('settings.config_lang_en')}</strong>
                                </div>
                            </label>
                            <label className={`bot-mode-option ${snippetLang === 'ru' ? 'bot-mode-option--active' : ''}`} onClick={() => setSnippetLang('ru')}>
                                <input type="radio" value="ru" checked={snippetLang === 'ru'} onChange={() => setSnippetLang('ru')} />
                                <div>
                                    <strong>{t('settings.config_lang_ru')}</strong>
                                </div>
                            </label>
                        </div>
                    </div>
                    <div className="form-group" style={{ gap: '10px' }}>
                        <label>{t('settings.config_pos_label')}</label>
                        <div className="bot-mode-toggle">
                            <label className={`bot-mode-option ${snippetPosition === 'bottom-right' ? 'bot-mode-option--active' : ''}`} onClick={() => setSnippetPosition('bottom-right')} style={{ padding: '8px 12px' }}>
                                <input type="radio" value="bottom-right" checked={snippetPosition === 'bottom-right'} onChange={() => setSnippetPosition('bottom-right')} />
                                <div>
                                    <strong>{t('settings.config_pos_br')}</strong>
                                </div>
                            </label>
                            <label className={`bot-mode-option ${snippetPosition === 'bottom-left' ? 'bot-mode-option--active' : ''}`} onClick={() => setSnippetPosition('bottom-left')} style={{ padding: '8px 12px' }}>
                                <input type="radio" value="bottom-left" checked={snippetPosition === 'bottom-left'} onChange={() => setSnippetPosition('bottom-left')} />
                                <div>
                                    <strong>{t('settings.config_pos_bl')}</strong>
                                </div>
                            </label>
                            <label className={`bot-mode-option ${snippetPosition === 'top-right' ? 'bot-mode-option--active' : ''}`} onClick={() => setSnippetPosition('top-right')} style={{ padding: '8px 12px' }}>
                                <input type="radio" value="top-right" checked={snippetPosition === 'top-right'} onChange={() => setSnippetPosition('top-right')} />
                                <div>
                                    <strong>{t('settings.config_pos_tr')}</strong>
                                </div>
                            </label>
                            <label className={`bot-mode-option ${snippetPosition === 'top-left' ? 'bot-mode-option--active' : ''}`} onClick={() => setSnippetPosition('top-left')} style={{ padding: '8px 12px' }}>
                                <input type="radio" value="top-left" checked={snippetPosition === 'top-left'} onChange={() => setSnippetPosition('top-left')} />
                                <div>
                                    <strong>{t('settings.config_pos_tl')}</strong>
                                </div>
                            </label>
                        </div>
                    </div>
                </div>

                <div className="api-key-box" style={{ alignItems: 'flex-start' }}>
                    <code style={{ whiteSpace: 'pre-wrap', lineHeight: 1.4 }}>{`<script>
  window.ErroraWidgetConfig = {
    apiKey: '${client?.api_key || 'YOUR_API_KEY'}',
    lang: '${snippetLang}',
    position: '${snippetPosition}'
  };
</script>
<script src="https://errora.net/errora-widget.iife.js" defer></script>`}</code>
                    <button onClick={copySnippet} className="btn btn--sm btn--outline" style={{ marginTop: '0', flexShrink: 0 }}>
                        {copied ? t('settings.btn_copied') : t('settings.btn_copy')}
                    </button>
                </div>
            </div>

            {/* Domain Protection */}
            <form onSubmit={handleSave}>
                <div className="card">
                    <h2 className="card__title">{t('settings.domains_title')}</h2>
                    <p className="card__desc">
                        {t('settings.domains_desc')}
                    </p>
                    <div className="form-group">
                        <label htmlFor="allowed-domains">{t('settings.domains_label')}</label>
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
                    <h2 className="card__title">{t('settings.visibility_title')}</h2>
                    <p className="card__desc">
                        {t('settings.visibility_desc')}
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
                                <strong>{t('settings.mode_public')}</strong>
                                <span>{t('settings.mode_public_desc')}</span>
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
                                <strong>{t('settings.mode_restricted')}</strong>
                                <span>{t('settings.mode_restricted_desc')}</span>
                            </div>
                        </label>
                    </div>

                    {widgetMode === 'restricted' && (
                        <>
                            <div className="form-group" style={{ marginTop: '16px' }}>
                                <label htmlFor="secret-password">{t('settings.password_label')}</label>
                                <input
                                    id="secret-password"
                                    type="text"
                                    value={secretPassword}
                                    onChange={(e) => setSecretPassword(e.target.value)}
                                    placeholder={client?.widget_secret_hash ? t('settings.password_placeholder_change') : t('settings.password_placeholder_new')}
                                />
                                {client?.widget_secret_hash && !secretPassword && (
                                    <small style={{ color: 'var(--color-text-muted, #94a3b8)', marginTop: '4px', display: 'block' }}>
                                        {t('settings.password_hint')}
                                    </small>
                                )}
                            </div>

                            {secretPassword && (
                                <div className="bot-instructions" style={{ marginTop: '12px' }}>
                                    <p><strong>{t('settings.magic_link_title')}</strong></p>
                                    <div className="api-key-box" style={{ marginTop: '8px' }}>
                                        <code style={{ wordBreak: 'break-all', fontSize: '0.85em' }}>
                                            ?errora_secret={encodeURIComponent(secretPassword)}
                                        </code>
                                        <button
                                            type="button"
                                            className="btn btn--sm btn--outline"
                                            onClick={() => {
                                                const url = `?errora_secret=${encodeURIComponent(secretPassword)}`;
                                                navigator.clipboard.writeText(url);
                                                setLinkCopied(true);
                                                setTimeout(() => setLinkCopied(false), 2000);
                                            }}
                                        >
                                            {linkCopied ? t('settings.btn_copied') : t('settings.btn_copy').replace(' сниппет', '').replace(' snippet', '')}
                                        </button>
                                    </div>
                                    <small style={{ color: 'var(--color-text-muted, #94a3b8)', marginTop: '8px', display: 'block' }}>
                                        {t('settings.magic_link_hint')}
                                    </small>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {message && (
                    <div className={`alert ${message.includes('Ошибка') ? 'alert--error' : 'alert--success'}`}>
                        {message}
                    </div>
                )}

                <button type="submit" className="btn btn--primary" disabled={saving}>
                    {saving ? t('settings.btn_saving') : t('settings.btn_save')}
                </button>
            </form>
        </div>
    );
}
