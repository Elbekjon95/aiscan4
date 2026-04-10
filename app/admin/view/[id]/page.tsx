import React from 'react';
import prisma from '@/lib/prisma';
import { getTranslation } from '@/lib/translations';
import AnalysisResults from '@/components/Analysis/AnalysisResults';

export default async function AdminViewPage({ params, searchParams }: { params: { id: string }, searchParams: { lang?: string } }) {
    const sParams = await searchParams;
    const { id } = await params;
    const lang = sParams.lang || 'uz';

    const reqData = await prisma.request.findUnique({
        where: { id }
    });

    if (!reqData) {
        return <div style={{ padding: '5rem', textAlign: 'center' }}>Zapros topilmadi.</div>;
    }

    const data: any = reqData.full_analysis || {};

    return (
        <div className="view-container" style={{ maxWidth: '1300px', margin: '3rem auto', padding: '0 5%' }}>
            <div className="view-header" style={{ marginBottom: '2rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '1rem' }}>
                <h2 style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{lang === 'en' ? 'Document' : (lang === 'ru' ? 'Документ' : 'Hujjat')}: {reqData.file_name}</h2>
                <p style={{ color: 'var(--text-muted)' }}>{lang === 'en' ? 'Analysis date' : (lang === 'ru' ? 'Дата анализа' : 'Tahlil sanasi')}: {new Date(reqData.created_at).toLocaleString()} • ID: #{id}</p>
            </div>

            <div id="analysis-grid">
                {reqData.analysis_type === 'document' && <AnalysisResults data={data} lang={lang} />}
                {reqData.analysis_type === 'affiliation' && <AdminAffiliationResults data={data} lang={lang} />}
                {reqData.analysis_type === 'marketing' && <AdminMarketingResults data={data} lang={lang} />}
            </div>
        </div>
    );
}

function AdminAffiliationResults({ data, lang }: { data: any, lang: string }) {
    const { links, companies, collusion_status, summary, price_analysis } = data;
    
    let stColor = 'var(--success)'; let stText = "Xavf yo'q";
    if (collusion_status === 'suspected_collusion') { stColor = 'var(--warning)'; stText = "Shubhali (Katta ehtimol bilan til biriktirilgan)"; }
    else if (collusion_status === 'direct_affiliation') { stColor = 'var(--error)'; stText = "To'g'ridan-to'g'ri Affiliatsiya (Tasdiqlandi)"; }

    return (
        <div className="analysis-grid">
            <div className="analysis-card" style={{ gridColumn: '1/-1', background: 'rgba(0,0,0,0.2)', borderLeft: `5px solid ${stColor}` }}>
                <h2 style={{ fontSize: '1.6rem', color: stColor, margin: '0 0 15px 0' }}>{stText}</h2>
                <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>{summary || 'Xulosa mavjud emas.'}</p>
            </div>

            <h3 style={{ gridColumn: '1/-1', marginTop: '1rem' }}>Ishtirokchilar korxonalari</h3>
            {companies?.map((comp: any, idx: number) => (
                <div key={idx} className="analysis-card" style={{ padding: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>STIR: {comp.stir || '---'}</div>
                    <h4 style={{ margin: '0.5rem 0' }}>{comp.name}</h4>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Fayl: {comp.file}</div>
                </div>
            ))}

            <h3 style={{ gridColumn: '1/-1', marginTop: '2rem' }}>Yashirin Bog'liqliklar (Dalillar)</h3>
            {(!links || links.length === 0) ? (
                <div className="analysis-card success" style={{ gridColumn: '1/-1' }}>Hech qanday shubhali bog'liqlik topilmadi.</div>
            ) : (
                links.map((link: any, idx: number) => (
                    <div key={`link-${idx}`} className="analysis-card" style={{ gridColumn: '1/-1', borderLeft: `4px solid ${link.severity === 'high' ? 'var(--error)' : 'var(--warning)'}` }}>
                        <strong style={{ fontSize: '1.1rem' }}>{link.reason}</strong>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0.5rem 0' }}>Isbot turi: {link.evidence_type}</div>
                    </div>
                ))
            )}

            {price_analysis && price_analysis.length > 0 && (
                <div style={{ gridColumn: '1/-1', marginTop: '3rem' }}>
                    <h3>Narxlar Taxlili</h3>
                    <div style={{ overflowX: 'auto', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', padding: '1rem' }}>
                        <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                            <tbody>
                                {price_analysis.map((p: any, idx: number) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <td style={{ padding: '1rem', fontWeight: 600 }}>{p.item_name}</td>
                                        <td style={{ padding: '1rem', color: 'var(--info)' }}>{p.market_price}</td>
                                        <td style={{ padding: '1rem' }}>
                                            {p.quotes?.map((q: any, qIdx: number) => (
                                                <div key={qIdx} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.5rem' }}>
                                                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{q.company}</span>
                                                    <strong style={{ color: 'var(--warning)' }}>{q.price}</strong>
                                                </div>
                                            ))}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}

function AdminMarketingResults({ data, lang }: { data: any, lang: string }) {
    const { organizations, requirements_summary } = data;
    return (
        <div className="analysis-grid">
            <div className="analysis-card" style={{ gridColumn: '1/-1', background: 'rgba(0,0,0,0.2)', borderLeft: '5px solid var(--primary)' }}>
                <h2 style={{ fontSize: '1.6rem', color: 'var(--primary)', margin: '0 0 15px 0' }}>{getTranslation(lang, 'nav_marketing')}</h2>
                <p style={{ fontSize: '1.15rem', color: 'var(--text-muted)' }}>{requirements_summary}</p>
            </div>
            
            <div style={{ gridColumn: '1/-1', overflowX: 'auto', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', padding: '1rem', marginTop: '1rem' }}>
                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                            <th style={{ padding: '0.8rem', color: 'var(--text-muted)' }}>Tashkilot nomi</th>
                            <th style={{ padding: '0.8rem', color: 'var(--text-muted)' }}>STIR (INN)</th>
                            <th style={{ padding: '0.8rem', color: 'var(--text-muted)' }}>Kontaktlar</th>
                            <th style={{ padding: '0.8rem', color: 'var(--text-muted)' }}>Mos kelish</th>
                            <th style={{ padding: '0.8rem', color: 'var(--text-muted)' }}>Narx</th>
                        </tr>
                    </thead>
                    <tbody>
                        {organizations?.map((org: any, idx: number) => (
                            <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', background: org.is_blacklisted ? 'rgba(239, 68, 68, 0.05)' : 'transparent' }}>
                                <td style={{ padding: '0.8rem' }}>
                                    <div style={{ fontWeight: 700 }}>{org.name}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--primary)' }}>{org.country}</div>
                                    {org.is_blacklisted && <div style={{ fontSize: '0.75rem', color: 'var(--error)' }}>Qora ro'yxatda: {org.blacklist_reason}</div>}
                                </td>
                                <td style={{ padding: '0.8rem', fontFamily: 'monospace' }}>{org.stir || '---'}</td>
                                <td style={{ padding: '0.8rem', fontSize: '0.85rem' }}>
                                    <div>Email: {org.email}</div>
                                    <div>Tel: {org.phone}</div>
                                </td>
                                <td style={{ padding: '0.8rem', fontWeight: 700, color: org.match_percent >= 80 ? 'var(--success)' : 'var(--warning)' }}>
                                    {org.match_percent}%
                                </td>
                                <td style={{ padding: '0.8rem', fontWeight: 700, color: '#fff' }}>{org.market_price}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
