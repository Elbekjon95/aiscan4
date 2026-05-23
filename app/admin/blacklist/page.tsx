'use client';

import React, { useState, useEffect } from 'react';
import { getTranslation } from '@/lib/translations';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertOctagon, Plus, Trash2, Search, Building2, UserX } from 'lucide-react';

export default function BlacklistManagement() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const lang = searchParams.get('lang') || 'uz';
    
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    
    const [newItem, setNewItem] = useState({
        stir: '',
        name: '',
        reason: ''
    });

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/me');
                const data = await res.json();
                if (!data.isLoggedIn || (data.role !== 'admin' && data.role !== 'super_admin')) {
                    window.location.href = `/admin/login?lang=${lang}`;
                } else {
                    fetchBlacklist();
                }
            } catch (err) {
                window.location.href = `/admin/login?lang=${lang}`;
            }
        };
        checkAuth();
    }, [lang]);

    const fetchBlacklist = async () => {
        try {
            const res = await fetch('/api/admin/blacklist');
            const data = await res.json();
            if (data.success) {
                setItems(data.items);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Ma\'lumotlarni yuklashda xatolik.');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/blacklist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newItem)
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('Korxona qora ro\'yxatga qo\'shildi.');
                setNewItem({ stir: '', name: '', reason: '' });
                fetchBlacklist();
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Server bilan bog\'lanishda xatolik.');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Ushbu korxonani qora ro\'yxatdan o\'chirmoqchimisiz?')) return;
        try {
            const res = await fetch('/api/admin/blacklist', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('O\'chirildi.');
                fetchBlacklist();
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Xatolik yuz berdi.');
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}>Yuklanmoqda...</div>;

    return (
        <div className="admin-container" style={{ padding: '2rem 5%', maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <h1 style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '12px', fontWeight: 800, letterSpacing: '-1px' }}>
                <UserX size={36} className="color-error" /> {getTranslation(lang, 'nav_blacklist')}
            </h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '3rem', maxWidth: '800px' }}>
                {getTranslation(lang, 'mgmt_blacklist_hint')} Bu yerdagi ma'lumotlar barcha aeroportlar tahlilida "Stop-list" sifatida qo'llaniladi.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2.5fr', gap: '2.5rem', alignItems: 'start' }}>
                {/* Form to Add to Blacklist */}
                <div className="admin-card">
                    <h3 style={{ marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Plus size={22} className="color-primary" /> {getTranslation(lang, 'add_blacklist_title')}
                    </h3>
                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="input-group">
                            <label className="form-label">Tashkilot Nomi</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={newItem.name}
                                onChange={e => setNewItem({ ...newItem, name: e.target.value })}
                                placeholder="Masalan: 'Example LLC'"
                                required 
                            />
                        </div>
                        <div className="input-group">
                            <label className="form-label">{getTranslation(lang, 'label_stir')} (INN)</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={newItem.stir}
                                onChange={e => setNewItem({ ...newItem, stir: e.target.value })}
                                placeholder="9 raqamli STIR"
                                required 
                            />
                        </div>
                        <div className="input-group">
                            <label className="form-label">{getTranslation(lang, 'label_reason')}</label>
                            <textarea 
                                className="input-field" 
                                rows={4}
                                value={newItem.reason}
                                onChange={e => setNewItem({ ...newItem, reason: e.target.value })}
                                placeholder="Nima uchun qora ro'yxatga kiritildi?"
                                style={{ resize: 'none' }}
                                required 
                            />
                        </div>
                        
                        {(error || success) && (
                            <p style={{ color: error ? 'var(--error)' : 'var(--success)', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', textAlign: 'center' }}>
                                {error || success}
                            </p>
                        )}

                        <button type="submit" className="btn btn-primary btn-glow" style={{ marginTop: '1rem', width: '100%', padding: '1.2rem' }}>
                            {getTranslation(lang, 'btn_add')}
                        </button>
                    </form>
                </div>

                {/* Blacklist Items Table */}
                <div className="admin-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Tashkilot</th>
                                    <th style={{ textAlign: 'center' }}>STIR (INN)</th>
                                    <th>Sababi</th>
                                    <th style={{ textAlign: 'center' }}>Sana</th>
                                    <th style={{ textAlign: 'center' }}>Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} style={{ padding: '4rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                                                <AlertOctagon size={48} style={{ opacity: 0.2 }} />
                                                Qora ro'yxat bo'sh.
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    items.map(item => (
                                        <tr key={item._id}>
                                            <td style={{ fontWeight: 600 }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                                        <Building2 size={18} className="color-primary" />
                                                        {item.name}
                                                    </div>
                                                    {item.is_global && (
                                                        <span className="badge badge-red" style={{ width: 'fit-content', fontSize: '0.65rem' }}>
                                                            GLOBAL BLACKLIST
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td style={{ textAlign: 'center' }}>
                                                <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>{item.stir}</span>
                                            </td>
                                            <td style={{ fontSize: '0.9rem', color: 'var(--text-muted)', maxWidth: '250px' }}>
                                                <p style={{ margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.reason}>
                                                    {item.reason}
                                                </p>
                                            </td>
                                            <td style={{ textAlign: 'center', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                {new Date(item.created_at).toLocaleDateString()}
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', justifyContent: 'center' }}>
                                                    <button onClick={() => handleDelete(item._id)} className="action-btn delete" title="O'chirish">
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
