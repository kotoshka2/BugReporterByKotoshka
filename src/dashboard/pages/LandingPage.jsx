import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
    const navigate = useNavigate();

    return (
        <div className="landing">
            {/* Hero Section */}
            <header className="landing__hero">
                <nav className="landing__nav">
                    <div className="landing__logo">
                        <span>🐞</span>
                        <h1>Bug Reporter</h1>
                    </div>
                    <button className="btn btn--outline btn--sm" onClick={() => navigate('/auth')}>
                        Войти
                    </button>
                </nav>

                <div className="landing__hero-content">
                    <h2 className="landing__headline">
                        Собирайте баг-репорты<br />
                        <span className="landing__gradient-text">прямо с сайта</span>
                    </h2>
                    <p className="landing__subtitle">
                        Лёгкий виджет для сбора обратной связи. Скриншоты, метаданные
                        и отправка в Telegram / Notion — автоматически.
                    </p>
                    <div className="landing__cta">
                        <button className="btn btn--primary btn--lg" onClick={() => navigate('/auth')}>
                            🚀 Попробовать бесплатно
                        </button>
                        <a href="#demo" className="btn btn--ghost btn--lg">Смотреть демо ↓</a>
                    </div>
                </div>
            </header>

            {/* Features */}
            <section className="landing__features">
                <div className="landing__feature-card">
                    <span className="landing__feature-icon">📸</span>
                    <h3>Скриншоты</h3>
                    <p>Пользователь делает скриншот прямо в браузере и может обрезать нужную область.</p>
                </div>
                <div className="landing__feature-card">
                    <span className="landing__feature-icon">📱</span>
                    <h3>Telegram</h3>
                    <p>Баг-репорты приходят прямо в ваш Telegram-чат. Можно использовать нашего бота или своего.</p>
                </div>
                <div className="landing__feature-card">
                    <span className="landing__feature-icon">📋</span>
                    <h3>Notion</h3>
                    <p>Автоматическое создание тикетов в Notion-базе с заполнением всех полей.</p>
                </div>
                <div className="landing__feature-card">
                    <span className="landing__feature-icon">🔧</span>
                    <h3>Метаданные</h3>
                    <p>URL, браузер, ОС, размер экрана — всё собирается автоматически.</p>
                </div>
            </section>

            {/* Demo Section */}
            <section className="landing__demo" id="demo">
                <h2 className="landing__section-title">Попробуйте прямо сейчас</h2>
                <p className="landing__section-desc">
                    Нажмите на кнопку <strong>🐞</strong> в правом нижнем углу экрана — это и&nbsp;есть виджет.
                </p>
                <div className="landing__demo-hint">
                    <span className="landing__demo-arrow">👇</span>
                    Виджет активен на этой странице
                </div>
            </section>

            {/* How it works */}
            <section className="landing__how">
                <h2 className="landing__section-title">Как подключить</h2>
                <div className="landing__steps">
                    <div className="landing__step">
                        <div className="landing__step-num">1</div>
                        <h3>Зарегистрируйтесь</h3>
                        <p>Создайте аккаунт и получите API-ключ.</p>
                    </div>
                    <div className="landing__step">
                        <div className="landing__step-num">2</div>
                        <h3>Добавьте сниппет</h3>
                        <p>Вставьте 3 строки кода на ваш сайт.</p>
                    </div>
                    <div className="landing__step">
                        <div className="landing__step-num">3</div>
                        <h3>Получайте репорты</h3>
                        <p>Баги приходят в Telegram, Notion или в дашборд.</p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="landing__bottom-cta">
                <h2>Готовы начать?</h2>
                <p>Бесплатная регистрация, без карты.</p>
                <button className="btn btn--primary btn--lg" onClick={() => navigate('/auth')}>
                    🚀 Создать аккаунт
                </button>
            </section>

            {/* Footer */}
            <footer className="landing__footer">
                <p>Bug Reporter © {new Date().getFullYear()} · Сделано с 🐞</p>
            </footer>
        </div>
    );
}
