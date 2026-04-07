'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { getTranslation } from '@/lib/translations';
import { FileText, Network, ShoppingCart, LogIn, LayoutDashboard } from 'lucide-react';

interface NavbarProps {
    isAdmin?: boolean;
}

export default function Navbar({ isAdmin = false }: NavbarProps) {
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
                {pathname.startsWith('/admin') ? (
                    <>
                        <Link href={`/admin?lang=${lang}`} className={isCurrent('/admin') ? 'active' : ''}>
                            <LayoutDashboard size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                            {getTranslation(lang, 'nav_dashboard')}
                        </Link>
                        {isAdmin && (
                            <>
                                <Link href={`/admin/docs?lang=${lang}`} className={isCurrent('/admin/docs') ? 'active' : ''}>{getTranslation(lang, 'nav_docs')}</Link>
                                <Link href={`/admin/users?lang=${lang}`} className={isCurrent('/admin/users') ? 'active' : ''}>{getTranslation(lang, 'nav_users')}</Link>
                                <Link href={`/admin/blacklist?lang=${lang}`} className={isCurrent('/admin/blacklist') ? 'active' : ''}>{getTranslation(lang, 'nav_blacklist')}</Link>
                            </>
                        )}
                        <Link href={`/?lang=${lang}`}>{getTranslation(lang, 'nav_site')}</Link>
                        <button 
                            type="button" 
                            onClick={async () => {
                                await fetch('/api/auth/logout', { method: 'POST' });
                                router.push(`/admin/login?lang=${lang}`);
                                router.refresh();
                            }}
                            style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: '0.9rem', fontWeight: 600 }}
                        >
                            {getTranslation(lang, 'nav_logout')}
                        </button>
                    </>
                ) : (
                    <>
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
                        <Link href={`/admin/login?lang=${lang}`} style={{ color: 'var(--text-muted)' }}>
                            <LogIn size={18} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                            Admin
                        </Link>
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
