'use client';
import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { getTranslation } from '@/lib/translations';

export default function Login() {
    const router = useRouter();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const searchParams = useSearchParams();
    const lang = searchParams.get('lang') || 'uz';

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await res.json();
            if (data.success) {
                router.push(`/admin?lang=${lang}`);
                router.refresh();
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError(getTranslation(lang, 'error_generic'));
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div className="analysis-card login-card" style={{ maxWidth: '400px', width: '100%', padding: '2.5rem', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '1rem', right: '1rem', display: 'flex', gap: '0.5rem' }}>
                    {['uz', 'ru', 'en'].map(l => (
                        <a key={l} href={`?lang=${l}`} className={`lang-btn ${lang === l ? 'active' : ''}`} style={{ textDecoration: 'none', color: lang===l ? 'white' : 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600, padding: '0.2rem 0.4rem', borderRadius: '0.3rem', transition: 'all 0.2s', border: '1px solid var(--glass-border)', background: lang===l ? 'var(--primary)' : 'transparent', borderColor: lang===l ? 'var(--primary)' : 'var(--glass-border)' }}>
                            {l.toUpperCase()}
                        </a>
                    ))}
                </div>
                
                <div className="card-title" style={{ justifyContent: 'center', marginBottom: '2rem' }}>
                    <div style={{ width: '40px', height: '40px',WebkitMaskImage: 'url(/header_logo.png)', WebkitMaskSize: 'contain', WebkitMaskRepeat: 'no-repeat', WebkitMaskPosition: 'center', backgroundColor: 'white' }}></div>
                    <span>{getTranslation(lang, 'login_title')}</span>
                </div>
                
                {error && <p style={{ color: 'var(--error)', marginBottom: '1rem', textAlign: 'center' }}>{error}</p>}
                
                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{getTranslation(lang, 'label_username')}</label>
                        <input type="text" value={username} onChange={e=>setUsername(e.target.value)} required style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '0.8rem', color: 'white', fontSize: '1rem' }} />
                    </div>
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', color: 'var(--text-muted)' }}>{getTranslation(lang, 'label_password')}</label>
                        <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required style={{ width: '100%', padding: '1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', borderRadius: '0.8rem', color: 'white', fontSize: '1rem' }} />
                    </div>
                    <button type="submit" disabled={isLoading} className="btn btn-glow" style={{ width: '100%' }}>
                        {isLoading ? '...' : getTranslation(lang, 'login_btn')}
                    </button>
                    <div style={{ marginTop: '1.5rem', textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        *(Birinchi bo'lib kiritgan foydalanuvchi Admin sifatida avtomatik ro'yxatdan o'tadi)
                    </div>
                </form>
            </div>
        </div>
    );
}
