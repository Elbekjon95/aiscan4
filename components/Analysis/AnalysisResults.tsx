'use client';
import React from 'react';
import { getTranslation } from '@/lib/translations';
import { Search, Tag, ExternalLink, ShieldCheck, AlertTriangle, XOctagon } from 'lucide-react';

export default function AnalysisResults({ data, lang }: { data: any, lang: string }) {
    
    const getIcon = (status: string) => {
        switch(status) {
            case 'success': return <ShieldCheck color="var(--success)" />;
            case 'warning': return <AlertTriangle color="var(--warning)" />;
            case 'danger': return <XOctagon color="var(--error)" />;
            default: return <Search />;
        }
    };

    const getVerdictStyle = (verdict: string) => {
        switch(verdict) {
            case 'none': return { bg: 'rgba(16, 185, 129, 0.15)', color: 'var(--success)', border: 'var(--success)' };
            case 'suspected': return { bg: 'rgba(245, 158, 11, 0.15)', color: 'var(--warning)', border: 'var(--warning)' };
            case 'confirmed': return { bg: 'rgba(239, 68, 68, 0.15)', color: 'var(--error)', border: 'var(--error)' };
            default: return { bg: 'rgba(255,255,255,0.1)', color: 'white', border: 'var(--glass-border)' };
        }
    };

    const getSeverityColor = (sev: string) => {
        switch(sev) {
            case 'low': return '#6b7280';
            case 'medium': return 'var(--warning)';
            case 'high': return 'var(--error)';
            case 'critical': return '#dc2626';
            default: return 'var(--text-muted)';
        }
    };

    return (
        <div className="analysis-grid">
            {data.is_cached && (
                <div style={{ textAlign: 'center', color: 'var(--success)', gridColumn: '1 / -1', marginBottom: '1rem', fontStyle: 'italic' }}>
                    <ShieldCheck size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> {getTranslation(lang, 'cache_hint')}
                </div>
            )}

            <div style={{ gridColumn: '1 / -1', marginBottom: '1rem' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{getTranslation(lang, 'label_main')}</h2>
            </div>

            {/* Optimized Version Button */}
            {data.corrected_version && (
                <div style={{ gridColumn: '1 / -1', marginBottom: '2rem' }}>
                    <button 
                        className="btn btn-glow btn-secondary" 
                        style={{ width: '100%', padding: '1.2rem', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.8rem', border: '1px solid var(--secondary)', background: 'rgba(212, 175, 55, 0.05)', color: 'var(--secondary)' }}
                    >
                        <ShieldCheck size={24} />
                        {getTranslation(lang, 'btn_view_optimized')}
                    </button>
                </div>
            )}

            <div className="infographic-header" style={{ gridColumn: '1 / -1' }}>
                <div className="stat-card">
                    <span className="stat-label">{getTranslation(lang, 'total_score')}</span>
                    <span className="stat-value">{data.score || data.total_score || 0}%</span>
                    <div className="progress-container"><div className="progress-bar" style={{ width: `${data.score || data.total_score || 0}%`, background: 'var(--primary)' }}></div></div>
                </div>
                <div className="stat-card">
                    <span className="stat-label">{getTranslation(lang, 'compliance_score')}</span>
                    <span className="stat-value" style={{ color: '#22c55e' }}>{data.compliance_score || data.complianceScore || 0}%</span>
                    <div className="progress-container"><div className="progress-bar" style={{ width: `${data.compliance_score || data.complianceScore}%`, background: '#22c55e' }}></div></div>
                </div>
                <div className="stat-card">
                    <span className="stat-label">{getTranslation(lang, 'favoritism_score')}</span>
                    <span className="stat-value" style={{ color: 'var(--warning)' }}>{data.favoritism_score || data.favoritismScore || 0}%</span>
                    <div className="progress-container"><div className="progress-bar" style={{ width: `${data.favoritism_score || data.favoritismScore}%`, background: 'var(--warning)' }}></div></div>
                </div>
            </div>

            {/* Identified brands */}
            {data.identified_brands && data.identified_brands.length > 0 && (
                <div className="analysis-card warning" style={{ background: 'rgba(30, 41, 59, 0.4)' }}>
                    <div className="card-title">
                        <Tag />
                        <span>{getTranslation(lang, 'brands_title')}</span>
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '1rem' }}>
                        {data.identified_brands.map((b: any, idx: number) => (
                            <div key={idx} style={{ 
                                padding: '0.5rem 1.2rem', borderRadius: '2rem', fontSize: '0.9rem',
                                background: 'rgba(239, 68, 68, 0.05)',
                                border: '1px solid #ef4444',
                                display: 'flex', alignItems: 'center', gap: '0.5rem'
                            }}>
                                <strong style={{ color: 'white' }}>{b.brand}</strong>
                                <span style={{ color: '#94a3b8' }}>{b.mentions || 1}x</span>
                                <AlertTriangle size={14} color="#ef4444" />
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Favoritism Analysis Card */}
            {data.favoritism_evidence && data.favoritism_evidence.length > 0 && (
                <div className="analysis-card danger">
                    <div className="card-title">
                        <Search />
                        <span>{getTranslation(lang, 'favoritism_title')}</span>
                        <span style={{ 
                            marginLeft: 'auto', padding: '0.4rem 1.2rem', borderRadius: '2rem', fontSize: '0.85rem', fontWeight: 700,
                            background: 'rgba(212, 175, 55, 0.05)', 
                            color: 'var(--secondary)', 
                            border: '1px solid var(--secondary)' 
                        }}>
                            {getTranslation(lang, 'label_caution')}
                        </span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', marginTop: '1.5rem' }}>
                        {data.favoritism_evidence.map((ev: any, idx: number) => (
                            <div key={idx} style={{ 
                                background: 'rgba(30, 41, 59, 0.6)', borderRadius: '0.8rem', padding: '1.5rem',
                                borderLeft: '3px solid #6b7280'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                                    <span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 600 }}>{getTranslation(lang, 'label_snippet')}</span>
                                    <span style={{ color: '#ef4444', fontSize: '0.8rem', fontWeight: 800 }}>{ev.severity?.toUpperCase()}</span>
                                </div>
                                <blockquote style={{ color: '#94a3b8', fontStyle: 'italic', marginBottom: '1rem', borderLeft: '1px solid rgba(255,255,255,0.1)', paddingLeft: '1rem' }}>
                                    "{ev.quote}"
                                </blockquote>
                                <p style={{ fontSize: '1rem', lineHeight: '1.6' }}>{ev.reason}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Sections */}
            {data.sections?.map((section: any, idx: number) => (
                <div key={idx} className={`analysis-card ${section.status}`}>
                    <div className="card-title">
                        {getIcon(section.status)}
                        <span>{section.title}</span>
                    </div>
                    <div className="analysis-content">
                        <p>{section.content}</p>
                        {section.details && section.details.length > 0 && (
                            <ul className="detail-list">
                                {section.details.map((d: string, dIdx: number) => <li key={dIdx}>{d}</li>)}
                            </ul>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
