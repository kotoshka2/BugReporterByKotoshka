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
  window.ErroraWidgetConfig = {
    apiKey: '${client?.api_key || 'YOUR_API_KEY'}'
  };
</script>
<script src="https://today-is-friday.tech/errora/errora-widget.iife.js" defer></script>`;
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
            <form onSubmit={handleSave}>
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
                                            ?errora_secret={secretPassword}
                                        </code>
                                        <button
                                            type="button"
                                            className="btn btn--sm btn--outline"
                                            onClick={() => {
                                                navigator.clipboard.writeText(`?errora_secret=${secretPassword}`);
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
