import React from 'react';
export const dynamic = 'force-dynamic';
import connectToDatabase from '@/lib/mongodb';
import RequestModel from '@/lib/models/Request';
import AirportModel from '@/lib/models/Airport';
import { getTranslation } from '@/lib/translations';
import { getSession } from '@/lib/auth';
import Link from 'next/link';
import { FileText, Network, ShoppingCart, Eye, BarChart3, Activity, AlertTriangle } from 'lucide-react';
import ChartComponent from './ChartComponent'; // Client side chart component

export default async function AdminDashboard({ searchParams }: { searchParams: { tab?: string, page?: string, lang?: string, airport?: string } }) {
    await connectToDatabase();
    
    const session = await getSession();
    const sParams = await searchParams;
    const tab = sParams.tab || 'document';
    const pageStr = sParams.page || '1';
    const lang = sParams.lang || 'uz';
    const selectedAirport = sParams.airport || '';

    const page = parseInt(pageStr, 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    // Filter by airport logic
    let filter: any = { analysis_type: tab };
    if (session.role === 'super_admin') {
        if (selectedAirport) filter.airport = selectedAirport;
    } else {
        filter.airport = session.airport || 'TAS';
    }

    const totalRequests = await RequestModel.countDocuments(filter);
    
    let avgScore = '0%';
    let riskCount = 0;
    let avgLabel = getTranslation(lang, 'stats_avg');
    let titleBadge = '';

    if (tab === 'document') {
        const stats = await RequestModel.aggregate([
            { $match: { ...filter, analysis_type: 'document' } },
            { $group: { _id: null, avg_score: { $avg: '$analysis_score' } } }
        ]);
        if (stats.length > 0) {
            avgScore = Math.round(stats[0].avg_score) + '%';
        }
        titleBadge = 'Hujjatlar';
    } else if (tab === 'affiliation') {
        riskCount = await RequestModel.countDocuments({ 
            ...filter,
            analysis_type: 'affiliation', 
            affiliation_status: { $in: ['direct_affiliation', 'suspected_collusion'] } 
        });
        avgScore = riskCount.toString();
        avgLabel = "Shubhali/Xavfli Holatlar";
        titleBadge = 'Affiliatsiya';
    } else {
        avgScore = "---";
        avgLabel = "Marketing qidiruvlari";
        titleBadge = 'Marketing';
    }

    // Monthly chart data (last 6 months)
    const monthlyStats: any = {};
    const d = new Date();
    for (let i = 5; i >= 0; i--) {
        const start = new Date(d.getFullYear(), d.getMonth() - i, 1);
        const end = new Date(d.getFullYear(), d.getMonth() - i + 1, 0);
        const count = await RequestModel.countDocuments({
            ...filter,
            analysis_type: tab,
            created_at: { $gte: start, $lte: end }
        });
        const monthLabel = start.toLocaleString('en-US', { month: 'short' });
        monthlyStats[monthLabel] = count;
    }

    const recentRequests = await RequestModel.find(filter)
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const totalPages = Math.ceil(totalRequests / limit);

    const airportsData = await AirportModel.find({ is_active: true }).sort({ type: 1, name: 1 }).lean();
    const airports = [
        { code: '', name: 'Barcha Aeroportlar' },
        ...airportsData.map((ap: any) => ({ code: ap.code, name: `${ap.name} (${ap.code})` }))
    ];

    // Airport Specific Activity for Super Admin (if no airport is selected)
    let airportActivity: any[] = [];
    if (session.role === 'super_admin' && !selectedAirport) {
        airportActivity = await RequestModel.aggregate([
            { $group: { _id: '$airport', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
        ]);
    }

    return (
        <div className="dashboard-container" style={{ padding: '2rem 5%', maxWidth: '1400px', margin: '0 auto' }}>
            {session.role === 'super_admin' && (
                <div style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', background: 'var(--card-bg)', padding: '1rem', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
                    <span style={{ fontWeight: 'bold', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <BarChart3 size={18} /> Aeroportni tanlang:
                    </span>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {airports.map(ap => (
                            <Link 
                                key={ap.code} 
                                href={`?tab=${tab}&lang=${lang}&airport=${ap.code}`}
                                className={`btn ${selectedAirport === ap.code ? 'btn-glow' : 'btn-secondary'}`}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem' }}
                            >
                                {ap.name}
                            </Link>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center' }}>
                <Link href={`?tab=document&lang=${lang}&airport=${selectedAirport}`} className={`btn ${tab === 'document' ? 'btn-glow' : 'btn-secondary'}`} style={{ fontSize: '1rem', padding: '0.8rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} /> Hujjat Tahlillari
                </Link>
                <Link href={`?tab=affiliation&lang=${lang}&airport=${selectedAirport}`} className={`btn ${tab === 'affiliation' ? 'btn-glow' : 'btn-secondary'}`} style={{ fontSize: '1rem', padding: '0.8rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Network size={18} /> {getTranslation(lang, 'nav_affiliation')}
                </Link>
                <Link href={`?tab=marketing&lang=${lang}&airport=${selectedAirport}`} className={`btn ${tab === 'marketing' ? 'btn-glow' : 'btn-secondary'}`} style={{ fontSize: '1rem', padding: '0.8rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingCart size={18} /> {getTranslation(lang, 'nav_marketing')}
                </Link>
            </div>

            <div className="infographic-header" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="stat-card">
                    <span className="stat-label">{getTranslation(lang, 'stats_total')} {selectedAirport ? `(${selectedAirport})` : `(Jami)`}</span>
                    <span className="stat-value gradient-text">{totalRequests}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">{avgLabel}</span>
                    <span className="stat-value" style={{ color: 'var(--secondary)' }}>{avgScore}</span>
                </div>
                {session.role === 'super_admin' && !selectedAirport && (
                    <div className="stat-card">
                        <span className="stat-label">Aktiv Filiallar</span>
                        <span className="stat-value" style={{ color: 'var(--primary)' }}>{airportActivity.length}</span>
                    </div>
                )}
                {riskCount > 0 && (
                    <div className="stat-card" style={{ borderColor: 'var(--error)' }}>
                        <span className="stat-label" style={{ color: 'var(--error)' }}>Xavfli holatlar</span>
                        <span className="stat-value" style={{ color: 'var(--error)' }}>{Math.round((riskCount / totalRequests) * 100)}%</span>
                    </div>
                )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: session.role === 'super_admin' && !selectedAirport ? '2fr 1fr' : '1fr', gap: '2rem', marginTop: '2rem' }}>
                <div className="chart-container" style={{ background: 'var(--card-bg)', borderRadius: '1.5rem', padding: '2rem', border: '1px solid var(--glass-border)' }}>
                    <ChartComponent labels={Object.keys(monthlyStats)} data={Object.values(monthlyStats)} chartTitle={getTranslation(lang, 'chart_monthly')} />
                </div>

                {session.role === 'super_admin' && !selectedAirport && (
                    <div style={{ background: 'var(--card-bg)', borderRadius: '1.5rem', padding: '2rem', border: '1px solid var(--glass-border)' }}>
                        <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Activity size={20} /> Aeroportlar Aktivligi</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            {airportActivity.slice(0, 5).map((act: any) => (
                                <div key={act._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ fontWeight: 500 }}>{act._id || 'Noma\'lum'}</span>
                                    <span className="badge secondary">{act.count} so'rov</span>
                                </div>
                            ))}
                            {airportActivity.length > 5 && <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>+ yana {airportActivity.length - 5} ta aeroport</p>}
                        </div>
                    </div>
                )}
            </div>

            <h2 style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>{getTranslation(lang, 'recent_req')} ({titleBadge})</h2>
            
            <div style={{ overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '1.5rem', border: '1px solid var(--glass-border)' }}>
                <table className="req-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '1.2rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>{getTranslation(lang, 'table_file')}</th>
                            <th style={{ padding: '1.2rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>Aeroport</th>
                            {tab === 'document' && (
                                <>
                                    <th style={{ padding: '1.2rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>{getTranslation(lang, 'table_score')}</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>{getTranslation(lang, 'table_comp')}</th>
                                </>
                            )}
                            {tab === 'affiliation' && (
                                <>
                                    <th style={{ padding: '1.2rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>Xavf Holati</th>
                                    <th style={{ padding: '1.2rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>Dalillar soni</th>
                                </>
                            )}
                            {tab === 'marketing' && (
                                <th style={{ padding: '1.2rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>Tashkilotlar soni</th>
                            )}
                            <th style={{ padding: '1.2rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>{getTranslation(lang, 'table_date')}</th>
                            <th style={{ padding: '1.2rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>{getTranslation(lang, 'table_actions')}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {recentRequests.map((row: any) => {
                            let badge = 'success';
                            let lbl = "Xavf yo'q";
                            if (row.affiliation_status === 'suspected_collusion') { badge = 'warning'; lbl = 'Shubhali'; }
                            if (row.affiliation_status === 'direct_affiliation') { badge = 'danger'; lbl = 'Tasdiqlandi'; }
                            
                            const linksCount = row.full_analysis?.links?.length || 0;
                            const orgsCount = row.full_analysis?.organizations?.length || 0;

                            const fileName = row.file_name?.length > 50 ? row.file_name.substring(0, 50) + '...' : row.file_name;

                            return (
                                <tr key={row._id.toString()}>
                                    <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{fileName}</td>
                                    <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><span className="badge secondary">{row.airport || 'TAS'}</span></td>
                                    {tab === 'document' && (
                                        <>
                                            <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><span className="badge success">{row.analysis_score}%</span></td>
                                            <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{row.compliance_score}%</td>
                                        </>
                                    )}
                                    {tab === 'affiliation' && (
                                        <>
                                            <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}><span className={`badge ${badge}`}>{lbl}</span></td>
                                            <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{linksCount} ta</td>
                                        </>
                                    )}
                                    {tab === 'marketing' && (
                                        <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{orgsCount} ta olindi</td>
                                    )}
                                    <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>{new Date(row.created_at).toLocaleString()}</td>
                                    <td style={{ padding: '1.2rem', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                        <Link href={`/admin/view/${row._id}?lang=${lang}`} className="btn-icon" style={{ display: 'inline-flex', padding: '0.4rem', background: 'rgba(255,255,255,0.1)', borderRadius: '0.4rem', color: 'white' }}>
                                            <Eye size={18} />
                                        </Link>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div className="pagination" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '2rem', marginBottom: '2rem' }}>
                    {page > 1 && <Link href={`?tab=${tab}&page=${page - 1}&lang=${lang}&airport=${selectedAirport}`} className="btn btn-secondary">&laquo; {getTranslation(lang, 'prev')}</Link>}
                    <span className="page-info" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{getTranslation(lang, 'page')} {page} / {totalPages}</span>
                    {page < totalPages && <Link href={`?tab=${tab}&page=${page + 1}&lang=${lang}&airport=${selectedAirport}`} className="btn btn-secondary">{getTranslation(lang, 'next')} &raquo;</Link>}
                </div>
            )}
        </div>
    );
}
