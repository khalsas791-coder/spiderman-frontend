import React, { useState, useEffect } from 'react';
import ThreeViewer from './ThreeViewer';
import { Upload, Box, DollarSign, Type, FileText, Send, AlertCircle, Loader2, Save } from 'lucide-react';
import axios from 'axios';

const API = axios.create({ 
    baseURL: import.meta.env.VITE_API_URL || 'https://spiderman-backend-1.onrender.com/api' 
});

export default function ProductForm({ initialData, onSuccess, onCancel }) {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: 'Hoodie',
        status: 'standard'
    });
    const [imageFile, setImageFile] = useState(null);
    const [glbFile, setGlbFile] = useState(null);
    const [previews, setPreviews] = useState({ image: null, glb: null });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isEditing = !!initialData;

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                price: initialData.price || '',
                category: initialData.category === 'Hoodies' ? 'Hoodie' : (initialData.category === 'Masks' ? 'Mask' : (initialData.category === 'Toys' ? 'Toy' : initialData.category)),
                status: initialData.status || 'standard'
            });
            setPreviews({
                image: initialData.image || initialData.imageUrl,
                glb: initialData.modelUrl
            });
        }
    }, [initialData]);

    const handleFileChange = (e) => {
        const { name, files } = e.target;
        const file = files[0];
        if (!file) return;

        if (name === 'image') {
            setImageFile(file);
            setPreviews(p => ({ ...p, image: URL.createObjectURL(file) }));
        } else {
            setGlbFile(file);
            setPreviews(p => ({ ...p, glb: URL.createObjectURL(file) }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!isEditing && !imageFile) return setError('Image file is required for gear registration.');
        
        setLoading(true);
        setError(null);

        const data = new FormData();
        data.append('name', formData.name);
        data.append('description', formData.description);
        data.append('price', formData.price);
        data.append('category', formData.category);
        data.append('status', formData.status);
        if (imageFile) data.append('image', imageFile);
        if (glbFile) data.append('glb', glbFile);

        try {
            const token = localStorage.getItem('token');
            const config = {
                headers: { 
                  'Content-Type': 'multipart/form-data',
                  'x-auth-token': token
                }
            };

            if (isEditing) {
                await API.put(`/products/${initialData.id}`, data, config);
            } else {
                await API.post('/products', data, config);
            }

            if (onSuccess) onSuccess();
            else {
                alert(isEditing ? '✓ GEAR MODIFIED' : '🚀 GEAR DEPLOYED');
                window.location.reload();
            }
        } catch (err) {
            console.error('Submission Crash:', err);
            setError(err.response?.data?.msg || 'System failure during operation.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`grid grid-cols-1 lg:grid-cols-2 gap-12 ${!isEditing ? 'animate-in slide-in-from-bottom-5 duration-700' : ''}`}>
            <section className="space-y-6">
                <header>
                    <h1 className="text-3xl font-black uppercase tracking-tight">
                        {isEditing ? 'Modify Specification' : 'Deploy New Hardware'}
                    </h1>
                    <p className="text-white/40">
                        {isEditing ? `Updating assets for ID: ${initialData.id}` : 'Register specialized assets to the mission arsenal'}
                    </p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-sm font-bold">
                            <AlertCircle size={18} />
                            {error}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Gear Identifier</label>
                            <input 
                                className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl outline-none focus:border-spider-red transition-all"
                                placeholder="Quantum Suit V2"
                                value={formData.name}
                                onChange={e => setFormData({...formData, name: e.target.value})}
                                required
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Market Price ($)</label>
                            <input 
                                type="number"
                                className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl outline-none focus:border-spider-red transition-all"
                                placeholder="0.00"
                                value={formData.price}
                                onChange={e => setFormData({...formData, price: e.target.value})}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Technical Specs</label>
                        <textarea 
                            className="w-full bg-white/5 border border-white/5 p-6 rounded-[32px] outline-none focus:border-spider-red transition-all h-24 resize-none"
                            placeholder="Detail the capabilities..."
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Classification</label>
                            <select 
                                className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl outline-none transition-all appearance-none font-bold"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                                <option>Hoodie</option>
                                <option>Mask</option>
                                <option>Toy</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Priority Level</label>
                            <select 
                                className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl outline-none transition-all appearance-none font-bold"
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value})}
                            >
                                <option value="standard">Standard</option>
                                <option value="featured">Featured</option>
                                <option value="trending">Trending</option>
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2 truncate">Update Photo {isEditing ? '(Optional)' : ''}</label>
                            <div className="relative">
                                <input type="file" name="image" onChange={handleFileChange} accept="image/*" className="hidden" id="file-image" />
                                <label htmlFor="file-image" className="w-full flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-3xl cursor-pointer hover:bg-white/10 transition-all text-sm text-white/40">
                                    <span className="truncate">{imageFile ? imageFile.name : (isEditing ? 'Original Photo' : 'Upload Content')}</span>
                                    <Upload size={16} />
                                </label>
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Update 3D {isEditing ? '(Optional)' : ''}</label>
                            <div className="relative">
                                <input type="file" name="glb" onChange={handleFileChange} accept=".glb" className="hidden" id="file-glb" />
                                <label htmlFor="file-glb" className="w-full flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-3xl cursor-pointer hover:bg-white/10 transition-all text-sm text-white/40">
                                    <span className="truncate">{glbFile ? glbFile.name : (isEditing ? 'Original Model' : 'Upload .GLB')}</span>
                                    <Box size={16} />
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-4 pt-4">
                        {isEditing && (
                            <button 
                                type="button" 
                                onClick={onCancel}
                                className="flex-1 bg-white/5 p-4 rounded-3xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                            >
                                Abort
                            </button>
                        )}
                        <button 
                            disabled={loading}
                            className={`flex-[2] ${isEditing ? 'bg-spider-blue' : 'bg-spider-red'} text-white p-4 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50`}
                        >
                            {loading ? <Loader2 className="animate-spin" /> : (isEditing ? <Save size={18} /> : <Send size={18} />)}
                            {loading ? 'SYNCING...' : (isEditing ? 'SAVE UPGRADES' : 'CONFIRM DEPLOYMENT')}
                        </button>
                    </div>
                </form>
            </section>

            <section className="space-y-6">
                <header>
                    <h2 className="text-xl font-bold flex items-center gap-3 uppercase tracking-tighter">
                        <Box className="text-spider-blue" />
                        Live Blueprint Preview
                    </h2>
                </header>

                <div className={`glass-card rounded-[40px] p-8 space-y-6 border border-white/10 ${isEditing ? 'glow-blue' : 'glow-red'}`}>
                    <div className="relative group">
                        <ThreeViewer modelUrl={previews.glb} />
                        <div className="absolute top-4 left-4 bg-spider-dark/80 px-4 py-2 rounded-full border border-white/10 text-[10px] uppercase font-black tracking-widest">
                          {previews.glb ? 'MODIFIED RENDER' : 'WAITING FOR DATA...'}
                        </div>
                    </div>

                    <div className="flex gap-6 items-start">
                        <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                            {previews.image ? <img src={previews.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center opacity-10"><Upload /></div>}
                        </div>
                        <div className="flex-1 space-y-1 pt-2">
                            <h3 className="text-2xl font-black uppercase leading-none tracking-tighter">{formData.name || 'UNIDENTIFIED'}</h3>
                            <p className="text-[10px] text-spider-blue font-bold uppercase tracking-widest">{formData.category}</p>
                            <p className="text-lg font-black text-spider-red pt-1">${formData.price || '0.00'}</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
