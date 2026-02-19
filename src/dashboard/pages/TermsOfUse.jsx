import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function TermsOfUse() {
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
                <h1 className="legal-page__title">Terms of Use</h1>
                <p className="legal-page__updated">Last updated: February 19, 2026</p>

                <div className="legal-page__content">
                    <h2>1. Acceptance of Terms</h2>
                    <p>
                        By accessing or using Errora ("the Service"), you agree to be bound by these Terms of Use.
                        If you do not agree to these terms, please do not use the Service.
                    </p>

                    <h2>2. Description of Service</h2>
                    <p>
                        Errora is a bug reporting widget that allows website owners to collect user feedback,
                        including screenshots, comments, and technical metadata. Reports can be delivered via
                        Telegram, Notion, or viewed in the Errora dashboard.
                    </p>

                    <h2>3. User Accounts</h2>
                    <p>
                        To use the Service, you must create an account. You are responsible for maintaining the
                        confidentiality of your account credentials and for all activities that occur under your
                        account.
                    </p>

                    <h2>4. Acceptable Use</h2>
                    <p>You agree not to:</p>
                    <ul>
                        <li>Use the Service for any unlawful purpose</li>
                        <li>Attempt to gain unauthorized access to our systems</li>
                        <li>Interfere with or disrupt the Service</li>
                        <li>Collect personal data of end-users without proper consent</li>
                        <li>Use the Service to distribute malware or harmful content</li>
                        <li>Reverse engineer or decompile any part of the Service</li>
                    </ul>

                    <h2>5. Data Ownership</h2>
                    <p>
                        You retain ownership of all data collected through the widget on your website.
                        We do not claim ownership of your bug reports, screenshots, or any other
                        content submitted through the Service.
                    </p>

                    <h2>6. Service Availability</h2>
                    <p>
                        We strive to maintain high availability of the Service but do not guarantee
                        uninterrupted access. We reserve the right to modify, suspend, or discontinue
                        the Service at any time with reasonable notice.
                    </p>

                    <h2>7. Limitation of Liability</h2>
                    <p>
                        To the maximum extent permitted by law, Errora shall not be liable for any indirect,
                        incidental, special, consequential, or punitive damages resulting from your use of
                        or inability to use the Service.
                    </p>

                    <h2>8. Intellectual Property</h2>
                    <p>
                        The Service, including its original content, features, and functionality, is owned by
                        Errora and is protected by international copyright, trademark, and other intellectual
                        property laws.
                    </p>

                    <h2>9. Termination</h2>
                    <p>
                        We may terminate or suspend your account at any time for violations of these Terms.
                        Upon termination, your right to use the Service will immediately cease. You may
                        request export of your data before account deletion.
                    </p>

                    <h2>10. Changes to Terms</h2>
                    <p>
                        We reserve the right to modify these Terms at any time. We will notify users of any
                        material changes via email or through the Service. Continued use of the Service after
                        changes constitutes acceptance of the new Terms.
                    </p>

                    <h2>11. Contact Us</h2>
                    <p>
                        If you have any questions about these Terms, please contact us at{' '}
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
