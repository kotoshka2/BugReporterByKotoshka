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

    const integrations = [
        { icon: '✈️', name: 'Telegram', status: 'active' },
        { icon: '💬', name: 'Discord', status: 'active' },
        { icon: '💼', name: 'Slack', status: 'active' },
        { icon: '📋', name: 'Notion', status: 'active' },
        { icon: '📧', name: 'Email', status: 'active' },
        { icon: '🔧', name: 'Jira', status: 'soon' },
        { icon: '📐', name: 'Linear', status: 'soon' },
        { icon: '📝', name: 'Trello', status: 'soon' },
        { icon: '🐙', name: 'GitHub Issues', status: 'soon' },
    ];

    const features = [
        { icon: '📸', key: 'screenshots' },
        { icon: '🛠', key: 'metadata' },
        { icon: '📋', key: 'logs' },
        { icon: '🔌', key: 'integrations' },
        { icon: '🔒', key: 'shadow' },
        { icon: '👁️', key: 'private' },
    ];

    return (
        <div className="landing">
            {/* Background Shapes */}
            <div className="background-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>

            {/* ─── Navigation ─── */}
            <header className="landing__hero">
                <nav className="landing__nav">
                    <div className="landing__logo">
                        <span>🐞</span>
                        <h1>Errora</h1>
                    </div>

                    <div className="landing__nav-links">
                        <a href="#features">{t('landing.nav_features')}</a>
                        <a href="#how">{t('landing.nav_how')}</a>
                        <a href="#integrations">{t('landing.nav_integrations')}</a>
                        <a href="#pricing">{t('landing.nav_pricing')}</a>
                    </div>

                    <div className="landing__nav-actions">
                        <button
                            onClick={toggleLanguage}
                            className="lang-switcher"
                            title="Switch Language"
                        >
                            {i18n.language === 'en' ? '🇺🇸 EN' : '🇷🇺 RU'}
                        </button>
                        <button className="btn btn--outline btn--sm" onClick={() => navigate('/auth')}>
                            {t('landing.login')}
                        </button>
                        <button className="btn btn--primary btn--sm" onClick={() => navigate('/auth')}>
                            {t('landing.nav_cta')}
                        </button>
                    </div>

                    {/* Mobile hamburger */}
                    <button className="landing__mobile-toggle" onClick={(e) => {
                        e.currentTarget.closest('.landing__nav').classList.toggle('open');
                    }}>
                        <span></span><span></span><span></span>
                    </button>
                </nav>

                {/* ─── Hero Section ─── */}
                <div className="landing__hero-content">
                    <div className="landing__hero-badge">{t('landing.hero_badge')}</div>
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

            {/* ─── Features (Bento Grid) ─── */}
            <section className="landing__features" id="features">
                <h2 className="landing__section-title">{t('landing.features_title')}</h2>
                <p className="landing__section-desc">{t('landing.features_desc')}</p>
                <div className="landing__bento-grid">
                    {features.map((f) => (
                        <div className="landing__bento-card" key={f.key}>
                            <span className="landing__bento-icon">{f.icon}</span>
                            <h3>{t(`landing.feat_${f.key}_title`)}</h3>
                            <p>{t(`landing.feat_${f.key}_desc`)}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── Demo Section ─── */}
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

            {/* ─── How it works ─── */}
            <section className="landing__how" id="how">
                <h2 className="landing__section-title">{t('landing.how_title')}</h2>
                <p className="landing__section-desc">{t('landing.how_desc')}</p>
                <div className="landing__steps">
                    <div className="landing__step">
                        <div className="landing__step-num">1</div>
                        <h3>{t('landing.step_1_title')}</h3>
                        <p>{t('landing.step_1_desc')}</p>
                    </div>
                    <div className="landing__step-connector"></div>
                    <div className="landing__step">
                        <div className="landing__step-num">2</div>
                        <h3>{t('landing.step_2_title')}</h3>
                        <p>{t('landing.step_2_desc')}</p>
                    </div>
                    <div className="landing__step-connector"></div>
                    <div className="landing__step">
                        <div className="landing__step-num">3</div>
                        <h3>{t('landing.step_3_title')}</h3>
                        <p>{t('landing.step_3_desc')}</p>
                    </div>
                </div>
            </section>

            {/* ─── Integrations ─── */}
            <section className="landing__integrations" id="integrations">
                <h2 className="landing__section-title">{t('landing.integ_title')}</h2>
                <p className="landing__section-desc">{t('landing.integ_desc')}</p>
                <div className="landing__integ-grid">
                    {integrations.map((item) => (
                        <div
                            className={`landing__integ-card ${item.status === 'soon' ? 'landing__integ-card--soon' : ''}`}
                            key={item.name}
                        >
                            <span className="landing__integ-icon">{item.icon}</span>
                            <span className="landing__integ-name">{item.name}</span>
                            <span className={`landing__integ-badge ${item.status === 'active' ? 'landing__integ-badge--active' : 'landing__integ-badge--soon'}`}>
                                {item.status === 'active' ? t('landing.integ_status_active') : t('landing.integ_status_soon')}
                            </span>
                        </div>
                    ))}
                </div>
            </section>

            {/* ─── Pricing ─── */}
            <section className="landing__pricing" id="pricing">
                <h2 className="landing__section-title">{t('landing.pricing_title')}</h2>
                <p className="landing__section-desc">{t('landing.pricing_desc')}</p>
                <div className="landing__pricing-grid">
                    {/* Hobby */}
                    <div className="landing__price-card">
                        <div className="landing__price-header">
                            <h3>{t('landing.plan_hobby_name')}</h3>
                            <div className="landing__price-amount">
                                <span className="landing__price-value">{t('landing.plan_hobby_price')}</span>
                            </div>
                            <p className="landing__price-tagline">{t('landing.plan_hobby_tagline')}</p>
                        </div>
                        <ul className="landing__price-features">
                            <li>✔ {t('landing.plan_hobby_f1')}</li>
                            <li>✔ {t('landing.plan_hobby_f2')}</li>
                            <li>✔ {t('landing.plan_hobby_f3')}</li>
                            <li>✔ {t('landing.plan_hobby_f4')}</li>
                        </ul>
                        <button className="btn btn--outline btn--lg" onClick={() => navigate('/auth')}>
                            {t('landing.plan_hobby_btn')}
                        </button>
                    </div>

                    {/* Pro */}
                    <div className="landing__price-card landing__price-card--featured">
                        <div className="landing__price-badge">{t('landing.plan_pro_badge')}</div>
                        <div className="landing__price-header">
                            <h3>{t('landing.plan_pro_name')}</h3>
                            <div className="landing__price-amount">
                                <span className="landing__price-value">{t('landing.plan_pro_price')}</span>
                                <span className="landing__price-period">/ {t('landing.plan_period')}</span>
                            </div>
                            <p className="landing__price-tagline">{t('landing.plan_pro_tagline')}</p>
                        </div>
                        <ul className="landing__price-features">
                            <li>✔ {t('landing.plan_pro_f1')}</li>
                            <li>✔ {t('landing.plan_pro_f2')}</li>
                            <li>✔ {t('landing.plan_pro_f3')}</li>
                            <li>✔ {t('landing.plan_pro_f4')}</li>
                            <li>✔ {t('landing.plan_pro_f5')}</li>
                        </ul>
                        <button className="btn btn--primary btn--lg" onClick={() => navigate('/auth')}>
                            {t('landing.plan_pro_btn')}
                        </button>
                    </div>

                    {/* Enterprise */}
                    <div className="landing__price-card">
                        <div className="landing__price-header">
                            <h3>{t('landing.plan_ent_name')}</h3>
                            <div className="landing__price-amount">
                                <span className="landing__price-value">{t('landing.plan_ent_price')}</span>
                            </div>
                            <p className="landing__price-tagline">{t('landing.plan_ent_tagline')}</p>
                        </div>
                        <ul className="landing__price-features">
                            <li>✔ {t('landing.plan_ent_f1')}</li>
                            <li>✔ {t('landing.plan_ent_f2')}</li>
                            <li>✔ {t('landing.plan_ent_f3')}</li>
                            <li>✔ {t('landing.plan_ent_f4')}</li>
                        </ul>
                        <a href="mailto:support@errora.net" className="btn btn--outline btn--lg landing__price-contact">
                            {t('landing.plan_ent_btn')}
                        </a>
                    </div>
                </div>
            </section>

            {/* ─── Bottom CTA ─── */}
            <section className="landing__bottom-cta">
                <h2>{t('landing.cta_bottom_title')}</h2>
                <p>{t('landing.cta_bottom_desc')}</p>
                <button className="btn btn--primary btn--lg" onClick={() => navigate('/auth')}>
                    {t('landing.cta_bottom_btn')}
                </button>
            </section>

            {/* ─── Footer ─── */}
            <footer className="landing__footer">
                <div className="landing__footer-grid">
                    <div className="landing__footer-col">
                        <div className="landing__footer-brand">
                            <span>🐞</span> Errora
                        </div>
                        <p className="landing__footer-tagline">{t('landing.footer_tagline')}</p>
                    </div>
                    <div className="landing__footer-col">
                        <h4>{t('landing.footer_product')}</h4>
                        <a href="#features">{t('landing.nav_features')}</a>
                        <a href="#pricing">{t('landing.nav_pricing')}</a>
                        <a href="#integrations">{t('landing.nav_integrations')}</a>
                    </div>
                    <div className="landing__footer-col">
                        <h4>{t('landing.footer_developers')}</h4>
                        <a href="#how">{t('landing.nav_how')}</a>
                        <a href="#demo">{t('landing.footer_demo')}</a>
                    </div>
                    <div className="landing__footer-col">
                        <h4>{t('landing.footer_legal')}</h4>
                        <Link to="/privacy">Privacy Policy</Link>
                        <Link to="/terms">Terms of Use</Link>
                        <Link to="/dpa">DPA</Link>
                    </div>
                </div>
                <div className="landing__footer-bottom">
                    <p>Errora © {new Date().getFullYear()} · {t('landing.footer_made_with')}</p>
                </div>
            </footer>
        </div>
    );
}
