import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function PrivacyPolicy() {
    const navigate = useNavigate();

    return (
        <div className="landing">
            {/* Background Shapes */}
            <div className="background-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>

            <header className="landing__hero" style={{ minHeight: 'auto', paddingBottom: 0 }}>
                <nav className="landing__nav">
                    <div className="landing__logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                        <span>🐞</span>
                        <h1>Errora</h1>
                    </div>
                    <button className="btn btn--outline btn--sm" onClick={() => navigate('/auth')}>
                        Войти
                    </button>
                </nav>
            </header>

            <section className="legal-page">
                <h1 className="legal-page__title">Privacy Policy</h1>
                <p className="legal-page__updated">Last updated: February 19, 2026</p>

                <div className="legal-page__content">
                    <h2>1. Introduction</h2>
                    <p>
                        Welcome to Errora ("we", "our", "us"). We are committed to protecting your personal
                        information and your right to privacy. This Privacy Policy explains how we collect, use,
                        disclose, and safeguard your information when you use our service.
                    </p>

                    <h2>2. Information We Collect</h2>
                    <h3>2.1 Account Information</h3>
                    <p>When you register, we collect your email address and authentication credentials.</p>

                    <h3>2.2 Bug Report Data</h3>
                    <p>
                        When end-users submit bug reports through the widget, the following data may be collected:
                    </p>
                    <ul>
                        <li>Screenshots of the web page</li>
                        <li>User comments and descriptions</li>
                        <li>Page URL where the report was submitted</li>
                        <li>Browser type and version</li>
                        <li>Operating system</li>
                        <li>Screen resolution</li>
                    </ul>

                    <h3>2.3 Usage Data</h3>
                    <p>
                        We automatically collect certain information when you visit our platform, including your
                        IP address, browser type, and pages visited.
                    </p>

                    <h2>3. How We Use Your Information</h2>
                    <p>We use the collected information to:</p>
                    <ul>
                        <li>Provide, operate, and maintain the service</li>
                        <li>Deliver bug reports to your configured channels (Telegram, Notion)</li>
                        <li>Improve and personalize the user experience</li>
                        <li>Communicate with you about service updates</li>
                        <li>Ensure security and prevent fraud</li>
                    </ul>

                    <h2>4. Data Storage and Security</h2>
                    <p>
                        Your data is stored securely using Supabase infrastructure. We implement appropriate
                        technical and organizational measures to protect your personal data against unauthorized
                        access, alteration, disclosure, or destruction.
                    </p>

                    <h2>5. Third-Party Services</h2>
                    <p>We may share data with the following third-party services based on your configuration:</p>
                    <ul>
                        <li><strong>Telegram</strong> — for delivering bug report notifications</li>
                        <li><strong>Notion</strong> — for creating bug report tickets</li>
                        <li><strong>Supabase</strong> — for data storage and authentication</li>
                        <li><strong>Cloudflare</strong> — for API processing and content delivery</li>
                    </ul>

                    <h2>6. Your Rights</h2>
                    <p>You have the right to:</p>
                    <ul>
                        <li>Access your personal data</li>
                        <li>Request correction of inaccurate data</li>
                        <li>Request deletion of your data</li>
                        <li>Object to processing of your data</li>
                        <li>Request data portability</li>
                    </ul>

                    <h2>7. Data Retention</h2>
                    <p>
                        We retain your personal data only for as long as necessary to fulfill the purposes
                        outlined in this policy. Bug report data is retained according to your account settings.
                    </p>

                    <h2>8. Contact Us</h2>
                    <p>
                        If you have any questions about this Privacy Policy, please contact us at{' '}
                        <a href="mailto:support@errora.io">support@errora.io</a>.
                    </p>
                </div>
            </section>

            <footer className="landing__footer">
                <p>Errora © {new Date().getFullYear()} · Сделано с 🐞</p>
            </footer>
        </div>
    );
}
