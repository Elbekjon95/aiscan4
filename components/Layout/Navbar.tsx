'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getTranslation } from '@/lib/translations';
import { FileText, Network, ShoppingCart, LogIn, LogOut, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
    isAdmin?: boolean;
    isLoggedIn?: boolean;
    role?: string;
}

export default function Navbar({ isAdmin = false, isLoggedIn = false, role }: NavbarProps) {
    const pathname = usePathname();
    const router = useRouter();
    const searchParams = useSearchParams();
    
    const [lang, setLang] = useState('uz');
    
    useEffect(() => {
        const queryLang = searchParams.get('lang');
        if (queryLang && ['uz', 'ru', 'en'].includes(queryLang)) {
            setLang(queryLang);
            // Save to localStorage
            localStorage.setItem('aiscan_lang', queryLang);
        } else {
            const saved = localStorage.getItem('aiscan_lang') || 'uz';
            setLang(saved);
        }
    }, [searchParams]);

    const changeLanguage = (newLang: string) => {
        const newSearchParams = new URLSearchParams(searchParams.toString());
        newSearchParams.set('lang', newLang);
        router.push(`${pathname}?${newSearchParams.toString()}`);
    };

    const isCurrent = (path: string) => pathname === path;

    return (
        <nav>
            <div className="logo" style={{ cursor: 'pointer' }} onClick={() => router.push(`/?lang=${lang}`)}>
                <img src="/header_logo.png" alt="Uzbekistan Airports" style={{ height: '40px' }} />
                <span>AISCAN</span>
            </div>
            
            <div className="nav-links">
                {pathname === '/admin/login' ? (
                    null // Hide links on login page
                ) : pathname.startsWith('/admin') ? (
                    <>
                        {isAdmin && (
                            <Link href={`/admin?lang=${lang}`} className={isCurrent('/admin') ? 'active' : ''}>
                                <LayoutDashboard size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                                {getTranslation(lang, 'nav_dashboard')}
                            </Link>
                        )}
                        {isAdmin && (
                            <>
                                <Link href={`/admin/docs?lang=${lang}`} className={isCurrent('/admin/docs') ? 'active' : ''}>{getTranslation(lang, 'nav_docs')}</Link>
                                <Link href={`/admin/users?lang=${lang}`} className={isCurrent('/admin/users') ? 'active' : ''}>{getTranslation(lang, 'nav_users')}</Link>
                                {role === 'super_admin' && (
                                    <Link href={`/admin/airports?lang=${lang}`} className={isCurrent('/admin/airports') ? 'active' : ''}>Aeroportlar</Link>
                                )}
                                <Link href={`/admin/blacklist?lang=${lang}`} className={isCurrent('/admin/blacklist') ? 'active' : ''}>{getTranslation(lang, 'nav_blacklist')}</Link>
                            </>
                        )}
                        <Link href={`/?lang=${lang}`}>{getTranslation(lang, 'nav_site')}</Link>
                        {isLoggedIn || isAdmin ? (
                            <button 
                                type="button" 
                                onClick={async () => {
                                    await fetch('/api/auth/logout', { method: 'POST' });
                                    window.location.href = `/admin/login?lang=${lang}`;
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <LogOut size={18} />
                                {getTranslation(lang, 'nav_logout')}
                            </button>
                        ) : (
                            <Link href={`/admin/login?lang=${lang}`} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <LogIn size={18} />
                                {lang === 'uz' ? 'Kirish' : (lang === 'ru' ? 'Вход' : 'Login')}
                            </Link>
                        )}
                    </>
                ) : (
                    <>
                        {(role === 'admin' || role === 'super_admin') && (
                            <Link href={`/admin?lang=${lang}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: 'var(--primary)', fontWeight: 700, border: '1px solid var(--primary-glass)', padding: '4px 12px', borderRadius: '8px', marginRight: '12px', background: 'rgba(255, 215, 0, 0.05)' }}>
                                <LayoutDashboard size={18} />
                                {lang === 'uz' ? 'Admin Panel' : (lang === 'ru' ? 'Админ Панель' : 'Admin Panel')}
                            </Link>
                        )}
                        <Link href={`/?lang=${lang}`} className={isCurrent('/') ? 'active' : ''}>
                            <FileText size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                            Hujjatlar
                        </Link>
                        <Link href={`/affiliation?lang=${lang}`} className={isCurrent('/affiliation') ? 'active' : ''}>
                            <Network size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                            {getTranslation(lang, 'nav_affiliation')}
                        </Link>
                        <Link href={`/marketing?lang=${lang}`} className={isCurrent('/marketing') ? 'active' : ''}>
                            <ShoppingCart size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                            {getTranslation(lang, 'nav_marketing')}
                        </Link>
                        {isLoggedIn || isAdmin ? (
                            <button 
                                type="button" 
                                onClick={async () => {
                                    await fetch('/api/auth/logout', { method: 'POST' });
                                    window.location.href = `/admin/login?lang=${lang}`;
                                }}
                                style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}
                            >
                                <LogOut size={18} />
                                {getTranslation(lang, 'nav_logout')}
                            </button>
                        ) : (
                            <Link href={`/admin/login?lang=${lang}`} style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <LogIn size={18} />
                                {lang === 'uz' ? 'Kirish' : (lang === 'ru' ? 'Вход' : 'Login')}
                            </Link>
                        )}
                    </>
                )}
                
                <div className="lang-switcher" style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem', paddingLeft: '1rem', borderLeft: '1px solid var(--glass-border)' }}>
                    {['uz', 'ru', 'en'].map(l => (
                        <button 
                            key={l}
                            onClick={() => changeLanguage(l)} 
                            className={`lang-btn ${lang === l ? 'active' : ''}`}
                            style={{ 
                                textDecoration: 'none', color: lang === l ? 'white' : 'var(--text-muted)', 
                                fontSize: '0.85rem', fontWeight: 600, padding: '0.2rem 0.5rem', 
                                borderRadius: '0.4rem', transition: 'all 0.2s', background: lang === l ? 'var(--primary)' : 'transparent',
                                border: 'none', cursor: 'pointer'
                            }}
                        >
                            {l.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>
        </nav>
    );
}
