import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export default function LandingPage() {
    const navigate = useNavigate();
    const { t, i18n } = useTranslation();

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ru' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('errora_lang', newLang);
    };

    return (
        <div className="landing">
            {/* Background Shapes */}
            <div className="background-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>

            {/* Hero Section */}
            <header className="landing__hero">
                <nav className="landing__nav">
                    <div className="landing__logo">
                        <span>🐞</span>
                        <h1>Errora</h1>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <button
                            onClick={toggleLanguage}
                            title="Switch Language"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
                        >
                            {i18n.language === 'en' ? '🇺🇸' : '🇷🇺'}
                        </button>
                        <button className="btn btn--outline btn--sm" onClick={() => navigate('/auth')}>
                            {t('landing.login')}
                        </button>
                    </div>
                </nav>

                <div className="landing__hero-content">
                    <h2 className="landing__headline">
                        {t('landing.headline_1')}<br />
                        <span className="landing__gradient-text">{t('landing.headline_2')}</span>
                    </h2>
                    <p className="landing__subtitle">
                        {t('landing.subtitle')}
                    </p>
                    <div className="landing__cta">
                        <button className="btn btn--primary btn--lg" onClick={() => navigate('/auth')}>
                            {t('landing.cta_primary')}
                        </button>
                        <a href="#demo" className="btn btn--ghost btn--lg">{t('landing.cta_secondary')}</a>
                    </div>
                </div>
            </header>

            {/* Features */}
            <section className="landing__features">
                <div className="landing__feature-card">
                    <span className="landing__feature-icon">📸</span>
                    <h3>{t('landing.feature_screenshots_title')}</h3>
                    <p>{t('landing.feature_screenshots_desc')}</p>
                </div>
                <div className="landing__feature-card">
                    <span className="landing__feature-icon">📱</span>
                    <h3>{t('landing.feature_telegram_title')}</h3>
                    <p>{t('landing.feature_telegram_desc')}</p>
                </div>
                <div className="landing__feature-card">
                    <span className="landing__feature-icon">📋</span>
                    <h3>{t('landing.feature_notion_title')}</h3>
                    <p>{t('landing.feature_notion_desc')}</p>
                </div>
                <div className="landing__feature-card">
                    <span className="landing__feature-icon">🔧</span>
                    <h3>{t('landing.feature_meta_title')}</h3>
                    <p>{t('landing.feature_meta_desc')}</p>
                </div>
            </section>

            {/* Demo Section */}
            <section className="landing__demo" id="demo">
                <h2 className="landing__section-title">{t('landing.demo_title')}</h2>
                <p className="landing__section-desc">
                    {t('landing.demo_desc_1')}<strong>{t('landing.demo_desc_icon')}</strong>{t('landing.demo_desc_2')}
                </p>
                <div className="landing__demo-hint">
                    <span className="landing__demo-arrow">👇</span>
                    {t('landing.demo_hint')}
                </div>
            </section>

            {/* How it works */}
            <section className="landing__how">
                <h2 className="landing__section-title">{t('landing.how_title')}</h2>
                <div className="landing__steps">
                    <div className="landing__step">
                        <div className="landing__step-num">1</div>
                        <h3>{t('landing.step_1_title')}</h3>
                        <p>{t('landing.step_1_desc')}</p>
                    </div>
                    <div className="landing__step">
                        <div className="landing__step-num">2</div>
                        <h3>{t('landing.step_2_title')}</h3>
                        <p>{t('landing.step_2_desc')}</p>
                    </div>
                    <div className="landing__step">
                        <div className="landing__step-num">3</div>
                        <h3>{t('landing.step_3_title')}</h3>
                        <p>{t('landing.step_3_desc')}</p>
                    </div>
                </div>
            </section>

            {/* CTA */}
            <section className="landing__bottom-cta">
                <h2>{t('landing.cta_bottom_title')}</h2>
                <p>{t('landing.cta_bottom_desc')}</p>
                <button className="btn btn--primary btn--lg" onClick={() => navigate('/auth')}>
                    {t('landing.cta_bottom_btn')}
                </button>
            </section>

            {/* Footer */}
            <footer className="landing__footer">
                <div className="landing__footer-links">
                    <Link to="/privacy">Privacy Policy</Link>
                    <Link to="/terms">Terms of Use</Link>
                    <Link to="/dpa">DPA</Link>
                </div>
                <p>Errora © {new Date().getFullYear()} · {t('landing.footer_made_with')}</p>
            </footer>
        </div>
    );
}
