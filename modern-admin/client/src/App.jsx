import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  PlusCircle, 
  Package, 
  BarChart3, 
  LogOut, 
  Search,
  Box
} from 'lucide-react';
import axios from 'axios';
import ThreeViewer from './components/ThreeViewer';
import ProductForm from './components/ProductForm';
import ProductList from './components/ProductList';

// API BASE
const API = axios.create({ 
    baseURL: import.meta.env.VITE_API_URL || 'https://spiderman-backend-1.onrender.com/api' 
});

// --- HELPERS ---
const getToken = () => localStorage.getItem('token');
const saveToken = (t) => localStorage.setItem('token', t);

// --- PROTECTED ROUTE ---
const ProtectedRoute = ({ children }) => {
  if (!getToken()) return <Navigate to="/login" />;
  return children;
};

// --- COMPONENTS ---

const Dashboard = () => {
    const [stats, setStats] = useState({ totalProducts: 0, totalCategories: 0, recentUploads: [] });
    
    useEffect(() => {
        const fetchStats = async () => {
            try {
                const res = await API.get('/stats', { headers: { 'x-auth-token': getToken() } });
                setStats(res.data);
            } catch (err) { console.error('Stats fetch failed'); }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <header>
                <h1 className="text-4xl font-black uppercase tracking-tighter">Mission Command</h1>
                <p className="text-white/40">Status update from the Spidey Arsenal</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Total Gear', val: stats.totalProducts, icon: <Package />, color: 'text-spider-red' },
                    { label: 'Categories', val: stats.totalCategories, icon: <LayoutDashboard />, color: 'text-spider-blue' },
                    { label: 'Avg. Rating', val: '4.8', icon: <BarChart3 />, color: 'text-green-500' }
                ].map((s, i) => (
                    <div key={i} className="glass-card p-6 rounded-3xl flex items-center gap-6 border border-white/5">
                        <div className={`p-4 rounded-2xl bg-white/5 ${s.color}`}>{s.icon}</div>
                        <div>
                            <p className="text-3xl font-black">{s.val}</p>
                            <p className="text-xs uppercase tracking-widest text-white/30 font-bold">{s.label}</p>
                        </div>
                    </div>
                ))}
            </div>

            <section className="glass-card p-8 rounded-[40px] border border-white/5">
                <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                    <BarChart3 className="text-spider-red" />
                    Recently Deployed Gear
                </h2>
                <div className="space-y-4">
                    {stats.recentUploads.map((p, i) => (
                        <div key={p.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-spider-light rounded-xl overflow-hidden">
                                  <img src={p.imageUrl} className="w-full h-full object-cover" alt="" />
                                </div>
                                <div>
                                    <p className="font-bold">{p.name}</p>
                                    <p className="text-xs text-white/40">{p.category} — ${p.price}</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 bg-spider-red/20 text-spider-red text-[10px] font-black uppercase rounded-full tracking-widest">
                                {p.status}
                            </span>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
};

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const res = await API.post('/auth/login', { email, password });
            saveToken(res.data.token);
            navigate('/');
        } catch (err) { alert('Invalid login credentials'); }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-6">
            <div className="glass-card p-10 rounded-[40px] w-full max-w-md border border-white/10 shadow-2xl">
                <div className="flex flex-col items-center mb-10">
                    <div className="w-16 h-16 bg-spider-red rounded-2xl flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(255,51,71,0.5)]">
                        <LogOut className="rotate-180" />
                    </div>
                    <h1 className="text-2xl font-black uppercase tracking-widest">Spider Login</h1>
                    <p className="text-white/40 text-sm">Authorized Web-Heads Only</p>
                </div>
                <form onSubmit={handleLogin} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-black text-white/40 pl-2">Email</label>
                        <input 
                          type="email" 
                          className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-spider-red transition-all"
                          placeholder="admin@spiderman.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] uppercase tracking-widest font-black text-white/40 pl-2">Password</label>
                        <input 
                          type="password" 
                          className="w-full bg-white/5 border border-white/10 p-4 rounded-2xl outline-none focus:border-spider-red transition-all"
                          placeholder="••••••••"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                    <button className="w-full bg-spider-red p-4 rounded-2xl font-black uppercase tracking-widest shadow-[0_0_20px_rgba(255,51,71,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all">
                        Enter Console
                    </button>
                    <button 
                      type="button"
                      onClick={() => API.post('/auth/seed')}
                      className="w-full text-[10px] text-white/30 hover:text-white transition-colors"
                    >
                      Seed Admin Account
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- APP ---
export default function App() {
  return (
    <Router>
      <div className="min-h-screen bg-spider-dark text-white font-body selection:bg-spider-red selection:text-white">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/*" element={
            <ProtectedRoute>
              <div className="flex min-h-screen">
                {/* Sidebar */}
                <aside className="w-[300px] border-r border-white/5 p-8 flex flex-col justify-between hidden md:flex">
                  <div>
                    <div className="flex items-center gap-3 mb-12">
                      <div className="w-10 h-10 bg-spider-red rounded-xl flex items-center justify-center">
                        <BarChart3 size={20} />
                      </div>
                      <span className="font-black text-xl tracking-tighter uppercase">Spider<span className="text-spider-red">OS</span></span>
                    </div>
                    <nav className="space-y-2">
                      {[
                        { to: '/', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
                        { to: '/add', icon: <PlusCircle size={20} />, label: 'Add Gear' },
                        { to: '/products', icon: <Package size={20} />, label: 'Manage' },
                      ].map((link, i) => (
                        <Link 
                          key={i}
                          to={link.to} 
                          className="flex items-center gap-4 p-4 rounded-2xl hover:bg-white/5 text-white/40 hover:text-white transition-all font-bold group"
                        >
                          <span className="group-hover:text-spider-red transition-colors">{link.icon}</span>
                          {link.label}
                        </Link>
                      ))}
                    </nav>
                  </div>
                  <button 
                    onClick={() => { localStorage.removeItem('token'); window.location.reload(); }}
                    className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-spider-red transition-all font-bold"
                  >
                    <LogOut size={20} /> Logout
                  </button>
                </aside>

                {/* Content */}
                <main className="flex-1 p-12 overflow-y-auto">
                    <div className="max-w-6xl mx-auto">
                        <Routes>
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/add" element={<ProductForm />} />
                            <Route path="/products" element={<ProductList />} />
                        </Routes>
                    </div>
                </main>
              </div>
            </ProtectedRoute>
          } />
        </Routes>
      </div>
    </Router>
  );
}
