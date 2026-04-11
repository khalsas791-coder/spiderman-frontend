import React, { useState, useEffect } from 'react';
import { Trash2, Edit, Cube, Search, Filter, MoreVertical, X } from 'lucide-react';
import ThreeViewer from './ThreeViewer';
import axios from 'axios';

const API = axios.create({ baseURL: 'http://localhost:5001/api' });

export default function ProductList() {
    const [products, setProducts] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');
    const [previewModel, setPreviewModel] = useState(null);

    const fetchProducts = async () => {
        try {
            const res = await API.get('/products', {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            setProducts(res.data);
        } catch (err) { console.error('Failed to load arsenal'); }
    };

    useEffect(() => { fetchProducts(); }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to decommission this gear?')) return;
        try {
            await API.delete(`/products/${id}`, {
                headers: { 'x-auth-token': localStorage.getItem('token') }
            });
            fetchProducts();
        } catch (err) { alert('Deletion failed'); }
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = filterCategory === 'All' || p.category === filterCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="space-y-8 animate-in fade-in duration-1000">
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight">Manage Arsenal</h1>
                    <p className="text-white/40">Inventory of all specialized spider-assets</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="relative">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/20" />
                        <input 
                            className="bg-white/5 border border-white/5 p-3 pl-12 rounded-2xl outline-none focus:border-spider-red transition-all w-64"
                            placeholder="Search gear..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select 
                        className="bg-white/5 border border-white/5 p-3 rounded-2xl outline-none focus:border-spider-blue"
                        value={filterCategory}
                        onChange={(e) => setFilterCategory(e.target.value)}
                    >
                        <option>All</option>
                        <option>Hoodie</option>
                        <option>Mask</option>
                        <option>Toy</option>
                    </select>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProducts.map((p) => (
                    <div key={p.id} className="glass-card rounded-[32px] overflow-hidden group border border-white/5 hover:border-white/10 transition-all">
                        <div className="aspect-square bg-spider-light relative overflow-hidden">
                            <img src={p.imageUrl} alt={p.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                            <div className="absolute top-4 right-4 flex gap-2">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${p.status === 'featured' ? 'bg-spider-red' : (p.status === 'trending' ? 'bg-spider-blue' : 'bg-spider-dark/80 backdrop-blur-md')}`}>
                                    {p.status}
                                </span>
                            </div>
                            {p.modelUrl && (
                                <button 
                                    onClick={() => setPreviewModel(p.modelUrl)}
                                    className="absolute bottom-4 right-4 w-12 h-12 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center hover:bg-spider-red transition-colors"
                                >
                                    <Cube size={20} />
                                </button>
                            )}
                        </div>
                        <div className="p-6 space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h3 className="font-black text-xl uppercase tracking-tighter">{p.name}</h3>
                                    <p className="text-[10px] uppercase font-bold text-white/30 tracking-widest">{p.category}</p>
                                </div>
                                <p className="text-xl font-black text-spider-red">${p.price}</p>
                            </div>
                            
                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="flex gap-4 text-[10px] uppercase font-black tracking-widest text-white/20">
                                    <span>{p.analytics?.views || 0} Views</span>
                                    <span>{p.analytics?.clicks || 0} Clicks</span>
                                </div>
                                <div className="flex gap-2">
                                    <button className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                                        <Edit size={16} />
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(p.id)}
                                        className="w-10 h-10 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white transition-all"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* 3D PREVIEW MODAL */}
            {previewModel && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-spider-dark/90 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="glass-card w-full max-w-4xl rounded-[40px] p-8 relative border border-white/10 shadow-2xl">
                        <button 
                            onClick={() => setPreviewModel(null)}
                            className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl hover:bg-spider-red transition-all"
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-2xl font-black uppercase tracking-widest mb-8">Asset Visualization</h2>
                        <div className="h-[500px]">
                            <ThreeViewer modelUrl={previewModel} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
