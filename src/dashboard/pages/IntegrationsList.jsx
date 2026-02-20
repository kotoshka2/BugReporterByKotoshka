import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function IntegrationsList({ client }) {
    const navigate = useNavigate();
    const { t } = useTranslation();

    const INTEGRATIONS = [
        {
            id: 'telegram',
            name: 'Telegram',
            icon: '📱',
            description: t('integrations.desc_telegram', 'Получайте баг-репорты прямо в чат Telegram.'),
            checkActive: (client) => !!client?.tg_chat_id,
        },
        {
            id: 'notion',
            name: 'Notion',
            icon: '📋',
            description: t('integrations.desc_notion', 'Автоматически создавайте тикеты в Notion.'),
            checkActive: (client) => !!(client?.notion_access_token || client?.notion_key) && !!client?.notion_db_id,
        },
        {
            id: 'jira',
            name: 'Jira',
            icon: '🎯',
            description: t('integrations.desc_jira', 'Создавайте задачи в Jira из баг-репортов.'),
            comingSoon: true,
        },
        {
            id: 'slack',
            name: 'Slack',
            icon: '💬',
            description: t('integrations.desc_slack', 'Отправляйте уведомления о багах в Slack-каналы.'),
            checkActive: (client) => !!client?.slack_webhook_url,
        },
        {
            id: 'discord',
            name: 'Discord',
            icon: '🎮',
            description: t('integrations.desc_discord', 'Получайте баг-репорты в Discord-каналы.'),
            checkActive: (client) => !!client?.discord_bot_token && !!client?.discord_channel_id,
        },
        {
            id: 'email',
            name: 'Email',
            icon: '✉️',
            description: t('integrations.desc_email', 'Уведомления на email о новых баг-репортах.'),
            comingSoon: true,
        },
    ];

    return (
        <div className="page">
            <h1 className="page__title">{t('dashboard.title_integrations')}</h1>
            <p className="page__subtitle">
                {t('integrations.subtitle', 'Подключите сервисы, чтобы получать баг-репорты в удобном месте.')}
            </p>

            <div className="integrations-grid">
                {INTEGRATIONS.map((integration) => {
                    const isActive = integration.checkActive?.(client);
                    const isComingSoon = integration.comingSoon;

                    return (
                        <div
                            key={integration.id}
                            className={`integration-card ${isActive ? 'integration-card--active' : ''} ${isComingSoon ? 'integration-card--disabled' : ''}`}
                            onClick={() => !isComingSoon && navigate(integration.id)}
                        >
                            <div className="integration-card__icon">
                                {integration.icon}
                            </div>
                            <div className="integration-card__body">
                                <div className="integration-card__header">
                                    <h3 className="integration-card__name">
                                        {integration.name}
                                    </h3>
                                    {isActive && (
                                        <span className="badge badge--green">{t('integrations.status_active', 'Активна')}</span>
                                    )}
                                    {isComingSoon && (
                                        <span className="badge">{t('integrations.status_soon', 'Скоро')}</span>
                                    )}
                                </div>
                                <p className="integration-card__desc">
                                    {integration.description}
                                </p>
                            </div>
                            {!isComingSoon && (
                                <div className="integration-card__arrow">→</div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
