import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function DPA() {
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
                <h1 className="legal-page__title">Data Processing Agreement (DPA)</h1>
                <p className="legal-page__updated">Last updated: February 19, 2026</p>

                <div className="legal-page__content">
                    <h2>1. Introduction</h2>
                    <p>
                        This Data Processing Agreement ("DPA") forms part of the Terms of Use between you
                        ("Data Controller") and Errora ("Data Processor") for the processing of personal
                        data in connection with the bug reporting service.
                    </p>

                    <h2>2. Definitions</h2>
                    <ul>
                        <li><strong>Personal Data</strong> — any information relating to an identified or identifiable natural person</li>
                        <li><strong>Processing</strong> — any operation performed on personal data</li>
                        <li><strong>Data Controller</strong> — the entity that determines the purposes and means of processing</li>
                        <li><strong>Data Processor</strong> — the entity that processes data on behalf of the Controller</li>
                        <li><strong>Sub-processor</strong> — a third party engaged by the Processor to process data</li>
                    </ul>

                    <h2>3. Scope of Processing</h2>
                    <p>The Processor processes Personal Data on behalf of the Controller for the following purposes:</p>
                    <ul>
                        <li>Receiving and storing bug reports submitted through the widget</li>
                        <li>Delivering reports to configured channels (Telegram, Notion)</li>
                        <li>Storing screenshots and metadata associated with reports</li>
                        <li>Providing access to reports through the dashboard</li>
                    </ul>

                    <h2>4. Types of Personal Data Processed</h2>
                    <ul>
                        <li>IP addresses of end-users submitting reports</li>
                        <li>Browser and operating system information</li>
                        <li>Screenshots that may contain personal data</li>
                        <li>Free-text comments provided by end-users</li>
                        <li>Page URLs visited by end-users</li>
                    </ul>

                    <h2>5. Obligations of the Processor</h2>
                    <p>The Processor shall:</p>
                    <ul>
                        <li>Process Personal Data only on documented instructions from the Controller</li>
                        <li>Ensure that persons authorized to process data are bound by confidentiality</li>
                        <li>Implement appropriate technical and organizational security measures</li>
                        <li>Assist the Controller in responding to data subject requests</li>
                        <li>Delete or return all Personal Data upon termination of the agreement</li>
                        <li>Make available all information necessary to demonstrate compliance</li>
                    </ul>

                    <h2>6. Sub-processors</h2>
                    <p>The following sub-processors are currently engaged:</p>
                    <table className="legal-page__table">
                        <thead>
                            <tr>
                                <th>Sub-processor</th>
                                <th>Purpose</th>
                                <th>Location</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Supabase</td>
                                <td>Data storage and authentication</td>
                                <td>USA / EU</td>
                            </tr>
                            <tr>
                                <td>Cloudflare</td>
                                <td>API processing and CDN</td>
                                <td>Global</td>
                            </tr>
                            <tr>
                                <td>Telegram</td>
                                <td>Bug report delivery (optional)</td>
                                <td>UAE / Global</td>
                            </tr>
                            <tr>
                                <td>Notion</td>
                                <td>Bug report tickets (optional)</td>
                                <td>USA</td>
                            </tr>
                        </tbody>
                    </table>

                    <h2>7. Security Measures</h2>
                    <p>The Processor implements the following security measures:</p>
                    <ul>
                        <li>Encryption of data in transit (TLS/SSL)</li>
                        <li>Encryption of data at rest</li>
                        <li>Access controls and authentication</li>
                        <li>Regular security assessments</li>
                        <li>Incident response procedures</li>
                    </ul>

                    <h2>8. Data Breach Notification</h2>
                    <p>
                        In the event of a personal data breach, the Processor shall notify the Controller
                        without undue delay and no later than 72 hours after becoming aware of the breach.
                    </p>

                    <h2>9. Data Transfers</h2>
                    <p>
                        Where Personal Data is transferred outside the European Economic Area (EEA), the
                        Processor ensures that appropriate safeguards are in place, such as Standard
                        Contractual Clauses (SCCs) or adequacy decisions.
                    </p>

                    <h2>10. Duration and Termination</h2>
                    <p>
                        This DPA remains in effect for the duration of the service agreement. Upon termination,
                        the Processor will delete all Personal Data within 30 days unless retention is required
                        by applicable law.
                    </p>

                    <h2>11. Contact</h2>
                    <p>
                        For questions regarding data processing, contact us at{' '}
                        <a href="mailto:dpa@errora.io">dpa@errora.io</a>.
                    </p>
                </div>
            </section>

            <footer className="landing__footer">
                <p>Errora © {new Date().getFullYear()} · Сделано с 🐞</p>
            </footer>
        </div>
    );
}
