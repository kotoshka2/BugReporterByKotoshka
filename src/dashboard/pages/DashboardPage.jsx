import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SettingsPage from './SettingsPage';
import IntegrationsPage from './IntegrationsPage';
import ReportsPage from './ReportsPage';
import { useTranslation } from 'react-i18next';

export default function DashboardPage({ session }) {
    const { t, i18n } = useTranslation();
    const [client, setClient] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClient();
    }, []);

    const fetchClient = async () => {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('user_id', session.user.id)
            .single();

        if (error) {
            console.error('Failed to fetch client:', error);
        } else if (data?.language && data.language !== i18n.language) {
            // Apply client's language preference on load
            i18n.changeLanguage(data.language);
            localStorage.setItem('errora_lang', data.language);
        }
        setClient(data);
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
    };

    const toggleLanguage = async () => {
        const newLang = i18n.language === 'en' ? 'ru' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('errora_lang', newLang);

        if (client?.id) {
            // Persist preference to DB
            supabase.from('clients').update({ language: newLang }).eq('id', client.id).then();
        }
    };

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div className="dashboard">
            {/* Background Shapes */}
            <div className="background-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>

            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar__logo">
                    <span>🐞</span>
                    <h2>BugWidget</h2>
                </div>

                <nav className="sidebar__nav">
                    <NavLink to="/dashboard/settings" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
                        {t('dashboard.title_settings')}
                    </NavLink>
                    <NavLink to="/dashboard/integrations" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
                        {t('dashboard.title_integrations')}
                    </NavLink>
                    <NavLink to="/dashboard/reports" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
                        {t('dashboard.title_reports')}
                    </NavLink>
                </nav>

                <div className="sidebar__footer">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <div className="sidebar__user" style={{ marginBottom: 0 }}>{session.user.email}</div>
                        <button
                            onClick={toggleLanguage}
                            title="Switch Language"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
                        >
                            {i18n.language === 'en' ? '🇺🇸' : '🇷🇺'}
                        </button>
                    </div>
                    <button onClick={handleLogout} className="btn btn--ghost btn--sm">
                        {t('dashboard.nav_logout')}
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="dashboard__main">
                <Routes>
                    <Route path="settings" element={<SettingsPage client={client} onUpdate={fetchClient} />} />
                    <Route path="integrations/*" element={<IntegrationsPage client={client} onUpdate={fetchClient} />} />
                    <Route path="reports" element={<ReportsPage client={client} />} />
                    <Route path="*" element={<Navigate to="settings" replace />} />
                </Routes>
            </main>
        </div>
    );
}
