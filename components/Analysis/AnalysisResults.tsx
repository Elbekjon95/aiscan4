'use client';
import React, { useState, useEffect } from 'react';
import { getTranslation } from '@/lib/translations';
import { Search, Tag, ShieldCheck, AlertTriangle, XOctagon, FileDown, BookOpen, X, Eye, FileText, CheckCircle } from 'lucide-react';
import { exportToPDF } from '@/lib/pdfExport';

export default function AnalysisResults({ data, lang, file }: { data: any, lang: string, file?: File | null }) {
    const [showDocModal, setShowDocModal] = useState(false);
    const [docModalTab, setDocModalTab] = useState<'original' | 'corrected'>('original');
    const [pdfSrc, setPdfSrc] = useState<string | null>(null);
    const [basePdfUrl, setBasePdfUrl] = useState<string | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);

    // Initialize PDF view if file is a PDF
    useEffect(() => {
        if (file && file.type === 'application/pdf') {
            const url = URL.createObjectURL(file);
            setBasePdfUrl(url);
            setPdfSrc(url);
            return () => {
                URL.revokeObjectURL(url);
            };
        } else if (data.original_file_base64) {
            // Bazadan kelgan PDF (admin view - file yo'q)
            const blob = base64ToBlob(data.original_file_base64, 'application/pdf');
            const url = URL.createObjectURL(blob);
            setBasePdfUrl(url);
            setPdfSrc(url);
            return () => {
                URL.revokeObjectURL(url);
            };
        } else {
            setBasePdfUrl(null);
            setPdfSrc(null);
        }
    }, [file, data.original_file_base64]);

    const base64ToBlob = (base64: string, mimeType: string) => {
        const byteCharacters = atob(base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
    };

    /**
     * Tuzatilgan DOCX yuklab olish — original formatlash saqlanadi
     */
    const handleDownloadCorrectedDocx = async () => {
        if (!file) {
            alert('Original fayl mavjud emas. Iltimos, sahifani yangilab, faylni qayta yuklang.');
            return;
        }

        setIsDownloading(true);
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('replacements', JSON.stringify(data.optimized_replacements || []));

            const response = await fetch('/api/download-corrected', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || 'Yuklab olishda xatolik');
            }

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(file.name || 'hujjat').replace(/\.docx$/i, '')}_corrected.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error(err);
            alert(err.message || 'Hujjatni yuklab olishda xatolik yuz berdi.');
        } finally {
            setIsDownloading(false);
        }
    };

    /**
     * PDF fayllar uchun — tuzatilgan matnni DOCX formatida yuklab olish
     */
    const handleDownloadCorrectedFromText = async () => {
        const docText = data.corrected_version || data.optimized_version;
        if (!docText) return;

        setIsDownloading(true);
        try {
            const response = await fetch('/api/download-docx', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    text: docText,
                    title: data.document_title || file?.name || 'optimized_document'
                })
            });

            if (!response.ok) throw new Error('Download failed');

            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(data.document_title || file?.name || 'hujjat').replace(/[^a-zA-Z0-9А-Яа-яЎўҚқҒғҲҳ_.-]/g, '_')}_corrected.docx`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (err) {
            console.error(err);
            alert('Word hujjatini yuklab olishda xatolik yuz berdi.');
        } finally {
            setIsDownloading(false);
        }
    };

    const getIcon = (status: string) => {
        switch(status) {
            case 'success': return <ShieldCheck color="var(--success)" />;
            case 'warning': return <AlertTriangle color="var(--warning)" />;
            case 'danger': return <XOctagon color="var(--error)" />;
            default: return <Search />;
        }
    };

    const isPdf = file 
        ? (file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf')) 
        : (data.file_name?.toLowerCase().endsWith('.pdf') || !!data.original_file_base64);
    const isDocx = file 
        ? file.name?.toLowerCase().endsWith('.docx') 
        : (data.file_name?.toLowerCase().endsWith('.docx') || !!data.original_html);
    const hasOriginalHtml = !!data.original_html;
    const hasOriginalText = !!data.original_text;
    const hasReplacements = data.optimized_replacements && data.optimized_replacements.length > 0;

    const escapeRegExp = (str: string) => {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };

    const escapeHtmlAttr = (str: string) => {
        return str
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    };

    /**
     * Matnni normallashtirish — ortiqcha bo'shliqlar, tirnoq turlari, boshqa belgilarni standartlashtirish
     * Bu matching aniqligini oshiradi
     */
    const normalizeText = (str: string) => {
        return str
            .replace(/[\u00A0\u2000-\u200B\u202F\u205F\u3000]/g, ' ')  // barcha bo'shliq turlari
            .replace(/[\u2018\u2019\u201A\u201B]/g, "'")  // turli tirnoqlar
            .replace(/[\u201C\u201D\u201E\u201F]/g, '"')  // turli qo'shtirnoqlar
            .replace(/[\u2013\u2014]/g, '-')  // em/en dash
            .replace(/\s+/g, ' ')  // ortiqcha bo'shliqlarni bitta qilish
            .trim();
    };

    /**
     * O'zbek tili apostroflari va turli xil qo'shtirnoqlarga mos keladigan fuzzy regex pattern yaratish
     */
    const getFuzzyRegexPattern = (searchStr: string, isHtml: boolean = false): RegExp => {
        const clean = searchStr.trim();
        const escaped = escapeRegExp(clean);
        const parts = escaped.split(/\s+/).filter(p => p.length > 0);
        
        const mappedParts = parts.map(part => {
            return part
                .replace(/['’‘’`´ʻʼ]/g, "['’‘’`´ʻʼ]?") // Apostrof ixtiyoriy yoki har qanday variantda
                .replace(/["“”«»]/g, '["“”«»]?');    // Qo'shtirnoq ixtiyoriy yoki har qanday variantda
        });
        
        const separator = isHtml 
            ? '(?:\\s|<[^>]*>)*'
            : '\\s*';
            
        const pattern = mappedParts.join(separator);
        return new RegExp(pattern, 'gi');
    };

    /**
     * Matn ichidan quote ni topish — avval aniq, keyin fuzzy qidirish
     * HTML-escaped matn ichida ishlaydi
     */
    const findAndHighlight = (
        html: string, 
        searchText: string, 
        wrapFn: (match: string) => string
    ): string => {
        if (!searchText || searchText.length < 3) return html;
        
        // 1-usul: Fuzzy regex yordamida izlash (case-insensitive va apostroflarga chidamli)
        try {
            const regex = getFuzzyRegexPattern(searchText, false);
            const newHtml = html.replace(regex, (match: string) => {
                if (match.indexOf('class="error-highlight"') !== -1 || match.indexOf('class="corrected-highlight"') !== -1) {
                    return match;
                }
                return wrapFn(match);
            });
            if (newHtml !== html) return newHtml;
        } catch(e) {}

        // 2-usul: Zaxira sifatida to'g'ridan-to'g'ri qidirish
        if (html.includes(searchText)) {
            return html.split(searchText).join(wrapFn(searchText));
        }

        // 3-usul: Qisqa fragment zaxirasi
        const normalizedSearch = normalizeText(searchText);
        if (normalizedSearch.length > 40) {
            const shortSearch = normalizedSearch.substring(0, 40);
            try {
                const regex = getFuzzyRegexPattern(shortSearch, false);
                const newHtml = html.replace(regex, (match: string) => {
                    if (match.indexOf('class="error-highlight"') !== -1 || match.indexOf('class="corrected-highlight"') !== -1) {
                        return match;
                    }
                    return wrapFn(match);
                });
                if (newHtml !== html) return newHtml;
            } catch(e) {}
        }

        return html;
    };

    /**
     * HTML matn ichidan xato joylarni qizil bilan belgilash
     * original_html (mammoth-dan) ustida ishlaydi
     */
    const highlightErrorsInHtml = (html: string, evidences: any[]) => {
        if (!html) return '';
        let result = html;

        evidences?.forEach((ev) => {
            if (ev.quote && ev.quote.trim().length > 4) {
                const quote = ev.quote.trim();
                try {
                    const regex = getFuzzyRegexPattern(quote, true);
                    const severity = ev.severity || 'medium';
                    const reason = escapeHtmlAttr(ev.reason || '');

                    result = result.replace(regex, (match: string) => {
                        if (match.indexOf('class="error-highlight"') !== -1 || match.indexOf('class="corrected-highlight"') !== -1) {
                            return match;
                        }
                        return `<span class="error-highlight" data-severity="${severity}" data-reason="${reason}">${match}</span>`;
                    });
                } catch(e) {}
            }
        });

        return result;
    };

    /**
     * HTML matn ichidan tuzatilgan joylarni yashil bilan belgilash
     * optimized_replacements asosida ishlaydi
     */
    const highlightCorrectionsInHtml = (html: string, replacements: any[]) => {
        if (!html || !replacements) return html;
        let result = html;

        replacements?.forEach((rep: any) => {
            if (rep.corrected_phrase && rep.original_phrase) {
                const corrected = rep.corrected_phrase.trim();
                const original = rep.original_phrase.trim();
                if (corrected.length < 3) return;

                try {
                    const regex = getFuzzyRegexPattern(corrected, true);
                    const originalAttr = escapeHtmlAttr(`Eski variant: ${original}`);

                    result = result.replace(regex, (match: string) => {
                        if (match.indexOf('class="corrected-highlight"') !== -1 || match.indexOf('class="error-highlight"') !== -1) {
                            return match;
                        }
                        return `<span class="corrected-highlight" data-original="${originalAttr}">${match}</span>`;
                    });
                } catch(e) {}
            }
        });

        return result;
    };

    /**
     * Oddiy matndan xatolarni belgilangan HTML yaratish (agar original_html yo'q bo'lsa)
     */
    const renderHighlightedPlainText = (fullText: string, evidences: any[]) => {
        if (!fullText) return '';
        let html = fullText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br/>');

        evidences?.forEach((ev) => {
            if (ev.quote && ev.quote.trim().length > 4) {
                const quoteClean = ev.quote.trim()
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');

                const severity = ev.severity || 'medium';
                const reason = escapeHtmlAttr(ev.reason || '');

                html = findAndHighlight(html, quoteClean, (match) => 
                    `<span class="error-highlight" data-severity="${severity}" data-reason="${reason}">${match}</span>`
                );
            }
        });

        return html;
    };

    /**
     * Tuzatilgan versiya uchun plain text ni highlight qilish (PDF fayllar uchun)
     * corrected_phrase larni yashil bilan belgilaydi
     */
    const renderCorrectedPlainText = (correctedText: string, replacements: any[]) => {
        if (!correctedText) return '';
        let html = correctedText
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/\n/g, '<br/>');

        replacements?.forEach((rep: any) => {
            if (rep.corrected_phrase && rep.corrected_phrase.trim().length > 3) {
                const corrected = rep.corrected_phrase.trim()
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
                const original = rep.original_phrase?.trim() || '';
                const originalAttr = escapeHtmlAttr(`Eski variant: ${original}`);

                html = findAndHighlight(html, corrected, (match) => 
                    `<span class="corrected-highlight" data-original="${originalAttr}">${match}</span>`
                );
            }
        });

        return html;
    };

    /**
     * Tuzatilgan versiya HTML ni yaratish
     */
    const buildCorrectedHtml = () => {
        // DOCX uchun — HTML bor
        if (hasOriginalHtml && hasReplacements) {
            let correctedHtml = data.original_html;
            data.optimized_replacements.forEach((rep: any) => {
                if (rep.original_phrase && rep.corrected_phrase) {
                    const orig = rep.original_phrase.trim();
                    const corr = rep.corrected_phrase.trim();
                    if (orig.length > 0) {
                        try {
                            const regex = getFuzzyRegexPattern(orig, true);
                            correctedHtml = correctedHtml.replace(regex, corr);
                        } catch(e) {
                            correctedHtml = correctedHtml.split(orig).join(corr);
                        }
                    }
                }
            });
            return highlightCorrectionsInHtml(correctedHtml, data.optimized_replacements);
        }
        
        // PDF / Plain text uchun — corrected_version matnida highlight qilish
        if (hasReplacements && (data.corrected_version || data.optimized_version)) {
            const correctedText = data.corrected_version || data.optimized_version;
            return renderCorrectedPlainText(correctedText, data.optimized_replacements);
        }

        return '';
    };

    /**
     * Original hujjat HTML ni xato belgilar bilan yaratish
     * IKKALA manbadan foydalaniladi:
     * 1) favoritism_evidence — favoritizm dalillari (severity bilan)
     * 2) optimized_replacements — to'g'rilangan barcha joylar (original_phrase = xato)
     */
    const getOriginalDocHtml = () => {
        // optimized_replacements dan qo'shimcha xatolar ro'yxatini yaratish
        const replacementEvidences: any[] = [];
        if (data.optimized_replacements && Array.isArray(data.optimized_replacements)) {
            data.optimized_replacements.forEach((rep: any) => {
                if (rep.original_phrase && rep.original_phrase.trim().length > 4) {
                    // Agar bu phrase allaqachon favoritism_evidence da bo'lmasa, qo'shamiz
                    const alreadyExists = data.favoritism_evidence?.some((ev: any) => 
                        ev.quote && ev.quote.trim() === rep.original_phrase.trim()
                    );
                    if (!alreadyExists) {
                        replacementEvidences.push({
                            quote: rep.original_phrase.trim(),
                            reason: `To'g'rilangan: "${rep.corrected_phrase?.trim() || '...'}"`,
                            severity: 'medium'
                        });
                    }
                }
            });
        }

        // Ikkala ro'yxatni birlashtirish
        const allEvidences = [
            ...(Array.isArray(data.favoritism_evidence) ? data.favoritism_evidence : []),
            ...replacementEvidences
        ];

        if (hasOriginalHtml) {
            return highlightErrorsInHtml(data.original_html, allEvidences);
        } else if (hasOriginalText) {
            return renderHighlightedPlainText(data.original_text, allEvidences);
        }
        return '';
    };

    const correctedDocHtml = buildCorrectedHtml();
    const originalDocHtml = getOriginalDocHtml();
    const canShowDocViewer = hasOriginalHtml || hasOriginalText || isPdf;
    const canShowCorrected = correctedDocHtml.length > 0 || !!(data.corrected_version || data.optimized_version);

    console.log('AnalysisResults render debug:', { 
        isPdf, 
        isDocx, 
        hasOriginalHtml, 
        hasOriginalText, 
        canShowDocViewer, 
        canShowCorrected, 
        correctedDocHtmlLen: correctedDocHtml.length,
        originalDocHtmlLen: originalDocHtml.length,
        dataKeys: Object.keys(data || {}) 
    });

    return (
        <div className="analysis-grid">
            {data.is_cached && (
                <div style={{ textAlign: 'center', color: 'var(--success)', gridColumn: '1 / -1', marginBottom: '1rem', fontStyle: 'italic' }}>
                    <ShieldCheck size={16} style={{ display: 'inline', verticalAlign: 'middle' }} /> {getTranslation(lang, 'cache_hint')}
                </div>
            )}

            <div style={{ gridColumn: '1 / -1', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>{getTranslation(lang, 'label_main')}</h2>
                    
                    <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                        {/* 1. PDF Audit Report */}
                        <button 
                            onClick={() => exportToPDF(data, lang)}
                            className="btn btn-secondary"
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', fontSize: '0.9rem', cursor: 'pointer' }}
                        >
                            <FileDown size={16} />
                            {getTranslation(lang, 'btn_download_pdf')}
                        </button>

                        {/* 2. View Original Document (Modal with tabs) */}
                        {canShowDocViewer && (
                            <button 
                                onClick={() => { setDocModalTab('original'); setShowDocModal(true); }}
                                className="btn btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', fontSize: '0.9rem', border: '1px solid var(--primary)', background: 'rgba(79, 70, 229, 0.05)', color: 'var(--primary)', cursor: 'pointer' }}
                            >
                                <Eye size={16} />
                                Hujjatni ko'rish
                            </button>
                        )}

                        {/* 3. View Corrected Version */}
                        {canShowCorrected && (
                            <button 
                                onClick={() => { setDocModalTab('corrected'); setShowDocModal(true); }}
                                className="btn btn-secondary"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', fontSize: '0.9rem', border: '1px solid var(--secondary)', background: 'rgba(212, 175, 55, 0.05)', color: 'var(--secondary)', cursor: 'pointer' }}
                            >
                                <ShieldCheck size={16} />
                                {getTranslation(lang, 'btn_view_optimized')}
                            </button>
                        )}

                        {/* 4. Download Corrected */}
                        {canShowCorrected && (
                            <button 
                                onClick={isDocx ? handleDownloadCorrectedDocx : handleDownloadCorrectedFromText}
                                disabled={isDownloading}
                                className="btn btn-primary btn-glow"
                                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', fontSize: '0.9rem', cursor: 'pointer' }}
                            >
                                <FileDown size={16} />
                                {isDownloading ? 'Yuklanmoqda...' : (isDocx ? 'Tuzatilgan DOCX yuklash' : 'Tuzatilgan Word (DOCX)')}
                            </button>
                        )}
                    </div>
                </div>

                {/* AI tomonidan aniqlangan rasmiy hujjat nomi */}
                <div style={{ background: 'rgba(79, 70, 229, 0.1)', borderLeft: '4px solid var(--primary)', padding: '1rem 1.5rem', borderRadius: '0.5rem', marginTop: '0.5rem' }}>
                    <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '0.2rem' }}>
                        {data.document_title || getTranslation(lang, 'table_file')}
                    </h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        {getTranslation(lang, 'table_file')}: {data.file_name}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.2rem' }}>
                        Auditor: <strong style={{ color: 'white' }}>{data.auditor_name || '777'}</strong>
                    </p>
                </div>

                {/* 📊 HUJJAT DIAGNOSTIKASI — necha qator o'qilganini ko'rsatadi */}
                {data.doc_diagnostics && (() => {
                    const dt: Record<string, Record<string, string>> = {
                        uz: { title: 'Hujjat Diagnostikasi', file_size: 'Fayl hajmi', lines: 'Qatorlar soni', pages: 'Taxminiy varoqlar', sent: 'Gemini-ga yuborilgan', tables: 'Jadvallar', paragraphs: 'Paragraflar', start: 'HUJJAT BOSHLANISHI', end: 'HUJJAT OXIRI', full: "TO'LIQ O'QILDI", truncated: 'MATN KESILGAN', view_all: "Barcha o'qilgan qatorlarni ko'rish", extracted: 'Hujjatdan ajratilgan matn', numbered: 'Har bir qator raqamlangan', page: 'varoq', char: 'belgi', pcs: 'ta', line: 'qator', no_text: 'Matn mavjud emas' },
                        ru: { title: 'Диагностика документа', file_size: 'Размер файла', lines: 'Кол-во строк', pages: 'Примерно страниц', sent: 'Отправлено в Gemini', tables: 'Таблицы', paragraphs: 'Параграфы', start: 'НАЧАЛО ДОКУМЕНТА', end: 'КОНЕЦ ДОКУМЕНТА', full: 'ПОЛНОСТЬЮ ПРОЧИТАНО', truncated: 'ТЕКСТ ОБРЕЗАН', view_all: 'Показать все прочитанные строки', extracted: 'Извлечённый текст документа', numbered: 'Каждая строка пронумерована', page: 'стр.', char: 'символов', pcs: 'шт.', line: 'строк', no_text: 'Текст отсутствует' },
                        en: { title: 'Document Diagnostics', file_size: 'File size', lines: 'Total lines', pages: 'Estimated pages', sent: 'Sent to Gemini', tables: 'Tables', paragraphs: 'Paragraphs', start: 'DOCUMENT START', end: 'DOCUMENT END', full: 'FULLY READ', truncated: 'TEXT TRUNCATED', view_all: 'View all extracted lines', extracted: 'Extracted document text', numbered: 'Each line is numbered', page: 'pages', char: 'chars', pcs: '', line: 'lines', no_text: 'No text available' },
                    };
                    const t = dt[lang] || dt['uz'];
                    return (
                    <div style={{ 
                        background: 'rgba(30, 41, 59, 0.6)', 
                        border: '1px solid rgba(34, 197, 94, 0.3)', 
                        borderRadius: '0.8rem', 
                        padding: '1.2rem 1.5rem', 
                        marginTop: '0.8rem',
                        fontSize: '0.85rem'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem' }}>
                            <FileText size={16} color="var(--success)" />
                            <strong style={{ color: 'var(--success)' }}>📊 {t.title}</strong>
                            <span style={{ 
                                marginLeft: 'auto', 
                                padding: '0.2rem 0.7rem', 
                                borderRadius: '1rem', 
                                fontSize: '0.75rem', 
                                fontWeight: 700,
                                background: data.doc_diagnostics.is_truncated ? 'rgba(239, 68, 68, 0.15)' : 'rgba(34, 197, 94, 0.15)',
                                color: data.doc_diagnostics.is_truncated ? '#ef4444' : '#22c55e',
                                border: `1px solid ${data.doc_diagnostics.is_truncated ? 'rgba(239, 68, 68, 0.3)' : 'rgba(34, 197, 94, 0.3)'}`
                            }}>
                                {data.doc_diagnostics.is_truncated ? `⚠️ ${t.truncated}` : `✅ ${t.full}`}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.6rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '0.5rem' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>📦 {t.file_size}</div>
                                <div style={{ color: 'white', fontWeight: 700 }}>{data.doc_diagnostics.file_size_kb} KB</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '0.5rem' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>📃 {t.lines}</div>
                                <div style={{ color: 'white', fontWeight: 700 }}>{data.doc_diagnostics.total_lines?.toLocaleString()}</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '0.5rem' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>📖 {t.pages}</div>
                                <div style={{ color: 'white', fontWeight: 700 }}>~{data.doc_diagnostics.estimated_pages} {t.page}</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '0.5rem' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>📨 {t.sent}</div>
                                <div style={{ color: '#22c55e', fontWeight: 700 }}>{data.doc_diagnostics.sent_to_gemini_label || `${data.doc_diagnostics.sent_to_gemini?.toLocaleString()} ${t.char}`}</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '0.5rem' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>📊 {t.tables}</div>
                                <div style={{ color: 'white', fontWeight: 700 }}>{data.doc_diagnostics.tables} {t.pcs}</div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '0.5rem' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>📑 {t.paragraphs}</div>
                                <div style={{ color: 'white', fontWeight: 700 }}>{data.doc_diagnostics.paragraphs} {t.pcs}</div>
                            </div>
                        </div>
                        {/* Birinchi va oxirgi qatorlar */}
                        <div style={{ marginTop: '0.8rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '0.5rem' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.3rem' }}>🔰 {t.start}:</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic', wordBreak: 'break-word' }}>
                                    &quot;{data.doc_diagnostics.first_text}&quot;
                                </div>
                            </div>
                            <div style={{ background: 'rgba(255,255,255,0.03)', padding: '0.6rem', borderRadius: '0.5rem' }}>
                                <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.3rem' }}>🔚 {t.end}:</div>
                                <div style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic', wordBreak: 'break-word' }}>
                                    &quot;{data.doc_diagnostics.last_text}&quot;
                                </div>
                            </div>
                        </div>

                        {/* BARCHA O'QILGAN QATORLARNI KO'RISH TUGMASI */}
                        <div style={{ marginTop: '0.8rem' }}>
                            <button 
                                onClick={() => {
                                    const el = document.getElementById('doc-all-lines');
                                    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
                                }}
                                style={{ 
                                    background: 'rgba(76, 99, 168, 0.15)', 
                                    border: '1px solid var(--primary)', 
                                    color: 'var(--primary)', 
                                    padding: '0.5rem 1rem', 
                                    borderRadius: '0.5rem', 
                                    cursor: 'pointer', 
                                    fontSize: '0.82rem', 
                                    fontWeight: 600,
                                    fontFamily: 'Outfit, sans-serif',
                                    width: '100%'
                                }}
                            >
                                📋 {t.view_all} ({data.doc_diagnostics.total_lines} {t.line})
                            </button>
                            <div 
                                id="doc-all-lines" 
                                style={{ 
                                    display: 'none', 
                                    marginTop: '0.6rem', 
                                    background: '#0f172a', 
                                    border: '1px solid var(--glass-border)', 
                                    borderRadius: '0.5rem', 
                                    maxHeight: '400px', 
                                    overflowY: 'auto',
                                    padding: '0'
                                }}
                            >
                                <div style={{ 
                                    position: 'sticky', 
                                    top: 0, 
                                    background: '#1e293b', 
                                    padding: '0.5rem 1rem', 
                                    borderBottom: '1px solid var(--glass-border)',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    zIndex: 10
                                }}>
                                    <span style={{ color: 'var(--primary)', fontWeight: 700, fontSize: '0.8rem' }}>
                                        📄 {t.extracted} — {data.doc_diagnostics.total_lines} {t.line}
                                    </span>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>
                                        {t.numbered}
                                    </span>
                                </div>
                                <pre style={{ 
                                    margin: 0, 
                                    padding: '0.8rem', 
                                    fontSize: '0.72rem', 
                                    lineHeight: '1.6', 
                                    color: '#cbd5e1',
                                    fontFamily: 'Consolas, "Courier New", monospace',
                                    whiteSpace: 'pre-wrap',
                                    wordBreak: 'break-word'
                                }}>
{data.original_text ? data.original_text.split('\n').map((line: string, idx: number) => 
    `${String(idx + 1).padStart(4, ' ')} │ ${line}`
).join('\n') : t.no_text}
                                </pre>
                            </div>
                        </div>
                    </div>
                    );
                })()}
            </div>

            {/* Audit Basis Section */}
            {data.audit_basis && data.audit_basis.length > 0 && (
                <div className="analysis-card" style={{ gridColumn: '1 / -1', background: 'rgba(30, 41, 59, 0.4)', marginBottom: '2rem', border: '1px solid var(--primary)' }}>
                    <div className="card-title">
                        <BookOpen color="var(--primary)" />
                        <span>{getTranslation(lang, 'audit_basis_title')}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
                        {data.audit_basis.map((basis: string, idx: number) => (
                            <div key={idx} style={{ padding: '0.8rem', background: 'rgba(255,255,255,0.03)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <ShieldCheck size={16} color="var(--primary)" />
                                <span style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>{basis}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* ============================================= */}
            {/* UNIVERSAL DOCUMENT MODAL (Tab bilan) */}
            {/* ============================================= */}
            {showDocModal && (
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.88)', backdropFilter: 'blur(12px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
                    <div className="analysis-card" style={{ maxWidth: '1000px', width: '98%', height: '95vh', maxHeight: '95vh', position: 'relative', padding: '2rem 2rem 1.5rem 2rem', display: 'flex', flexDirection: 'column' }}>
                        {/* Close button */}
                        <button onClick={() => setShowDocModal(false)} style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: 'white', cursor: 'pointer', zIndex: 1001 }}>
                            <X size={32} />
                        </button>

                        {/* Tab tizimi */}
                        {canShowCorrected && (
                            <div className="doc-tabs">
                                <button 
                                    className={`doc-tab ${docModalTab === 'original' ? 'active' : ''}`}
                                    onClick={() => setDocModalTab('original')}
                                >
                                    <Eye size={16} />
                                    Original Hujjat
                                </button>
                                <button 
                                    className={`doc-tab ${docModalTab === 'corrected' ? 'active-corrected' : ''}`}
                                    onClick={() => setDocModalTab('corrected')}
                                >
                                    <CheckCircle size={16} />
                                    Tuzatilgan Versiya
                                </button>
                            </div>
                        )}

                        {!canShowCorrected && (
                            <h2 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.3rem' }}>
                                <FileText size={20} /> Hujjat ko'rinishi
                            </h2>
                        )}

                        {/* Legend */}
                        <div className="doc-legend">
                            {docModalTab === 'original' && (
                                <div className="doc-legend-item">
                                    <div className="doc-legend-color error"></div>
                                    <span>Xatolar va favoritizm joylari (ustiga bosib ko'ring)</span>
                                </div>
                            )}
                            {docModalTab === 'corrected' && (
                                <div className="doc-legend-item">
                                    <div className="doc-legend-color corrected"></div>
                                    <span>To'g'rilangan joylar (ustiga bosib eskisini ko'ring)</span>
                                </div>
                            )}
                        </div>

                        {/* Original tab */}
                        {docModalTab === 'original' && (
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {(hasOriginalHtml || hasOriginalText) ? (
                                    <div 
                                        className="doc-viewer"
                                        dangerouslySetInnerHTML={{ __html: originalDocHtml }}
                                    />
                                ) : isPdf && pdfSrc ? (
                                    <div style={{ flex: 1, background: '#1e293b', borderRadius: '0.5rem', overflow: 'hidden', height: '100%' }}>
                                        <iframe src={pdfSrc} style={{ width: '100%', height: '100%', minHeight: '60vh', border: 'none' }} title="PDF Viewer" />
                                    </div>
                                ) : (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Hujjat matni mavjud emas.
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Corrected tab */}
                        {docModalTab === 'corrected' && (
                            <div style={{ overflowY: 'auto', flex: 1 }}>
                                {correctedDocHtml ? (
                                    <div 
                                        className="doc-viewer"
                                        dangerouslySetInnerHTML={{ __html: correctedDocHtml }}
                                    />
                                ) : (data.corrected_version || data.optimized_version) ? (
                                    <div className="doc-viewer" style={{ whiteSpace: 'pre-wrap' }}>
                                        {data.corrected_version || data.optimized_version}
                                    </div>
                                ) : (
                                    <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                        Tuzatilgan versiya mavjud emas.
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                            {docModalTab === 'corrected' && canShowCorrected && (
                                <button 
                                    className="btn btn-primary"
                                    onClick={isDocx ? handleDownloadCorrectedDocx : handleDownloadCorrectedFromText}
                                    disabled={isDownloading}
                                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                >
                                    <FileDown size={18} />
                                    {isDownloading ? 'Yuklanmoqda...' : (isDocx ? 'Tuzatilgan DOCX yuklash' : 'Word (DOCX) yuklab olish')}
                                </button>
                            )}
                            <button className="btn btn-secondary" onClick={() => setShowDocModal(false)} style={{ cursor: 'pointer' }}>{getTranslation(lang, 'modal_close')}</button>
                        </div>
                    </div>
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
                                    &quot;{ev.quote}&quot;
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
