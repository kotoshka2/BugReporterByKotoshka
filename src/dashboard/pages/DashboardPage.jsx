import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, Navigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import SettingsPage from './SettingsPage';
import ReportsPage from './ReportsPage';

export default function DashboardPage({ session }) {
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
        }
        setClient(data);
        setLoading(false);
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
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
                        ⚙️ Настройки
                    </NavLink>
                    <NavLink to="/dashboard/reports" className={({ isActive }) => `nav-link ${isActive ? 'nav-link--active' : ''}`}>
                        📋 Репорты
                    </NavLink>
                </nav>

                <div className="sidebar__footer">
                    <div className="sidebar__user">{session.user.email}</div>
                    <button onClick={handleLogout} className="btn btn--ghost btn--sm">
                        Выйти
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="dashboard__main">
                <Routes>
                    <Route path="settings" element={<SettingsPage client={client} onUpdate={fetchClient} />} />
                    <Route path="reports" element={<ReportsPage client={client} />} />
                    <Route path="*" element={<Navigate to="settings" replace />} />
                </Routes>
            </main>
        </div>
    );
}
