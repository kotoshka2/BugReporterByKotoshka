import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import AuthPage from './pages/AuthPage';
import DashboardPage from './pages/DashboardPage';

export default function App() {
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Get initial session
        supabase.auth.getSession().then(({ data: { session } }) => {
            setSession(session);
            setLoading(false);
        });

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (_event, session) => {
                setSession(session);
            }
        );

        return () => subscription.unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="loading-screen">
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <Routes>
            <Route
                path="/auth"
                element={session ? <Navigate to="/dashboard" replace /> : <AuthPage />}
            />
            <Route
                path="/dashboard/*"
                element={session ? <DashboardPage session={session} /> : <Navigate to="/auth" replace />}
            />
            <Route path="*" element={<Navigate to={session ? '/dashboard' : '/auth'} replace />} />
        </Routes>
    );
}
