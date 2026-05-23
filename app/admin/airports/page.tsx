'use client';

import React, { useState, useEffect } from 'react';
import { getTranslation } from '@/lib/translations';
import { useSearchParams } from 'next/navigation';
import { Plane, Plus, Trash2, Database, Edit3, X, Save } from 'lucide-react';

export default function AirportsManagement() {
    const searchParams = useSearchParams();
    const lang = searchParams.get('lang') || 'uz';
    
    const [airports, setAirports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [msg, setMsg] = useState({ type: '', text: '' });
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingAirport, setEditingAirport] = useState<any>(null);

    const [newAirport, setNewAirport] = useState({
        name: '',
        code: '',
        type: 'international'
    });

    useEffect(() => {
        const checkAuth = async () => {
            try {
                const res = await fetch('/api/auth/me');
                const data = await res.json();
                if (!data.isLoggedIn || (data.role !== 'admin' && data.role !== 'super_admin')) {
                    window.location.href = `/admin/login?lang=${lang}`;
                } else {
                    fetchAirports();
                }
            } catch (err) {
                window.location.href = `/admin/login?lang=${lang}`;
            }
        };
        checkAuth();
    }, [lang]);

    const fetchAirports = async () => {
        try {
            const res = await fetch('/api/admin/airports');
            const data = await res.json();
            if (data.success) {
                setAirports(data.airports);
            }
        } catch (err) {
            setMsg({ type: 'error', text: 'Ma\'lumotlarni yuklashda xatolik.' });
        } finally {
            setLoading(false);
        }
    };

    const handleSeed = async () => {
        if (!confirm('Dastlabki 16 ta aeroportni yuklashga ishonchingiz komilmi?')) return;
        setLoading(true);
        try {
            const res = await fetch('/api/admin/airports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ action: 'seed' })
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ type: 'success', text: data.message });
                fetchAirports();
            }
        } catch (err) {
            setMsg({ type: 'error', text: 'Seed xatoligi.' });
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/airports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newAirport)
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ type: 'success', text: 'Yangi aeroport qo\'shildi.' });
                setNewAirport({ name: '', code: '', type: 'international' });
                fetchAirports();
            } else {
                setMsg({ type: 'error', text: data.error });
            }
        } catch (err) {
            setMsg({ type: 'error', text: 'Xatolik yuz berdi.' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Ushbu aeroportni o\'chirishga ishonchingiz komilmi? Bu aeroportga tegishli ma\'lumotlar tahlili qiyinlashishi mumkin.')) return;
        try {
            const res = await fetch('/api/admin/airports', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ type: 'success', text: 'O\'chirildi.' });
                fetchAirports();
            }
        } catch (err) {
            setMsg({ type: 'error', text: 'O\'chirishda xatolik.' });
        }
    };

    const openEditModal = (ap: any) => {
        setEditingAirport({ ...ap });
        setIsEditModalOpen(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/airports', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingAirport._id,
                    name: editingAirport.name,
                    code: editingAirport.code,
                    type: editingAirport.type
                })
            });
            const data = await res.json();
            if (data.success) {
                setMsg({ type: 'success', text: 'Muvaffaqiyatli yangilandi.' });
                setIsEditModalOpen(false);
                fetchAirports();
            } else {
                setMsg({ type: 'error', text: data.error });
            }
        } catch (err) {
            setMsg({ type: 'error', text: 'Yangilashda xatolik.' });
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}>Yuklanmoqda...</div>;

    return (
        <div className="admin-container" style={{ padding: '2rem 5%', maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
                <h1 style={{ fontWeight: 800, letterSpacing: '-1px' }}>Aeroportlar Boshqaruvi</h1>
                <button onClick={handleSeed} className="btn btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem' }}>
                    <Database size={18} className="color-secondary" /> Dastlabki Ro'yxatni Yuklash (Seed)
                </button>
            </div>

            {msg.text && (
                <div style={{ padding: '1rem', borderRadius: '1rem', marginBottom: '2rem', background: msg.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)', color: msg.type === 'error' ? 'var(--error)' : 'var(--success)', border: `1px solid ${msg.type === 'error' ? 'rgba(239,68,68,0.3)' : 'rgba(34,197,94,0.3)'}`, textAlign: 'center' }}>
                    {msg.text}
                </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2.5fr', gap: '2.5rem', alignItems: 'start' }}>
                {/* Add Form */}
                <div className="admin-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                        <Plus size={22} className="color-primary" /> Yangi Aeroport
                    </h3>
                    <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="input-group">
                            <label className="form-label">Nomi</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={newAirport.name}
                                onChange={e => setNewAirport({ ...newAirport, name: e.target.value })}
                                placeholder="Masalan: Farg'ona xalqaro aeroporti"
                                required 
                            />
                        </div>
                        <div className="input-group">
                            <label className="form-label">Kodi (IATA)</label>
                            <input 
                                type="text" 
                                className="input-field" 
                                value={newAirport.code}
                                onChange={e => setNewAirport({ ...newAirport, code: e.target.value.toUpperCase() })}
                                placeholder="Masalan: FEG"
                                required 
                            />
                        </div>
                        <div className="input-group">
                            <label className="form-label">Turi</label>
                            <select 
                                className="input-field"
                                value={newAirport.type}
                                onChange={e => setNewAirport({ ...newAirport, type: e.target.value as any })}
                            >
                                <option value="international">Xalqaro</option>
                                <option value="regional">Mahalliy (Regional)</option>
                            </select>
                        </div>
                        
                        <button type="submit" className="btn btn-primary btn-glow" style={{ marginTop: '1rem', width: '100%', padding: '1.2rem' }}>Qo'shish</button>
                    </form>
                </div>

                {/* List Table */}
                <div className="admin-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Nomi</th>
                                    <th style={{ textAlign: 'center' }}>Kod</th>
                                    <th style={{ textAlign: 'center' }}>Turi</th>
                                    <th style={{ textAlign: 'center' }}>Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {airports.map(ap => (
                                    <tr key={ap._id}>
                                        <td style={{ fontWeight: 600 }}>{ap.name}</td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>{ap.code}</span>
                                        </td>
                                        <td style={{ textAlign: 'center' }}>
                                            <span className={`badge ${ap.type === 'international' ? 'badge-primary' : 'badge-gold'}`}>
                                                {ap.type === 'international' ? 'Xalqaro' : 'Mahalliy'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
                                                <button onClick={() => openEditModal(ap)} className="action-btn edit" title="Tahrirlash">
                                                    <Edit3 size={18} />
                                                </button>
                                                <button onClick={() => handleDelete(ap._id)} className="action-btn delete" title="O'chirish">
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditModalOpen && editingAirport && (
                <div className="modal" style={{ display: 'flex' }}>
                    <div className="modal-content admin-card" style={{ maxWidth: '500px', animation: 'modal-spin-up 0.3s ease' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Edit3 size={20} className="color-primary" /> Aeroportni tahrirlash
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="action-btn close-btn" style={{ background: 'transparent' }}><X /></button>
                        </div>
                        <form onSubmit={handleUpdate} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="input-group">
                                <label className="form-label">Nomi</label>
                                <input type="text" className="input-field" value={editingAirport.name} onChange={e => setEditingAirport({ ...editingAirport, name: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label className="form-label">Kod (IATA)</label>
                                <input type="text" className="input-field" value={editingAirport.code} onChange={e => setEditingAirport({ ...editingAirport, code: e.target.value.toUpperCase() })} required />
                            </div>
                            <div className="input-group">
                                <label className="form-label">Turi</label>
                                <select className="input-field" value={editingAirport.type} onChange={e => setEditingAirport({ ...editingAirport, type: e.target.value })}>
                                    <option value="international">Xalqaro</option>
                                    <option value="regional">Mahalliy (Regional)</option>
                                </select>
                            </div>
                            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '1.5rem' }}>
                                <button type="submit" className="btn btn-primary btn-glow" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                                    <Save size={18} /> Saqlash
                                </button>
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="btn btn-secondary" style={{ flex: 1 }}>Bekor qilish</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
