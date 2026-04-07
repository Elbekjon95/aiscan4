'use client';

import React, { useState } from 'react';
import FoundersModal from './FoundersModal';
import { getTranslation } from '@/lib/translations';
import { useSearchParams } from 'next/navigation';

export default function Footer() {
    const [modalOpen, setModalOpen] = useState(false);
    const searchParams = useSearchParams();
    const lang = searchParams.get('lang') || 'uz';

    return (
        <>
            <footer style={{ 
                textAlign: 'center', 
                padding: '2rem', 
                marginTop: '4rem', 
                color: 'var(--text-muted)', 
                fontSize: '0.9rem',
                borderTop: '1px solid var(--glass-border)'
            }}>
                <div style={{ marginBottom: '1rem' }}>
                    &copy; {new Date().getFullYear()} AISCAN - Uzbekistan Airports JSC - Compliance & Anti-Corruption
                </div>
                <div>
                    <button 
                        onClick={() => setModalOpen(true)}
                        style={{
                            background: 'transparent',
                            border: '1px solid var(--glass-border)',
                            color: 'var(--text-muted)',
                            padding: '0.4rem 1rem',
                            borderRadius: '2rem',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            letterSpacing: '1px'
                        }}
                    >
                        {getTranslation(lang, 'footer_founders')}
                    </button>
                </div>
            </footer>
            {modalOpen && <FoundersModal onClose={() => setModalOpen(false)} lang={lang} />}
        </>
    );
}
