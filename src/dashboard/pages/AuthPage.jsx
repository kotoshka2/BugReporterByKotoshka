import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useTranslation } from 'react-i18next';

export default function AuthPage() {
    const { t, i18n } = useTranslation();
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

    const toggleLanguage = () => {
        const newLang = i18n.language === 'en' ? 'ru' : 'en';
        i18n.changeLanguage(newLang);
        localStorage.setItem('errora_lang', newLang);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        setLoading(true);

        try {
            if (isLogin) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: { data: { name } },
                });
                if (error) throw error;
                setSuccess(t('auth.success_register'));
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Background Shapes */}
            <div className="background-shapes">
                <div className="shape shape-1"></div>
                <div className="shape shape-2"></div>
                <div className="shape shape-3"></div>
            </div>

            <div className="auth-card">
                <div className="auth-header" style={{ position: 'relative' }}>
                    <button
                        onClick={toggleLanguage}
                        title="Switch Language"
                        style={{ position: 'absolute', right: 0, top: 0, background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '4px' }}
                    >
                        {i18n.language === 'en' ? '🇺🇸' : '🇷🇺'}
                    </button>
                    <span className="auth-logo">🐞</span>
                    <h1>Errora</h1>
                    <p>{isLogin ? t('auth.login_title') : t('auth.register_title')}</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="name">{t('auth.label_name')}</label>
                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Иван Иванов"
                                required={!isLogin}
                            />
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="email">{t('auth.label_email')}</label>
                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">{t('auth.label_password')}</label>
                        <input
                            id="password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            required
                            minLength={6}
                        />
                    </div>

                    {error && <div className="alert alert--error">{error}</div>}
                    {success && <div className="alert alert--success">{success}</div>}

                    <button type="submit" className="btn btn--primary" disabled={loading}>
                        {loading ? t('auth.btn_loading') : isLogin ? t('auth.btn_login') : t('auth.btn_register')}
                    </button>
                </form>

                <div className="auth-footer">
                    <button
                        className="btn btn--link"
                        onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
                    >
                        {isLogin ? t('auth.link_to_register') : t('auth.link_to_login')}
                    </button>
                </div>
            </div>
        </div>
    );
}
