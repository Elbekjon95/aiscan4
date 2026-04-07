'use client';
import React, { useState } from 'react';
import Navbar from '@/components/Layout/Navbar';
import Footer from '@/components/Layout/Footer';
import LoaderWrapper from '@/components/UI/LoaderWrapper';
import { getTranslation } from '@/lib/translations';
import { UploadCloud, ShoppingCart, Globe, Phone, Mail, ExternalLink, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

export default function Marketing() {
    const searchParams = useSearchParams();
    const lang = searchParams.get('lang') || 'uz';

    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [statusText, setStatusText] = useState('');
    const [resultData, setResultData] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            const ext = selected.name.split('.').pop()?.toLowerCase();
            if (ext !== 'pdf' && ext !== 'docx') {
                setError(getTranslation(lang, 'error_format'));
                return;
            }
            setFile(selected);
            setError(null);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const selected = e.dataTransfer.files[0];
            const ext = selected.name.split('.').pop()?.toLowerCase();
            if (ext !== 'pdf' && ext !== 'docx') {
                setError(getTranslation(lang, 'error_format'));
                return;
            }
            setFile(selected);
            setError(null);
        }
    };

    const startAnalysis = async () => {
        if (!file) return;

        setIsLoading(true);
        setError(null);
        setStatusText(getTranslation(lang, 'status_reading'));

        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('lang', lang);

            setTimeout(() => setStatusText(getTranslation(lang, 'market_status_searching')), 2000);

            const response = await fetch('/api/analyze-marketing', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(data.error || getTranslation(lang, 'error_generic'));
            }

            setResultData(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
            setStatusText('');
        }
    };

    return (
        <>
            <Navbar />
            <LoaderWrapper isLoading={isLoading} text={statusText} />
            
            <div className="container">
                <div className="hero" style={{ textAlign: 'center', marginBottom: '3rem' }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '1rem', fontWeight: 700 }}>{getTranslation(lang, 'market_hero_title')}</h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.2rem', maxWidth: '800px', margin: '0 auto' }}>{getTranslation(lang, 'market_hero_subtitle')}</p>
                </div>

                {!resultData && (
                    <section className="upload-container" id="drop-zone" onDragOver={(e) => e.preventDefault()} onDrop={handleDrop}>
                        <input type="file" id="file" accept=".pdf,.docx" style={{ display: 'none' }} onChange={handleFileChange} />
                        {!file ? (
                            <div className="upload-box" onClick={() => document.getElementById('file')?.click()} style={{ cursor: 'pointer' }}>
                                <ShoppingCart className="upload-icon" size={64} color="var(--primary)" />
                                <h3>{getTranslation(lang, 'market_upload_title')}</h3>
                                <p>{getTranslation(lang, 'upload_hint')}</p>
                                <button className="btn btn-primary">{getTranslation(lang, 'market_btn_analyze')}</button>
                            </div>
                        ) : (
                            <div id="file-info" style={{ display: 'block' }}>
                                <div className="file-card">
                                    <ShoppingCart size={24} color="var(--primary)" />
                                    <span id="file-name">{file.name}</span>
                                    <button className="btn btn-icon" onClick={() => setFile(null)}><AlertTriangle size={18} /></button>
                                </div>
                                <button onClick={startAnalysis} className="btn btn-glow">{getTranslation(lang, 'market_btn_analyze')}</button>
                            </div>
                        )}
                        {error && <div style={{ color: 'var(--error)', marginTop: '2rem', textAlign: 'center', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '1rem', border: '1px solid rgba(239, 68, 68, 0.3)' }}><AlertTriangle size={20} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.5rem' }} /> {error}</div>}
                    </section>
                )}

                <div id="results" className={!resultData ? 'hidden' : ''}>
                    {resultData && <MarketingResults data={resultData} lang={lang} />}
                </div>
            </div>
            
            <Footer />
        </>
    );
}

function MarketingResults({ data, lang }: { data: any, lang: string }) {
    const { organizations, requirements_summary } = data;

    return (
        <div className="analysis-grid">
            <div className="analysis-card" style={{ gridColumn: '1 / -1', background: 'rgba(0,0,0,0.2)', borderLeft: '5px solid var(--primary)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', marginBottom: '15px' }}>
                    <ShoppingCart color="var(--primary)" size={32} />
                    <h2 style={{ fontSize: '1.6rem', color: 'var(--primary)', margin: 0 }}>{getTranslation(lang, 'nav_marketing')}</h2>
                </div>
                <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{requirements_summary}</p>
            </div>
            
            <div style={{ gridColumn: '1 / -1', overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '1rem', border: '1px solid var(--glass-border)', padding: '1rem', marginTop: '1rem' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', minWidth: '1000px', tableLayout: 'fixed' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '200px' }}>{getTranslation(lang, 'market_table_comp')}</th>
                            <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '100px' }}>{getTranslation(lang, 'market_table_stir')}</th>
                            <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '150px' }}>{getTranslation(lang, 'market_table_location')}</th>
                            <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '220px' }}>{getTranslation(lang, 'market_table_contact')}</th>
                            <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '80px' }}>{getTranslation(lang, 'market_table_match')}</th>
                            <th style={{ padding: '0.8rem', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase', width: '200px' }}>{getTranslation(lang, 'market_table_price')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {organizations?.map((org: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: org.is_blacklisted ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                                <td style={{ padding: '0.8rem' }}>
                                    <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {org.name}
                                        {org.is_blacklisted ? <AlertCircle color="var(--error)" size={18} /> : <CheckCircle color="var(--success)" size={18} />}
                                    </div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '0.2rem' }}>
                                        <Globe size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} /> {org.country}
                                    </div>
                                    {org.is_blacklisted && (
                                        <div style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '0.3rem' }}>
                                            <strong>{getTranslation(lang, 'market_blacklist_alert')}</strong>: {org.blacklist_reason}
                                        </div>
                                    )}
                                </td>
                                <td style={{ padding: '0.8rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>{org.stir || '---'}</td>
                                <td style={{ padding: '0.8rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>{org.address || ''}</td>
                                <td style={{ padding: '0.8rem', fontSize: '0.85rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Mail size={12} color="var(--primary)" /> {org.email || ''}</span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Phone size={12} color="var(--primary)" /> {org.phone || ''}</span>
                                        {org.website && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Globe size={12} color="var(--secondary)" /> <a href={org.website} target="_blank" rel="noreferrer" style={{ color: 'var(--secondary)', textDecoration: 'underline' }}>Veb-sayt</a></span>}
                                        {org.product_url && <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><ExternalLink size={12} color="var(--success)" /> <a href={org.product_url} target="_blank" rel="noreferrer" style={{ color: 'var(--success)', textDecoration: 'underline', fontWeight: 600 }}>Mahsulotni ko'rish</a></span>}
                                    </div>
                                </td>
                                <td style={{ padding: '0.8rem' }}>
                                    <span style={{ padding: '0.3rem 0.8rem', borderRadius: '2rem', fontWeight: 700, fontSize: '0.75rem', background: org.match_percent >= 80 ? 'var(--success)' : (org.match_percent >= 50 ? 'var(--warning)' : 'var(--text-muted)'), color: 'black' }}>
                                        {org.match_percent}%
                                    </span>
                                </td>
                                <td style={{ padding: '0.8rem', fontWeight: 700, color: '#fff' }}>
                                    <div style={{ background: 'rgba(76, 99, 168, 0.2)', padding: '0.5rem', borderRadius: '0.4rem' }}>
                                        {org.market_price}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
