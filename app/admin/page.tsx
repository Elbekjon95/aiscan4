import React from 'react';
export const dynamic = 'force-dynamic';
import connectToDatabase from '@/lib/mongodb';
import RequestModel from '@/lib/models/Request';
import { getTranslation } from '@/lib/translations';
import Link from 'next/link';
import { FileText, Network, ShoppingCart, Eye } from 'lucide-react';
import ChartComponent from './ChartComponent'; // Client side chart component

export default async function AdminDashboard({ searchParams }: { searchParams: { tab?: string, page?: string, lang?: string } }) {
    await connectToDatabase();
    
    // Await searchParams properly (Next 15 standard)
    const sParams = await searchParams;
    const tab = sParams.tab || 'document';
    const pageStr = sParams.page || '1';
    const lang = sParams.lang || 'uz';

    const page = parseInt(pageStr, 10);
    const limit = 10;
    const skip = (page - 1) * limit;

    const totalRequests = await RequestModel.countDocuments({ analysis_type: tab });
    
    let avgScore = '0%';
    let avgLabel = getTranslation(lang, 'stats_avg');
    let titleBadge = '';

    if (tab === 'document') {
        const stats = await RequestModel.aggregate([
            { $match: { analysis_type: 'document' } },
            { $group: { _id: null, avg_score: { $avg: '$analysis_score' } } }
        ]);
        if (stats.length > 0) {
            avgScore = Math.round(stats[0].avg_score) + '%';
        }
        titleBadge = 'Hujjatlar';
    } else if (tab === 'affiliation') {
        const stats = await RequestModel.countDocuments({ 
            analysis_type: 'affiliation', 
            affiliation_status: { $in: ['direct_affiliation', 'suspected_collusion'] } 
        });
        avgScore = stats.toString();
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
            analysis_type: tab,
            created_at: { $gte: start, $lte: end }
        });
        const monthLabel = start.toLocaleString('en-US', { month: 'short' });
        monthlyStats[monthLabel] = count;
    }

    const recentRequests = await RequestModel.find({ analysis_type: tab })
        .sort({ created_at: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    const totalPages = Math.ceil(totalRequests / limit);

    return (
        <div className="dashboard-container" style={{ padding: '2rem 5%', maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', justifyContent: 'center' }}>
                <Link href={`?tab=document&lang=${lang}`} className={`btn ${tab === 'document' ? 'btn-glow' : 'btn-secondary'}`} style={{ fontSize: '1rem', padding: '0.8rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} /> Hujjat Tahlillari
                </Link>
                <Link href={`?tab=affiliation&lang=${lang}`} className={`btn ${tab === 'affiliation' ? 'btn-glow' : 'btn-secondary'}`} style={{ fontSize: '1rem', padding: '0.8rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Network size={18} /> {getTranslation(lang, 'nav_affiliation')}
                </Link>
                <Link href={`?tab=marketing&lang=${lang}`} className={`btn ${tab === 'marketing' ? 'btn-glow' : 'btn-secondary'}`} style={{ fontSize: '1rem', padding: '0.8rem 2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <ShoppingCart size={18} /> {getTranslation(lang, 'nav_marketing')}
                </Link>
            </div>

            <div className="infographic-header">
                <div className="stat-card">
                    <span className="stat-label">{getTranslation(lang, 'stats_total')}</span>
                    <span className="stat-value gradient-text">{totalRequests}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-label">{avgLabel}</span>
                    <span className="stat-value" style={{ color: 'var(--secondary)' }}>{avgScore}</span>
                </div>
            </div>

            <div className="chart-container" style={{ background: 'var(--card-bg)', borderRadius: '1.5rem', padding: '2rem', marginTop: '2rem', border: '1px solid var(--glass-border)' }}>
                <ChartComponent labels={Object.keys(monthlyStats)} data={Object.values(monthlyStats)} chartTitle={getTranslation(lang, 'chart_monthly')} />
            </div>

            <h2 style={{ marginTop: '3rem', marginBottom: '1.5rem' }}>{getTranslation(lang, 'recent_req')} ({titleBadge})</h2>
            
            <div style={{ overflowX: 'auto', background: 'var(--card-bg)', borderRadius: '1.5rem', border: '1px solid var(--glass-border)' }}>
                <table className="req-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr>
                            <th style={{ padding: '1.2rem', textAlign: 'left', borderBottom: '1px solid var(--glass-border)', color: 'var(--text-muted)' }}>{getTranslation(lang, 'table_file')}</th>
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
                    {page > 1 && <Link href={`?tab=${tab}&page=${page - 1}&lang=${lang}`} className="btn btn-secondary">&laquo; {getTranslation(lang, 'prev')}</Link>}
                    <span className="page-info" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{getTranslation(lang, 'page')} {page} / {totalPages}</span>
                    {page < totalPages && <Link href={`?tab=${tab}&page=${page + 1}&lang=${lang}`} className="btn btn-secondary">{getTranslation(lang, 'next')} &raquo;</Link>}
                </div>
            )}
        </div>
    );
}
