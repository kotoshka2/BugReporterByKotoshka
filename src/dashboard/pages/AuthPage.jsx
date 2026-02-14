import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AuthPage() {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState('');

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
                setSuccess('Аккаунт создан! Проверьте почту для подтверждения.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <span className="auth-logo">🐞</span>
                    <h1>Bug Report Widget</h1>
                    <p>{isLogin ? 'Войдите в свой аккаунт' : 'Создайте аккаунт'}</p>
                </div>

                <form onSubmit={handleSubmit} className="auth-form">
                    {!isLogin && (
                        <div className="form-group">
                            <label htmlFor="name">Имя / Компания</label>
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
                        <label htmlFor="email">Email</label>
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
                        <label htmlFor="password">Пароль</label>
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
                        {loading ? 'Загрузка…' : isLogin ? 'Войти' : 'Зарегистрироваться'}
                    </button>
                </form>

                <div className="auth-footer">
                    <button
                        className="btn btn--link"
                        onClick={() => { setIsLogin(!isLogin); setError(''); setSuccess(''); }}
                    >
                        {isLogin ? 'Нет аккаунта? Зарегистрируйтесь' : 'Уже есть аккаунт? Войдите'}
                    </button>
                </div>
            </div>
        </div>
    );
}
