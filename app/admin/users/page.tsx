'use client';

import React, { useState, useEffect } from 'react';
import { getTranslation } from '@/lib/translations';
import { useRouter, useSearchParams } from 'next/navigation';
import { UserPlus, Trash2, ShieldCheck, MapPin, Edit3, X, Save } from 'lucide-react';

export default function UsersManagement() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const lang = searchParams.get('lang') || 'uz';
    
    const [users, setUsers] = useState<any[]>([]);
    const [airports, setAirports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [role, setRole] = useState<string | null>(null);
    
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<any>(null);

    const [newUser, setNewUser] = useState({
        username: '',
        password: '',
        role: 'user',
        airport: 'TAS'
    });

    const [me, setMe] = useState<any>(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const resMe = await fetch('/api/auth/me');
            const dataMe = await resMe.json();
            setMe(dataMe);

            const resAirports = await fetch('/api/admin/airports');
            const dataAirports = await resAirports.json();
            
            const airportsList = dataAirports.success ? dataAirports.airports : [];
            setAirports([
                { code: 'ALL', name: 'Markaziy Apparat (Barchasi)' },
                ...airportsList
            ]);

            // Set default airport for new user based on current user's airport if admin
            if (dataMe.role === 'admin') {
                setNewUser(prev => ({ ...prev, airport: dataMe.airport }));
            }

            await fetchUsers();
        } catch (err) {
            setError('Ma\'lumotlarni yuklashda xatolik.');
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.users);
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Foydalanuvchilarni yuklashda xatolik.');
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const res = await fetch('/api/admin/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('Foydalanuvchi muvaffaqiyatli qo\'shildi.');
                setNewUser({ username: '', password: '', role: 'user', airport: 'TAS' });
                fetchUsers();
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Server bilan bog\'lanishda xatolik.');
        }
    };

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Haqiqatdan ham ushbu foydalanuvchini o\'chirmoqchimisiz?')) return;
        try {
            const res = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('O\'chirildi.');
                fetchUsers();
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Xatolik yuz berdi.');
        }
    };

    const openEditModal = (user: any) => {
        setEditingUser({ ...user, password: '' });
        setIsEditModalOpen(true);
    };

    const handleUpdateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingUser.id,
                    username: editingUser.username,
                    password: editingUser.password || undefined,
                    role: editingUser.role,
                    airport: editingUser.airport
                })
            });
            const data = await res.json();
            if (data.success) {
                setSuccess('Yangilandi.');
                setIsEditModalOpen(false);
                fetchUsers();
            } else {
                setError(data.error);
            }
        } catch (err) {
            setError('Xatolik.');
        }
    };

    if (loading) return <div style={{ textAlign: 'center', padding: '5rem' }}>Yuklanmoqda...</div>;

    return (
        <div className="admin-container" style={{ padding: '2rem 5%', maxWidth: '1400px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
            <h1 style={{ marginBottom: '2.5rem', fontWeight: 800, letterSpacing: '-1px' }}>{getTranslation(lang, 'mgmt_users')}</h1>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 2.5fr', gap: '2.5rem', alignItems: 'start' }}>
                {/* Form to Add User */}
                <div className="admin-card">
                    <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '2rem' }}>
                        <UserPlus size={22} className="color-primary" /> {getTranslation(lang, 'add_user_title')}
                    </h3>
                    <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                        <div className="input-group">
                            <label className="form-label">{getTranslation(lang, 'label_username')}</label>
                            <input type="text" className="input-field" value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required placeholder="Masalan: admin_tas" />
                        </div>
                        <div className="input-group">
                            <label className="form-label">{getTranslation(lang, 'label_password')}</label>
                            <input type="password" className="input-field" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required placeholder="••••••••" />
                        </div>
                        <div className="input-group">
                            <label className="form-label">Rol</label>
                            <select 
                                className="input-field" 
                                value={newUser.role} 
                                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                disabled={me?.role !== 'super_admin' && me?.role !== 'admin'}
                            >
                                <option value="user">USER (Tahlilchi)</option>
                                <option value="admin">ADMIN (Filial Admini)</option>
                                {me?.role === 'super_admin' && <option value="super_admin">SUPER ADMIN (Markaz)</option>}
                            </select>
                        </div>
                        <div className="input-group">
                            <label className="form-label">Aeroport (Filial)</label>
                            <select 
                                className="input-field" 
                                value={newUser.airport} 
                                onChange={e => setNewUser({ ...newUser, airport: e.target.value })}
                                disabled={me?.role !== 'super_admin'}
                            >
                                {me?.role === 'super_admin' ? (
                                    <>
                                        <option value="ALL">Markaziy Apparat (Barchasi)</option>
                                        {airports.filter(a => a.code !== 'ALL').map(ap => <option key={ap.code} value={ap.code}>{ap.name}</option>)}
                                    </>
                                ) : (
                                    <option value={me?.airport}>{me?.airport}</option>
                                )}
                            </select>
                        </div>
                        
                        {(error || success) && (
                            <p style={{ color: error ? 'var(--error)' : 'var(--success)', fontSize: '0.85rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', textAlign: 'center' }}>
                                {error || success}
                            </p>
                        )}

                        <button type="submit" className="btn btn-primary btn-glow" style={{ marginTop: '1rem', width: '100%', padding: '1.2rem 2.5rem' }}>
                            {getTranslation(lang, 'btn_add')}
                        </button>
                    </form>
                </div>

                {/* Users List */}
                <div className="admin-card">
                    <div style={{ overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Login</th>
                                    <th>Rol</th>
                                    <th>Aeroport</th>
                                    <th style={{ textAlign: 'center' }}>Amallar</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users
                                    .filter(u => me?.role === 'super_admin' || u.role !== 'super_admin')
                                    .map(u => (
                                    <tr key={u.id}>
                                        <td style={{ fontWeight: 600 }}>{u.username}</td>
                                        <td>
                                            <span className={`badge ${u.role === 'super_admin' ? 'badge-red' : (u.role === 'admin' ? 'badge-gold' : 'badge-primary')}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                <ShieldCheck size={14} /> {u.role.toUpperCase()}
                                            </span>
                                        </td>
                                        <td>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)' }}>
                                                <MapPin size={14} className="color-primary" /> {u.airport}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center' }}>
                                                {!u.is_primary ? (
                                                    <>
                                                        <button onClick={() => openEditModal(u)} className="action-btn edit" title="Tahrirlash">
                                                            <Edit3 size={18} />
                                                        </button>
                                                        <button onClick={() => handleDeleteUser(u.id)} className="action-btn delete" title="O'chirish">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </>
                                                ) : (
                                                    <span className="badge" style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text-muted)', fontSize: '0.7rem' }}>Primary Admin</span>
                                                )}
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
            {isEditModalOpen && editingUser && (
                <div className="modal" style={{ display: 'flex' }}>
                    <div className="modal-content admin-card" style={{ maxWidth: '500px', animation: 'modal-spin-up 0.3s ease' }}>
                        <div className="modal-header">
                            <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <Edit3 size={20} className="color-primary" /> Foydalanuvchini tahrirlash
                            </h3>
                            <button onClick={() => setIsEditModalOpen(false)} className="action-btn close-btn" style={{ background: 'transparent' }}><X /></button>
                        </div>
                        <form onSubmit={handleUpdateUser} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                            <div className="input-group">
                                <label className="form-label">Login</label>
                                <input type="text" className="input-field" value={editingUser.username} onChange={e => setEditingUser({ ...editingUser, username: e.target.value })} required />
                            </div>
                            <div className="input-group">
                                <label className="form-label">Yangi Parol (ixtiyoriy)</label>
                                <input type="password" placeholder="O'zgartirish uchun kiriting" className="input-field" value={editingUser.password} onChange={e => setEditingUser({ ...editingUser, password: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label className="form-label">Rol</label>
                                <select 
                                    className="input-field" 
                                    value={editingUser.role} 
                                    onChange={e => setEditingUser({ ...editingUser, role: e.target.value })}
                                    disabled={me?.role !== 'super_admin' && me?.role !== 'admin'}
                                >
                                <option value="user">USER (Tahlilchi)</option>
                                    <option value="admin">ADMIN (Filial Admini)</option>
                                    {me?.role === 'super_admin' && <option value="super_admin">SUPER ADMIN (Markaz)</option>}
                                </select>
                            </div>
                            <div className="input-group">
                                <label className="form-label">Aeroport</label>
                                <select 
                                    className="input-field" 
                                    value={editingUser.airport} 
                                    onChange={e => setEditingUser({ ...editingUser, airport: e.target.value })}
                                    disabled={me?.role !== 'super_admin'}
                                >
                                    {me?.role === 'super_admin' ? (
                                        <>
                                            <option value="ALL">Markaziy Apparat</option>
                                            {airports.filter(a => a.code !== 'ALL').map(ap => <option key={ap.code} value={ap.code}>{ap.name}</option>)}
                                        </>
                                    ) : (
                                        <option value={me?.airport}>{me?.airport}</option>
                                    )}
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
