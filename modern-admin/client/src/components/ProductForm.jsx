import React, { useState } from 'react';
import ThreeViewer from './ThreeViewer';
import { Upload, Box, DollarSign, Type, FileText, Send } from 'lucide-react';
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5001/api' });

export default function ProductForm() {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        category: 'Hoodie',
        imageUrl: '',
        modelUrl: '',
        status: 'standard'
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await API.post('/products', formData, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            alert('Gear successfully deployed to the arsenal!');
            setFormData({ name: '', description: '', price: '', category: 'Hoodie', imageUrl: '', modelUrl: '', status: 'standard' });
        } catch (err) {
            alert('Deployment failed: ' + (err.response?.data?.msg || err.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 animate-in slide-in-from-bottom-5 duration-700">
            <section className="space-y-6">
                <header>
                    <h1 className="text-3xl font-black uppercase tracking-tight">Register New Gear</h1>
                    <p className="text-white/40">Append specialized hardware to the Spidey Catalog</p>
                </header>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Gear Name</label>
                            <div className="relative">
                                <input 
                                    className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl outline-none focus:border-spider-red transition-all"
                                    placeholder="Nano-Tech Hoodie"
                                    value={formData.name}
                                    onChange={e => setFormData({...formData, name: e.target.value})}
                                    required
                                />
                                <Type size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Market Price ($)</label>
                            <div className="relative">
                                <input 
                                    type="number"
                                    className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl outline-none focus:border-spider-red transition-all"
                                    placeholder="0.00"
                                    value={formData.price}
                                    onChange={e => setFormData({...formData, price: e.target.value})}
                                    required
                                />
                                <DollarSign size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20" />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Technical Description</label>
                        <textarea 
                            className="w-full bg-white/5 border border-white/5 p-6 rounded-[32px] outline-none focus:border-spider-red transition-all h-32 resize-none"
                            placeholder="Describe the capabilities of this gear..."
                            value={formData.description}
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Classification</label>
                            <select 
                                className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl outline-none focus:border-spider-red transition-all appearance-none"
                                value={formData.category}
                                onChange={e => setFormData({...formData, category: e.target.value})}
                            >
                                <option>Hoodie</option>
                                <option>Mask</option>
                                <option>Toy</option>
                            </select>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Status</label>
                            <select 
                                className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl outline-none focus:border-spider-red transition-all appearance-none"
                                value={formData.status}
                                onChange={e => setFormData({...formData, status: e.target.value})}
                            >
                                <option value="standard">Standard</option>
                                <option value="featured">Featured</option>
                                <option value="trending">Trending</option>
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-white/40 ml-2">Asset URLs (Image & GLB)</label>
                        <div className="grid grid-cols-1 gap-2">
                           <input 
                                className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl outline-none focus:border-spider-blue transition-all"
                                placeholder="Image URL (png/jpg)"
                                value={formData.imageUrl}
                                onChange={e => setFormData({...formData, imageUrl: e.target.value})}
                                required
                            />
                            <input 
                                className="w-full bg-white/5 border border-white/5 p-4 rounded-3xl outline-none focus:border-spider-blue transition-all"
                                placeholder="3D Model URL (.glb)"
                                value={formData.modelUrl}
                                onChange={e => setFormData({...formData, modelUrl: e.target.value})}
                            />
                        </div>
                        <p className="text-[10px] text-white/20 mt-2 italic px-2">Tip: Use direct file URLs for instant preview</p>
                    </div>

                    <button 
                        disabled={loading}
                        className="w-full bg-white text-spider-dark p-4 rounded-3xl font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        <Send size={18} />
                        {loading ? 'Processing...' : 'Deploy Gear'}
                    </button>
                </form>
            </section>

            <section className="space-y-6">
                <header>
                    <h2 className="text-xl font-bold flex items-center gap-3">
                        <Box className="text-spider-blue" />
                        Live Blueprint Preview
                    </h2>
                    <p className="text-white/40 text-xs">Simulating deployment appearance</p>
                </header>

                <div className="glass-card rounded-[40px] p-6 space-y-6 border border-white/10">
                    <div className="relative group">
                        <ThreeViewer modelUrl={formData.modelUrl} />
                        <div className="absolute top-4 left-4 flex gap-2">
                            <span className="px-3 py-1 bg-spider-dark/80 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
                                3D PREVIEW
                            </span>
                            {formData.status !== 'standard' && (
                                <span className="px-3 py-1 bg-spider-red rounded-full text-[10px] font-black uppercase tracking-widest">
                                    {formData.status}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-6 items-start">
                        <div className="w-24 h-24 rounded-2xl bg-white/5 border border-white/10 overflow-hidden flex-shrink-0">
                            {formData.imageUrl ? <img src={formData.imageUrl} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Upload className="text-white/10" /></div>}
                        </div>
                        <div className="flex-1 space-y-1">
                            <h3 className="text-2xl font-black uppercase leading-none">{formData.name || 'UNNAMED GEAR'}</h3>
                            <p className="text-xs text-white/40 leading-relaxed line-clamp-2">{formData.description || 'Provide technical specifications to initialize description module...'}</p>
                            <p className="text-xl font-black text-spider-red pt-2">${formData.price || '0.00'}</p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
