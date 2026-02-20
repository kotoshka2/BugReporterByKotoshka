import React from 'react';
import { useNavigate } from 'react-router-dom';

const INTEGRATIONS = [
    {
        id: 'telegram',
        name: 'Telegram',
        icon: '📱',
        description: 'Получайте баг-репорты прямо в чат Telegram.',
        checkActive: (client) => !!client?.tg_chat_id,
    },
    {
        id: 'notion',
        name: 'Notion',
        icon: '📋',
        description: 'Автоматически создавайте тикеты в Notion.',
        checkActive: (client) => !!(client?.notion_access_token || client?.notion_key) && !!client?.notion_db_id,
    },
    {
        id: 'jira',
        name: 'Jira',
        icon: '🎯',
        description: 'Создавайте задачи в Jira из баг-репортов.',
        comingSoon: true,
    },
    {
        id: 'slack',
        name: 'Slack',
        icon: '💬',
        description: 'Отправляйте уведомления о багах в Slack-каналы.',
        comingSoon: true,
    },
    {
        id: 'discord',
        name: 'Discord',
        icon: '🎮',
        description: 'Получайте баг-репорты в Discord-каналы.',
        checkActive: (client) => !!client?.discord_bot_token && !!client?.discord_channel_id,
    },
    {
        id: 'email',
        name: 'Email',
        icon: '✉️',
        description: 'Уведомления на email о новых баг-репортах.',
        comingSoon: true,
    },
];

export default function IntegrationsList({ client }) {
    const navigate = useNavigate();

    return (
        <div className="page">
            <h1 className="page__title">🔌 Интеграции</h1>
            <p className="page__subtitle">
                Подключите сервисы, чтобы получать баг-репорты в удобном месте.
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
                                        <span className="badge badge--green">Активна</span>
                                    )}
                                    {isComingSoon && (
                                        <span className="badge">Скоро</span>
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
