'use client';
import { useEffect, useState } from 'react';
import { ShieldCheck, AlertTriangle, XOctagon, FileDown, CheckCircle, Calendar, User, Building2 } from 'lucide-react';

export default function ReportPage({ params }: { params: Promise<{ id: string }> }) {
    const [id, setId] = useState<string>('');
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        params.then(p => setId(p.id));
    }, [params]);

    useEffect(() => {
        if (!id) return;
        fetch(`/api/report/${id}`)
            .then(r => r.json())
            .then(d => {
                if (d.error) setError(d.error);
                else setData(d);
            })
            .catch(() => setError('Serverga ulanishda xatolik yuz berdi.'))
            .finally(() => setLoading(false));
    }, [id]);

    const handleDownloadPDF = async () => {
        if (!data) return;
        setIsDownloading(true);
        try {
            // pdfExport ni dinamik import — faqat client tomonida
            const { exportToPDF } = await import('@/lib/pdfExport');
            await exportToPDF({
                ...data.analysis,
                request_id: data.id,
                file_name: data.file_name,
                auditor_name: data.auditor_name,
                total_score: data.analysis_score,
                compliance_score: data.compliance_score,
                favoritism_score: data.favoritism_score,
            }, data.language || 'uz');
        } catch (e) {
            alert('PDF yuklab olishda xatolik yuz berdi.');
        } finally {
            setIsDownloading(false);
        }
    };

    const getScoreColor = (score: number) => {
        if (score >= 75) return '#22c55e';
        if (score >= 50) return '#f59e0b';
        return '#ef4444';
    };

    const getVerdictStyle = (verdict: string) => {
        switch (verdict) {
            case 'none': return { color: '#22c55e', label: 'Favoritizm aniqlanmadi', icon: '✅' };
            case 'suspected': return { color: '#f59e0b', label: 'Favoritizm shubhasi bor', icon: '⚠️' };
            case 'confirmed': return { color: '#ef4444', label: 'Favoritizm TASDIQLANDI', icon: '🚨' };
            default: return { color: '#94a3b8', label: verdict, icon: '📋' };
        }
    };

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleString('uz-UZ', {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    if (loading) return (
        <div style={styles.page}>
            <div style={styles.loadingBox}>
                <div style={styles.spinner} />
                <p style={{ color: '#94a3b8', marginTop: '1rem' }}>Hisobot yuklanmoqda...</p>
            </div>
        </div>
    );

    if (error) return (
        <div style={styles.page}>
            <div style={styles.errorBox}>
                <XOctagon size={48} color="#ef4444" />
                <h2 style={{ color: '#ef4444', margin: '1rem 0 0.5rem' }}>Topilmadi</h2>
                <p style={{ color: '#94a3b8' }}>{error}</p>
                <p style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                    ID: {id}
                </p>
            </div>
        </div>
    );

    if (!data) return null;

    const analysis = data.analysis || {};
    const verdict = getVerdictStyle(analysis.favoritism_verdict || 'none');

    return (
        <div style={styles.page}>
            {/* Header */}
            <header style={styles.header}>
                <div style={styles.headerInner}>
                    <div>
                        <div style={styles.logo}>
                            <ShieldCheck size={28} color="#6366f1" />
                            <span style={styles.logoText}>AISCAN</span>
                        </div>
                        <p style={styles.logoSub}>AI Xaridlar Audit Tizimi</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={styles.badgeVerified}>✅ RASMIY TASDIQLANGAN</div>
                        <p style={styles.reportId}>ID: #{String(id).substring(0, 10).toUpperCase()}</p>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main style={styles.main}>
                {/* Document Info Card */}
                <div style={styles.card}>
                    <h1 style={styles.docTitle}>
                        {analysis.document_title || data.file_name}
                    </h1>
                    <p style={styles.fileName}>📄 {data.file_name}</p>

                    <div style={styles.metaRow}>
                        <span style={styles.metaItem}>
                            <Calendar size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                            {formatDate(data.created_at)}
                        </span>
                        <span style={styles.metaItem}>
                            <User size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                            Auditor: <strong style={{ color: 'white' }}>{data.auditor_name || '777'}</strong>
                        </span>
                        <span style={styles.metaItem}>
                            <Building2 size={14} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                            {data.airport}
                        </span>
                    </div>
                </div>

                {/* Scores */}
                <div style={styles.scoresGrid}>
                    {[
                        { label: 'Umumiy Ball', value: data.analysis_score },
                        { label: 'Qonuniy muvofiqlik', value: data.compliance_score },
                        { label: 'Afillanmaganlik', value: data.favoritism_score },
                    ].map(({ label, value }) => (
                        <div key={label} style={styles.scoreCard}>
                            <div style={{ ...styles.scoreValue, color: getScoreColor(value || 0) }}>
                                {value ?? '—'}%
                            </div>
                            <div style={styles.scoreLabel}>{label}</div>
                            <div style={styles.scoreBar}>
                                <div style={{
                                    ...styles.scoreBarFill,
                                    width: `${value || 0}%`,
                                    background: getScoreColor(value || 0)
                                }} />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Verdict */}
                <div style={{ ...styles.verdictCard, borderColor: verdict.color }}>
                    <span style={{ fontSize: '1.5rem' }}>{verdict.icon}</span>
                    <span style={{ color: verdict.color, fontWeight: 700, fontSize: '1.1rem' }}>
                        {verdict.label}
                    </span>
                </div>

                {/* Sections */}
                {analysis.sections && analysis.sections.map((section: any, i: number) => (
                    <div key={i} style={styles.sectionCard}>
                        <h3 style={styles.sectionTitle}>{section.title}</h3>
                        <p style={styles.sectionContent}>{section.content}</p>
                        {section.details && section.details.length > 0 && (
                            <ul style={styles.detailsList}>
                                {section.details.map((d: string, j: number) => (
                                    <li key={j} style={styles.detailItem}>• {d}</li>
                                ))}
                            </ul>
                        )}
                    </div>
                ))}

                {/* Risks */}
                {analysis.risks && analysis.risks.length > 0 && (
                    <div style={styles.card}>
                        <h3 style={{ ...styles.sectionTitle, color: '#f59e0b' }}>
                            ⚠️ Aniqlangan Xavflar
                        </h3>
                        <ul style={styles.detailsList}>
                            {analysis.risks.map((r: string, i: number) => (
                                <li key={i} style={{ ...styles.detailItem, borderLeft: '3px solid #f59e0b', paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>
                                    {r}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Recommendations */}
                {analysis.recommendations && analysis.recommendations.length > 0 && (
                    <div style={styles.card}>
                        <h3 style={{ ...styles.sectionTitle, color: '#22c55e' }}>
                            💡 Tavsiyalar
                        </h3>
                        <ul style={styles.detailsList}>
                            {analysis.recommendations.map((r: string, i: number) => (
                                <li key={i} style={{ ...styles.detailItem, borderLeft: '3px solid #22c55e', paddingLeft: '0.75rem', marginBottom: '0.5rem' }}>
                                    {r}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Download Button */}
                <div style={styles.downloadSection}>
                    <button
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        style={styles.downloadBtn}
                    >
                        <FileDown size={20} />
                        {isDownloading ? 'Yuklanmoqda...' : 'PDF Hisobotini Yuklab Olish'}
                    </button>
                    <p style={styles.downloadHint}>
                        To'liq audit hisoboti PDF formatida saqlanadi
                    </p>
                </div>

                {/* Footer */}
                <div style={styles.footer}>
                    <p>© 2026 AISCAN — O'zbekiston Respublikasi Xaridlar Audit Tizimi</p>
                    <p style={{ color: '#475569', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                        Ushbu hisobot AISCAN AI tizimi tomonidan avtomatik yaratilgan va raqamli tasdiqlangan
                    </p>
                </div>
            </main>
        </div>
    );
}

// ─── Styles ─────────────────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
    page: {
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
        fontFamily: "'Inter', 'Segoe UI', sans-serif",
        color: '#f1f5f9',
    },
    loadingBox: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh',
    },
    spinner: {
        width: 48, height: 48,
        border: '4px solid rgba(99,102,241,0.2)',
        borderTop: '4px solid #6366f1',
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
    },
    errorBox: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: '2rem',
    },
    header: {
        background: 'rgba(15, 23, 42, 0.9)',
        borderBottom: '1px solid rgba(99, 102, 241, 0.3)',
        backdropFilter: 'blur(10px)',
        position: 'sticky', top: 0, zIndex: 100,
        padding: '1rem 1.5rem',
    },
    headerInner: {
        maxWidth: 800, margin: '0 auto',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    },
    logo: {
        display: 'flex', alignItems: 'center', gap: '0.5rem',
    },
    logoText: {
        fontSize: '1.5rem', fontWeight: 800, color: '#6366f1', letterSpacing: '-0.5px',
    },
    logoSub: {
        color: '#64748b', fontSize: '0.75rem', marginTop: '0.1rem',
    },
    badgeVerified: {
        background: 'rgba(34, 197, 94, 0.15)',
        border: '1px solid rgba(34, 197, 94, 0.4)',
        color: '#22c55e', padding: '0.25rem 0.75rem',
        borderRadius: '999px', fontSize: '0.75rem', fontWeight: 600,
    },
    reportId: {
        color: '#475569', fontSize: '0.7rem', marginTop: '0.3rem',
    },
    main: {
        maxWidth: 800, margin: '0 auto', padding: '2rem 1rem',
        display: 'flex', flexDirection: 'column', gap: '1.25rem',
    },
    card: {
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(99, 102, 241, 0.2)',
        borderRadius: '1rem', padding: '1.5rem',
        backdropFilter: 'blur(8px)',
    },
    docTitle: {
        fontSize: '1.5rem', fontWeight: 700, color: '#f1f5f9',
        marginBottom: '0.5rem', lineHeight: 1.3,
    },
    fileName: {
        color: '#94a3b8', fontSize: '0.85rem', marginBottom: '1rem',
    },
    metaRow: {
        display: 'flex', flexWrap: 'wrap', gap: '1rem',
    },
    metaItem: {
        color: '#94a3b8', fontSize: '0.8rem',
        display: 'flex', alignItems: 'center',
    },
    scoresGrid: {
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem',
    },
    scoreCard: {
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
        borderRadius: '1rem', padding: '1.25rem',
        textAlign: 'center',
    },
    scoreValue: {
        fontSize: '2.5rem', fontWeight: 800, lineHeight: 1,
    },
    scoreLabel: {
        color: '#94a3b8', fontSize: '0.8rem', marginTop: '0.5rem', marginBottom: '0.75rem',
    },
    scoreBar: {
        height: 6, background: 'rgba(255,255,255,0.1)',
        borderRadius: 999, overflow: 'hidden',
    },
    scoreBarFill: {
        height: '100%', borderRadius: 999, transition: 'width 0.8s ease',
    },
    verdictCard: {
        background: 'rgba(30, 41, 59, 0.6)',
        border: '2px solid',
        borderRadius: '1rem', padding: '1rem 1.5rem',
        display: 'flex', alignItems: 'center', gap: '1rem',
    },
    sectionCard: {
        background: 'rgba(30, 41, 59, 0.6)',
        border: '1px solid rgba(99, 102, 241, 0.15)',
        borderRadius: '1rem', padding: '1.5rem',
    },
    sectionTitle: {
        fontSize: '1rem', fontWeight: 700, color: '#a5b4fc',
        marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em',
    },
    sectionContent: {
        color: '#cbd5e1', fontSize: '0.9rem', lineHeight: 1.7, marginBottom: '1rem',
    },
    detailsList: {
        listStyle: 'none', padding: 0, margin: 0,
    },
    detailItem: {
        color: '#94a3b8', fontSize: '0.85rem', lineHeight: 1.6,
        padding: '0.25rem 0',
    },
    downloadSection: {
        textAlign: 'center', padding: '2rem 0',
    },
    downloadBtn: {
        background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: 'white', border: 'none', borderRadius: '0.75rem',
        padding: '0.9rem 2.5rem', fontSize: '1rem', fontWeight: 600,
        cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.6rem',
        boxShadow: '0 0 30px rgba(99, 102, 241, 0.4)',
        transition: 'all 0.2s ease',
    },
    downloadHint: {
        color: '#475569', fontSize: '0.8rem', marginTop: '0.75rem',
    },
    footer: {
        textAlign: 'center', color: '#64748b', fontSize: '0.8rem',
        padding: '2rem 0', borderTop: '1px solid rgba(99,102,241,0.1)',
    },
};
