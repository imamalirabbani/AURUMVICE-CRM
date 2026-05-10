import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { 
  MessageSquare, Users, BarChart2, Settings, Send, User, Bot, Activity, DollarSign,
  Sun, Moon, Shield, LogOut, Plus, Trash2, Clock, Bell, Edit3, Check, X, BookOpen, Database
} from 'lucide-react';
import './index.css';

const socket = io('http://localhost:5000');
const API = 'http://localhost:5000/api';

function App() {
  const [theme, setTheme] = useState('dark');
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem('crm_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [activeTab, setActiveTab] = useState('chat');
  const [isConnected, setIsConnected] = useState(socket.connected);

  // Chat
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);

  // Default welcome message if no history
  useEffect(() => {
    if (messages.length === 0 && currentUser) {
      setMessages([{ 
        id: 1, 
        text: `Halo! Saya Asisten AI Aurumvice. Ada yang bisa saya bantu hari ini?`, 
        sender: "ai", 
        timestamp: new Date().toISOString() 
      }]);
    }
  }, [currentUser]);

  // Customers
  const [customersData, setCustomersData] = useState([]);
  const [showCustForm, setShowCustForm] = useState(false);
  const [custForm, setCustForm] = useState({ name: '', company: '', email: '', phone: '', status: 'active' });
  const [editCustId, setEditCustId] = useState(null);

  // Sales
  const [salesData, setSalesData] = useState([]);
  const [showSaleForm, setShowSaleForm] = useState(false);
  const [saleForm, setSaleForm] = useState({ customer_id: '', deal_name: '', amount: '', stage: 'prospect' });

  // Reminders
  const [reminders, setReminders] = useState([]);
  const [showRemForm, setShowRemForm] = useState(false);
  const [remForm, setRemForm] = useState({ description: '', remind_at: '' });

  // Knowledge Base
  const [knowledgeData, setKnowledgeData] = useState([]);
  const [showKbForm, setShowKbForm] = useState(false);
  const [kbForm, setKbForm] = useState({ category: '', content: '' });

  // Dashboard
  const [dashStats, setDashStats] = useState(null);

  useEffect(() => { document.body.setAttribute('data-theme', theme); }, [theme]);

  // Socket connection
  useEffect(() => {
    setIsConnected(socket.connected);
    const onConnect = () => setIsConnected(true);
    const onDisconnect = () => setIsConnected(false);
    const onReceiveMessage = (data) => {
      if (data.sender === 'ai' || data.sender === 'error') {
        setIsTyping(false);
        setMessages(prev => [...prev, { id: Date.now(), text: data.message, sender: data.sender, timestamp: data.timestamp || new Date().toISOString() }]);
      }
    };
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('receive_message', onReceiveMessage);
    return () => { socket.off('connect', onConnect); socket.off('disconnect', onDisconnect); socket.off('receive_message', onReceiveMessage); };
  }, []);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, isTyping]);

  // Fetch helpers
  const fetchCustomers = async () => { try { const r = await fetch(`${API}/customers`); setCustomersData(await r.json()); } catch(e){} };
  const fetchSales = async () => { try { const r = await fetch(`${API}/sales`); setSalesData(await r.json()); } catch(e){} };
  const fetchReminders = async () => { try { const r = await fetch(`${API}/reminders`); setReminders(await r.json()); } catch(e){} };
  const fetchDashboard = async () => { try { const r = await fetch(`${API}/dashboard`); setDashStats(await r.json()); } catch(e){} };
  const fetchKnowledge = async () => { try { const r = await fetch(`${API}/knowledge`); setKnowledgeData(await r.json()); } catch(e){} };
  const fetchChatHistory = async () => {
    try {
      const r = await fetch(`${API}/messages`);
      const data = await r.json();
      if (data.length > 0) {
        setMessages(data.map(m => ({ id: m.id, text: m.text, sender: m.sender, timestamp: m.timestamp })));
      } else {
        setMessages([{ id: 1, text: "Halo! Saya Asisten AI CRM Anda. Ada yang bisa saya bantu hari ini?", sender: "ai", timestamp: new Date().toISOString() }]);
      }
    } catch(e) {
      setMessages([{ id: 1, text: "Halo! Saya Asisten AI CRM Anda. Ada yang bisa saya bantu hari ini?", sender: "ai", timestamp: new Date().toISOString() }]);
    }
  };

  useEffect(() => {
    if (!currentUser) return;
    fetchDashboard();
    if (activeTab === 'chat') fetchChatHistory();
    if (activeTab === 'customers') fetchCustomers();
    if (activeTab === 'sales') { fetchSales(); fetchCustomers(); }
    if (activeTab === 'reminders') fetchReminders();
    if (activeTab === 'settings') fetchKnowledge();
  }, [currentUser, activeTab]);

  // --- HANDLERS ---
  const handleLogin = async (e) => {
    e.preventDefault(); setLoginError('');
    try {
      const res = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
      const data = await res.json();
      if (data.success) {
        setCurrentUser(data.user);
        localStorage.setItem('crm_user', JSON.stringify(data.user));
      } else {
        setLoginError(data.message);
      }
    } catch { setLoginError("Koneksi gagal. Pastikan server berjalan."); }
  };

  const handleLogout = () => {
    if (confirm('Apakah Anda yakin ingin keluar?')) {
      setCurrentUser(null);
      localStorage.removeItem('crm_user');
      // Optional: Clear messages if you want a fresh start on next login
      // setMessages([]); 
    }
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    setMessages(prev => [...prev, { id: Date.now(), text: input, sender: "user", timestamp: new Date().toISOString() }]);
    socket.emit('send_message', { message: input });
    setInput('');
    setIsTyping(true);
  };

  // Customer handlers
  const handleSaveCust = async (e) => {
    e.preventDefault();
    if (editCustId) {
      await fetch(`${API}/customers/${editCustId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(custForm) });
    } else {
      await fetch(`${API}/customers`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(custForm) });
    }
    setCustForm({ name: '', company: '', email: '', phone: '', status: 'active' });
    setShowCustForm(false); setEditCustId(null);
    fetchCustomers(); fetchDashboard();
  };
  const handleEditCust = (c) => { setCustForm({ name: c.name, company: c.company, email: c.email, phone: c.phone, status: c.status }); setEditCustId(c.id); setShowCustForm(true); };
  const handleDeleteCust = async (id) => { if(confirm('Hapus pelanggan ini?')){ await fetch(`${API}/customers/${id}`, { method: 'DELETE' }); fetchCustomers(); fetchDashboard(); }};

  // Sales handlers
  const handleAddSale = async (e) => {
    e.preventDefault();
    await fetch(`${API}/sales`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(saleForm) });
    setSaleForm({ customer_id: '', deal_name: '', amount: '', stage: 'prospect' }); setShowSaleForm(false);
    fetchSales(); fetchDashboard();
  };
  const handleUpdateStage = async (id, stage) => { await fetch(`${API}/sales/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stage }) }); fetchSales(); fetchDashboard(); };
  const handleDeleteSale = async (id) => { if(confirm('Hapus deal ini?')){ await fetch(`${API}/sales/${id}`, { method: 'DELETE' }); fetchSales(); fetchDashboard(); }};

  // Reminder handlers
  const handleAddReminder = async (e) => {
    e.preventDefault();
    await fetch(`${API}/reminders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...remForm, user_id: currentUser.id }) });
    setRemForm({ description: '', remind_at: '' }); setShowRemForm(false); fetchReminders(); fetchDashboard();
  };
  const handleDoneReminder = async (id) => { await fetch(`${API}/reminders/${id}/done`, { method: 'PUT' }); fetchReminders(); fetchDashboard(); };
  const handleDeleteReminder = async (id) => { await fetch(`${API}/reminders/${id}`, { method: 'DELETE' }); fetchReminders(); fetchDashboard(); };

  // Knowledge Base handlers
  const handleAddKb = async (e) => {
    e.preventDefault();
    await fetch(`${API}/knowledge`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(kbForm) });
    setKbForm({ category: '', content: '' }); setShowKbForm(false); fetchKnowledge();
  };
  const handleDeleteKb = async (id) => { await fetch(`${API}/knowledge/${id}`, { method: 'DELETE' }); fetchKnowledge(); };

  // ===== LOGIN =====
  if (!currentUser) {
    return (
      <div className="login-container glass" style={{ width: '420px', padding: '40px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <img src="/logo.png" alt="Logo" style={{ width: '80px', height: '80px', objectFit: 'contain', borderRadius: '16px' }} />
          <h2 style={{ marginTop: '16px', fontSize: '1.5rem' }}>Aurumvice Portal</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '8px' }}>admin / admin123 &nbsp;|&nbsp; staff / staff123</p>
        </div>
        {loginError && <div style={{ background: '#ef444433', color: '#fca5a5', padding: '12px', borderRadius: '8px', marginBottom: '20px', fontSize: '0.85rem' }}>{loginError}</div>}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <input type="text" placeholder="Username" className="input-glass" value={username} onChange={e => setUsername(e.target.value)} style={{ width: '100%', padding: '12px 20px' }} />
          <input type="password" placeholder="Password" className="input-glass" value={password} onChange={e => setPassword(e.target.value)} style={{ width: '100%', padding: '12px 20px' }} />
          <button type="submit" className="send-btn" style={{ width: '100%', borderRadius: '12px', marginTop: '10px' }}>Masuk</button>
        </form>
      </div>
    );
  }

  const tabTitles = { chat: 'Asisten Virtual', customers: 'Manajemen Pelanggan', sales: 'Sales Pipeline', reminders: 'Reminders & Follow-up', settings: 'Knowledge Base & Integrasi' };

  // ===== MAIN APP =====
  return (
    <div className="app-container glass">
      {/* SIDEBAR */}
      <aside className="sidebar">
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <img src="/logo.png" alt="Logo" style={{ width: '32px', height: '32px', objectFit: 'contain', borderRadius: '6px' }} />
            <h2 style={{ fontSize: '1.1rem' }}>Aurumvice</h2>
          </div>
          <button onClick={handleLogout} style={{ background:'transparent', border:'none', color:'var(--text-secondary)', cursor:'pointer' }} title="Logout"><LogOut size={18} /></button>
        </div>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--panel-border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '40px', height: '40px', background: 'var(--accent-color)', borderRadius: '50%', display:'flex', justifyContent:'center', alignItems:'center' }}><User size={20} color="white"/></div>
          <div>
            <div style={{ fontWeight: '600' }}>{currentUser.username}</div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Role: {currentUser.role}</div>
          </div>
        </div>
        <nav className="nav-links">
          {[
            { key: 'chat', icon: <MessageSquare size={20}/>, label: 'AI Assistant' },
            { key: 'customers', icon: <Users size={20}/>, label: 'Customers' },
            { key: 'sales', icon: <BarChart2 size={20}/>, label: 'Sales Pipeline' },
            { key: 'reminders', icon: <Bell size={20}/>, label: 'Reminders' },
            { key: 'settings', icon: <Database size={20}/>, label: 'Knowledge Base' },
          ].map(t => (
            <div key={t.key} className={`nav-item ${activeTab === t.key ? 'active' : ''}`} onClick={() => setActiveTab(t.key)}>
              {t.icon}<span>{t.label}</span>
              {t.key === 'reminders' && dashStats?.pendingReminders > 0 && (
                <span style={{ marginLeft: 'auto', background: '#ef4444', color: 'white', borderRadius: '50%', width: '20px', height: '20px', fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{dashStats.pendingReminders}</span>
              )}
            </div>
          ))}
        </nav>
      </aside>

      {/* MAIN */}
      <main className="main-chat" style={{ background: activeTab !== 'chat' ? 'var(--panel-bg)' : '' }}>
        <header className="chat-header">
          <h3>{tabTitles[activeTab]}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div className="connected-status">
              <div className="status-dot" style={{ backgroundColor: isConnected ? '#22c55e' : '#ef4444' }}></div>
              {isConnected ? 'Online' : 'Offline'}
            </div>
            <button onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}>
              {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
            </button>
          </div>
        </header>

        {/* ===== CHAT ===== */}
        {activeTab === 'chat' && (<>
          <div className="chat-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                <div className={`message ${msg.sender}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', opacity: 0.8, fontSize: '0.8rem' }}>
                    {msg.sender === 'user' ? <User size={14}/> : <Bot size={14}/>}
                    {msg.sender === 'user' ? 'Anda' : 'Asisten AI'}
                  </div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{msg.text}</div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message-wrapper ai">
                <div className="message ai" style={{ opacity: 0.7 }}>
                  <Bot size={14}/> <em>AI sedang mengetik...</em>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          <form className="chat-input-container" onSubmit={handleSend}>
            <div className="input-glass">
              <input type="text" placeholder="Tanyakan apapun tentang CRM Anda..." value={input} onChange={(e) => setInput(e.target.value)} />
              <button type="submit" className="send-btn" disabled={!input.trim() || isTyping}><Send size={18} /></button>
            </div>
          </form>
        </>)}

        {/* ===== CUSTOMERS ===== */}
        {activeTab === 'customers' && (
          <div style={{ padding: '30px', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{customersData.length} pelanggan terdaftar</span>
              <button className="send-btn" onClick={() => { setShowCustForm(!showCustForm); setEditCustId(null); setCustForm({ name:'', company:'', email:'', phone:'', status:'active' }); }} style={{ width: 'auto', padding: '0 20px', gap: '8px' }}>
                <Plus size={16}/> Tambah
              </button>
            </div>
            {showCustForm && (
              <form onSubmit={handleSaveCust} className="crm-card" style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '16px' }}>{editCustId ? 'Edit Pelanggan' : 'Pelanggan Baru'}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <input className="input-glass" placeholder="Nama *" required value={custForm.name} onChange={e => setCustForm({...custForm, name: e.target.value})} style={{ padding: '10px 16px' }} />
                  <input className="input-glass" placeholder="Perusahaan" value={custForm.company} onChange={e => setCustForm({...custForm, company: e.target.value})} style={{ padding: '10px 16px' }} />
                  <input className="input-glass" placeholder="Email" type="email" value={custForm.email} onChange={e => setCustForm({...custForm, email: e.target.value})} style={{ padding: '10px 16px' }} />
                  <input className="input-glass" placeholder="Telepon" value={custForm.phone} onChange={e => setCustForm({...custForm, phone: e.target.value})} style={{ padding: '10px 16px' }} />
                </div>
                <select value={custForm.status} onChange={e => setCustForm({...custForm, status: e.target.value})} className="input-glass" style={{ padding: '10px 16px', marginTop: '12px', width: '100%' }}>
                  <option value="active">Active</option><option value="pending">Pending</option><option value="inactive">Inactive</option>
                </select>
                <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                  <button type="submit" className="send-btn" style={{ flex: 1, borderRadius: '12px' }}>Simpan</button>
                  <button type="button" onClick={() => { setShowCustForm(false); setEditCustId(null); }} className="send-btn" style={{ flex: 1, borderRadius: '12px', background: 'var(--text-secondary)' }}>Batal</button>
                </div>
              </form>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {customersData.map(c => (
                <div key={c.id} className="crm-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '1rem' }}>{c.name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{c.company || '-'} &bull; {c.email || '-'} &bull; {c.phone || '-'}</div>
                    <span style={{ display: 'inline-block', marginTop: '6px', padding: '2px 10px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: '600',
                      background: c.status === 'active' ? '#22c55e22' : c.status === 'pending' ? '#eab30822' : '#ef444422',
                      color: c.status === 'active' ? '#22c55e' : c.status === 'pending' ? '#eab308' : '#ef4444' }}>{c.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => handleEditCust(c)} style={{ background: 'transparent', border: 'none', color: 'var(--accent-color)', cursor: 'pointer' }}><Edit3 size={16}/></button>
                    <button onClick={() => handleDeleteCust(c.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== SALES ===== */}
        {activeTab === 'sales' && (
          <div style={{ padding: '30px', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
              {[{l:'Prospect',k:'prospects',clr:'#3b82f6'},{l:'Negotiation',k:'negotiations',clr:'#eab308'},{l:'Won',k:'won',clr:'#22c55e'},{l:'Lost',k:'lost',clr:'#ef4444'}].map(s => (
                <div key={s.k} className="crm-card" style={{ flex: 1, textAlign: 'center' }}>
                  <div className="crm-card-title">{s.l}</div>
                  <div className="crm-card-value" style={{ color: s.clr }}>{dashStats?.[s.k] ?? 0}</div>
                </div>
              ))}
            </div>
            <button className="send-btn" onClick={() => setShowSaleForm(!showSaleForm)} style={{ width: 'auto', padding: '0 20px', marginBottom: '20px', gap: '8px' }}>
              <Plus size={16}/> Tambah Deal
            </button>
            {showSaleForm && (
              <form onSubmit={handleAddSale} className="crm-card" style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '16px' }}>Deal Baru</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <select className="input-glass" required value={saleForm.customer_id} onChange={e => setSaleForm({...saleForm, customer_id: e.target.value})} style={{ padding: '10px 16px' }}>
                    <option value="">-- Pilih Pelanggan --</option>
                    {customersData.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                  <input className="input-glass" placeholder="Nama Deal *" required value={saleForm.deal_name} onChange={e => setSaleForm({...saleForm, deal_name: e.target.value})} style={{ padding: '10px 16px' }} />
                  <input className="input-glass" placeholder="Nominal (Rp)" type="number" required value={saleForm.amount} onChange={e => setSaleForm({...saleForm, amount: e.target.value})} style={{ padding: '10px 16px' }} />
                  <select className="input-glass" value={saleForm.stage} onChange={e => setSaleForm({...saleForm, stage: e.target.value})} style={{ padding: '10px 16px' }}>
                    <option value="prospect">Prospect</option><option value="negotiation">Negotiation</option><option value="won">Won</option><option value="lost">Lost</option>
                  </select>
                </div>
                <button type="submit" className="send-btn" style={{ width: '100%', marginTop: '16px', borderRadius: '12px' }}>Simpan</button>
              </form>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {salesData.map(s => (
                <div key={s.id} className="crm-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600' }}>{s.deal_name}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{s.customer_name || '-'} &bull; Rp {Number(s.amount).toLocaleString('id-ID')}</div>
                  </div>
                  <div style={{ display: 'flex', gap:'8px', alignItems:'center' }}>
                    <select value={s.stage} onChange={e => handleUpdateStage(s.id, e.target.value)} className="input-glass" style={{ padding: '6px 12px', fontSize: '0.8rem', width: 'auto' }}>
                      <option value="prospect">Prospect</option><option value="negotiation">Negotiation</option><option value="won">Won ✅</option><option value="lost">Lost ❌</option>
                    </select>
                    <button onClick={() => handleDeleteSale(s.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== REMINDERS ===== */}
        {activeTab === 'reminders' && (
          <div style={{ padding: '30px', flex: 1, overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px', alignItems: 'center' }}>
              <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{reminders.filter(r=>!r.is_completed).length} reminder aktif</span>
              <button className="send-btn" onClick={() => setShowRemForm(!showRemForm)} style={{ width: 'auto', padding: '0 20px', gap: '8px' }}>
                <Plus size={16}/> Tambah Reminder
              </button>
            </div>
            {showRemForm && (
              <form onSubmit={handleAddReminder} className="crm-card" style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '16px' }}>Reminder / Follow-up Baru</h4>
                <textarea className="input-glass" placeholder="Deskripsi follow-up..." required rows={3} value={remForm.description} onChange={e => setRemForm({...remForm, description: e.target.value})} style={{ padding: '10px 16px', width: '100%', resize: 'vertical', fontFamily: 'Inter, sans-serif' }} />
                <input className="input-glass" type="datetime-local" required value={remForm.remind_at} onChange={e => setRemForm({...remForm, remind_at: e.target.value})} style={{ padding: '10px 16px', width: '100%', marginTop: '12px' }} />
                <button type="submit" className="send-btn" style={{ width: '100%', marginTop: '16px', borderRadius: '12px' }}>Simpan</button>
              </form>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {reminders.map(r => (
                <div key={r.id} className="crm-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', opacity: r.is_completed ? 0.5 : 1 }}>
                  <Clock size={20} color={r.is_completed ? 'var(--text-secondary)' : 'var(--accent-color)'} style={{ flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', textDecoration: r.is_completed ? 'line-through' : 'none' }}>{r.description}</div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>Jadwal: {new Date(r.remind_at).toLocaleString('id-ID')}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {!r.is_completed && <button onClick={() => handleDoneReminder(r.id)} style={{ background: 'transparent', border: 'none', color: '#22c55e', cursor: 'pointer' }} title="Tandai selesai"><Check size={18}/></button>}
                    <button onClick={() => handleDeleteReminder(r.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }} title="Hapus"><Trash2 size={16}/></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== KNOWLEDGE BASE & SETTINGS ===== */}
        {activeTab === 'settings' && (
          <div style={{ padding: '30px', flex: 1, overflowY: 'auto' }}>
            <h4 style={{ marginBottom: '8px' }}>Knowledge Base AI</h4>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>Data ini digunakan oleh AI sebagai konteks saat menjawab pertanyaan.</p>
            <button className="send-btn" onClick={() => setShowKbForm(!showKbForm)} style={{ width: 'auto', padding: '0 20px', marginBottom: '20px', gap: '8px' }}>
              <Plus size={16}/> Tambah Pengetahuan
            </button>
            {showKbForm && (
              <form onSubmit={handleAddKb} className="crm-card" style={{ marginBottom: '20px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
                  <input className="input-glass" placeholder="Kategori" required value={kbForm.category} onChange={e => setKbForm({...kbForm, category: e.target.value})} style={{ padding: '10px 16px' }} />
                  <input className="input-glass" placeholder="Isi pengetahuan..." required value={kbForm.content} onChange={e => setKbForm({...kbForm, content: e.target.value})} style={{ padding: '10px 16px' }} />
                </div>
                <button type="submit" className="send-btn" style={{ width: '100%', marginTop: '12px', borderRadius: '12px' }}>Simpan ke KB</button>
              </form>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '30px' }}>
              {knowledgeData.map(k => (
                <div key={k.id} className="crm-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: '600', color: 'var(--accent-color)', textTransform: 'uppercase', fontSize: '0.8rem' }}>{k.category}</span>
                    <div style={{ marginTop: '4px' }}>{k.content}</div>
                  </div>
                  <button onClick={() => handleDeleteKb(k.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', flexShrink: 0 }}><Trash2 size={16}/></button>
                </div>
              ))}
            </div>

            <h4 style={{ marginBottom: '16px', marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--panel-border)' }}>Integrasi Platform</h4>
            <div className="crm-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ fontSize: '1rem' }}>WhatsApp Business API</h5>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Sambungkan untuk blast chat & follow-up</p>
              </div>
              <button className="send-btn" style={{ width: 'auto', padding: '0 20px', background: '#25D366' }}>Connect WA</button>
            </div>
            <div className="crm-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ fontSize: '1rem' }}>SMTP Email</h5>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Kirim reminder otomatis via email</p>
              </div>
              <button className="send-btn" style={{ width: 'auto', padding: '0 20px' }}>Configure</button>
            </div>
          </div>
        )}
      </main>

      {/* RIGHT PANEL */}
      {activeTab === 'chat' && (
        <aside className="crm-panel">
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '500', marginBottom: '8px' }}>CRM Overview</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Data real-time dari MySQL.</p>
          </div>
          <div className="crm-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="crm-card-title">Active Customers</div><Activity size={18} color="var(--text-secondary)" />
            </div>
            <div className="crm-card-value">{dashStats?.activeCustomers ?? 0}</div>
          </div>
          <div className="crm-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="crm-card-title">Pending</div><Users size={18} color="var(--text-secondary)" />
            </div>
            <div className="crm-card-value">{dashStats?.pendingCustomers ?? 0}</div>
          </div>
          <div className="crm-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="crm-card-title">Total Sales Won</div><DollarSign size={18} color="var(--text-secondary)" />
            </div>
            <div className="crm-card-value">Rp {dashStats ? Number(dashStats.totalSalesWon).toLocaleString('id-ID') : '0'}</div>
          </div>
          <div className="crm-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div className="crm-card-title">Pending Reminders</div><Bell size={18} color="var(--text-secondary)" />
            </div>
            <div className="crm-card-value">{dashStats?.pendingReminders ?? 0}</div>
          </div>
        </aside>
      )}
    </div>
  );
}

export default App;
