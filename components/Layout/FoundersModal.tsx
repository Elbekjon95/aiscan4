'use client';
import React from 'react';
import { X, Users, ExternalLink } from 'lucide-react';
import { getTranslation } from '@/lib/translations';

interface FoundersModalProps {
    onClose: () => void;
    lang: string;
}

export default function FoundersModal({ onClose, lang }: FoundersModalProps) {
    const founders = [
        {
            name: "Elbek Roxmonov",
            handle: "@Elbars95",
            initials: "RE",
            link: "https://t.me/Elbars95"
        },
        {
            name: "Sanjar Ibragimov",
            handle: "@ss_ibragimov",
            initials: "IS",
            link: "https://t.me/ss_ibragimov"
        },
        {
            name: "Jamshid Mirkhadjayev",
            handle: "@jmirkhadjayev",
            initials: "MJ",
            link: "https://www.mirkhadjayev.uz"
        }
    ];

    return (
        <div className="modal">
            <div className="modal-content" style={{ maxWidth: '600px' }}>
                <div className="modal-header">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', margin: 0 }}>
                        <Users size={24} color="var(--primary)" />
                        {getTranslation(lang, 'founders_modal_title')}
                    </h3>
                    <button className="modal-close" onClick={onClose}>
                        <X size={24} />
                    </button>
                </div>
                
                <div className="founders-list">
                    {founders.map((f, i) => (
                        <a key={i} href={f.link} target="_blank" rel="noopener noreferrer" className="founder-item">
                            <div className="founder-avatar">{f.initials}</div>
                            <div className="founder-info">
                                <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>{f.name}</h4>
                                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{f.handle}</span>
                            </div>
                            <ExternalLink size={18} style={{ marginLeft: 'auto', color: 'var(--text-muted)' }} />
                        </a>
                    ))}
                </div>
            </div>
        </div>
    );
}
