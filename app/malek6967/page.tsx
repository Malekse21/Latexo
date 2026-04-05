"use client";

import { useState, useEffect } from "react";
import { Lock, LogOut, Check, Loader2, RefreshCw, X } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// Types
interface PendingOrder {
  id: string;
  userId: string;
  userName: string;
  packId: string;
  credits: number;
  amountDt: number;
  d17Phone: string;
  reference: string;
  createdAt: string;
}

interface Metrics {
  revenueToday: number;
  revenueWeek: number;
  revenueMonth: number;
  pendingCount: number;
  pendingValue: number;
  totalRevenue: number;
  avgPackValue: number;
  packBreakdown: Record<string, number>;
  totalUsers: number;
  newUsersToday: number;
  newUsersWeek: number;
  paidUsersCount: number;
  conversionRate: number;
  usersZeroCredits: number;
  avgCreditsPaidUser: number;
  users2PlusSessions: number;
  users5PlusSessions: number;
  avgSessionsPaidUser: number;
  usersActiveThisWeek: number;
  maxStreakAllTime: number;
  dormantTopUsers: Array<{
    name: string;
    sessions: number;
    daysSinceLast: number;
  }>;
  dailyChartData: Array<{
    date: string;
    fullDate: string;
    revenue: number;
    newUsers: number;
  }>;
}

function MetricCard({ title, value, suffix = "", isAlert = false }: { title: string, value: string | number, suffix?: string, isAlert?: boolean }) {
  return (
    <div className={`p-6 flex flex-col justify-between border-4 transition-transform hover:-translate-y-1 hover:translate-x-1 ${
      isAlert 
        ? 'border-red-600 bg-red-600 text-white shadow-[4px_4px_0px_#450a0a]' 
        : 'border-black bg-white text-black shadow-[4px_4px_0px_#000]'
    }`}>
      <span className={`text-xs font-black uppercase tracking-[0.2em] block mb-3 ${
        isAlert ? 'text-red-100' : 'text-neutral-500'
      }`}>
        {title}
      </span>
      <span className={`text-4xl lg:text-5xl font-black tracking-tighter ${
        isAlert ? 'text-white' : 'text-black'
      }`}>
        {value} 
        {suffix && (
          <span className={`text-xl lg:text-2xl font-black ml-2 ${
            isAlert ? 'text-red-200' : 'text-neutral-300'
          }`}>{suffix}</span>
        )}
      </span>
    </div>
  );
}

export default function AdminPortalPage() {
  const [token, setToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputToken, setInputToken] = useState("");
  
  // Data state
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'orders' | 'metrics'>('orders');

  // Sanitize token: strip any non-ASCII chars that break fetch headers
  const sanitizeToken = (raw: string): string =>
    raw.replace(/[^\x20-\x7E]/g, '').trim();

  // Restore session
  useEffect(() => {
    const saved = localStorage.getItem("OP_TOKEN");
    if (saved) {
      const clean = sanitizeToken(saved);
      if (clean) {
        setToken(clean);
        setIsAuthenticated(true);
        // Re-save sanitized version
        localStorage.setItem("OP_TOKEN", clean);
      } else {
        localStorage.removeItem("OP_TOKEN");
      }
    }
  }, []);

  // Fetch orders when authenticated
  useEffect(() => {
    if (isAuthenticated && token) {
      fetchOrders();
    }
  }, [isAuthenticated, token]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = sanitizeToken(inputToken);
    if (!clean) return;
    setToken(clean);
    setIsAuthenticated(true);
    localStorage.setItem("OP_TOKEN", clean);
    setInputToken("");
  };

  const handleLogout = () => {
    setToken("");
    setIsAuthenticated(false);
    setOrders([]);
    setMetrics(null);
    localStorage.removeItem("OP_TOKEN");
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [ordersRes, metricsRes] = await Promise.all([
        fetch("/api/admin/payments/orders/pending", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/admin/metrics", {
          headers: { Authorization: `Bearer ${token}` },
        })
      ]);

      if (ordersRes.status === 401 || metricsRes.status === 401) {
        handleLogout();
        setError("Token expiré ou invalide.");
        return;
      }

      if (!ordersRes.ok || !metricsRes.ok) throw new Error("Erreur de récupération.");
      
      const ordersData = await ordersRes.json();
      const metricsData = await metricsRes.json();
      
      setOrders(ordersData);
      setMetrics(metricsData);
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirm = async (orderId: string) => {
    setConfirmingId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payments/confirm/${orderId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 401) {
        handleLogout();
        return;
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la confirmation.");

      // Remove confirmed order from list and refresh metrics instead of just filtering
      // since the metrics data needs to update (e.g. Revenue Today goes up, Pending Value goes down)
      fetchOrders();
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setConfirmingId(null);
    }
  };

  const handleDelete = async (orderId: string) => {
    if (!window.confirm("Es-tu sûr de vouloir rejeter/supprimer cette commande ?")) {
      return;
    }
    setDeletingId(orderId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/payments/delete/${orderId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.status === 401) {
        handleLogout();
        return;
      }
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erreur lors de la suppression.");

      fetchOrders();
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setDeletingId(null);
    }
  };

  /* ─── AUTH SCREEN ──────────────────────────────────────────────────────── */
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 font-mono text-white">
        <form onSubmit={handleLogin} className="w-full max-w-sm space-y-6">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 border-4 border-white flex items-center justify-center mb-6">
              <Lock className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-black uppercase tracking-widest text-center">
              SYSTEM
            </h1>
            <p className="text-xs uppercase tracking-widest text-neutral-500 mt-2">
              RESTRICTED ACCESS
            </p>
          </div>

          <div className="space-y-4">
            <input
              type="password"
              autoComplete="new-password"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="ACCESS KEY"
              className="w-full bg-transparent border-2 border-neutral-700 p-4 text-center tracking-widest font-bold placeholder:text-neutral-700 focus:outline-none focus:border-white transition-colors"
            />
            {error && (
              <p className="text-red-500 text-xs font-bold text-center uppercase tracking-widest">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-white text-black font-black uppercase tracking-widest py-4 hover:bg-neutral-200 transition-colors"
            >
              AUTHENTICATE
            </button>
          </div>
        </form>
      </div>
    );
  }

  /* ─── DASHBOARD SCREEN ─────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-neutral-100 p-6 md:p-12 font-mono text-black">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 pb-6 border-b-4 border-black gap-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight uppercase">
              Operations
            </h1>
            <p className="text-sm font-bold text-neutral-500 mt-2 uppercase tracking-widest">
              Pending D17 Fulfillments
            </p>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={fetchOrders}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 border-2 border-black font-bold uppercase hover:bg-black hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 bg-black text-white font-bold uppercase hover:bg-neutral-800 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Lock System</span>
            </button>
          </div>
        </div>

        {/* Global Error */}
        {error && (
          <div className="mb-6 border-2 border-red-500 bg-red-50 p-4 text-red-600 font-bold uppercase tracking-wide">
            {error}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex gap-4 mb-8">
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-4 border-4 border-black font-black uppercase tracking-[0.2em] transition-transform ${activeTab === 'orders' ? 'bg-black text-white' : 'bg-white text-black hover:-translate-y-1 hover:translate-x-1 shadow-[4px_4px_0px_#000]'}`}
          >
            Pending Orders {orders.length > 0 && `(${orders.length})`}
          </button>
          <button 
            onClick={() => setActiveTab('metrics')}
            className={`flex-1 py-4 border-4 border-black font-black uppercase tracking-[0.2em] transition-transform flex items-center justify-center gap-2 ${activeTab === 'metrics' ? 'bg-black text-white' : 'bg-white text-black hover:-translate-y-1 hover:translate-x-1 shadow-[4px_4px_0px_#000]'}`}
          >
            Platform Metrics
            {metrics && (metrics.pendingCount > 0) && (
              <span className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></span>
            )}
          </button>
        </div>

        {/* METRICS DASHBOARD */}
        {activeTab === 'metrics' && metrics && (
          <div className="space-y-12">
            
            {/* SECTION 1 - REVENUE */}
            <div>
              <h2 className="text-2xl font-black uppercase tracking-widest mb-6 pb-2 border-b-4 border-black">
                Section 1 — Revenue
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Revenue Today" value={metrics.revenueToday} suffix="DT" />
                <MetricCard title="This Week" value={metrics.revenueWeek} suffix="DT" />
                <MetricCard title="This Month" value={metrics.revenueMonth} suffix="DT" />
                <MetricCard title="All Time" value={metrics.totalRevenue} suffix="DT" />
                
                <MetricCard 
                  title="Pending Value" 
                  value={metrics.pendingValue} 
                  suffix="DT" 
                  isAlert={metrics.pendingValue > 0} 
                />
                <MetricCard 
                  title="Pending Orders" 
                  value={metrics.pendingCount} 
                  isAlert={metrics.pendingCount > 0} 
                />
                <MetricCard title="Avg Pack Value" value={Math.round(metrics.avgPackValue)} suffix="DT" />
                
                <div className="bg-black text-white border-4 border-black p-6 flex flex-col justify-between shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:translate-x-1 transition-transform">
                  <span className="text-xs text-neutral-400 font-black uppercase tracking-[0.2em] block mb-4">
                    Top Packs
                  </span>
                  <div className="text-sm font-black flex-1 flex flex-col justify-center space-y-3">
                    {Object.keys(metrics.packBreakdown).length > 0 ? (
                      Object.entries(metrics.packBreakdown).map(([pack, count]) => (
                        <div key={pack} className="flex justify-between items-end border-b-2 border-neutral-800 pb-2 last:border-0 last:pb-0">
                          <span className="uppercase text-neutral-300 tracking-wider text-xs">{pack}</span>
                          <span className="text-xl leading-none">{count}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-neutral-600 text-xs">No data</span>
                    )}
                  </div>
                </div>
              </div>

              {/* REVENUE CHART */}
              {metrics.dailyChartData && metrics.dailyChartData.length > 0 && (
                <div className="mt-8 bg-white border-4 border-black shadow-[4px_4px_0px_#000] p-6 lg:p-8">
                  <span className="text-xs text-neutral-400 font-black uppercase tracking-[0.2em] block mb-6">
                    30-Day Trailing Revenue
                  </span>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontWeight: 600 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontWeight: 600 }} dx={-10} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '0px', fontSize: '13px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#fff' }}
                          cursor={{ stroke: '#000', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area type="monotone" dataKey="revenue" stroke="#000" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 2 - USERS */}
            <div>
              <h2 className="text-2xl font-black uppercase tracking-widest mb-6 pb-2 border-b-4 border-black">
                Section 2 — Users
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="Total Users" value={metrics.totalUsers} />
                <MetricCard title="New Today" value={metrics.newUsersToday} />
                <MetricCard title="New This Week" value={metrics.newUsersWeek} />
                <MetricCard title="Paid Users" value={metrics.paidUsersCount} />
                
                <MetricCard title="Conversion %" value={metrics.conversionRate.toFixed(1)} suffix="%" />
                <MetricCard title="Users w/ 0 CR" value={metrics.usersZeroCredits} />
                <MetricCard title="Avg CR (Paid)" value={Math.round(metrics.avgCreditsPaidUser)} suffix="CR" />
              </div>

              {/* NEW USERS CHART */}
              {metrics.dailyChartData && metrics.dailyChartData.length > 0 && (
                <div className="mt-8 bg-white border-4 border-black shadow-[4px_4px_0px_#000] p-6 lg:p-8">
                  <span className="text-xs text-neutral-400 font-black uppercase tracking-[0.2em] block mb-6">
                    30-Day New Users
                  </span>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={metrics.dailyChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                          <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#000" stopOpacity={0.1}/>
                            <stop offset="95%" stopColor="#000" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontWeight: 600 }} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#888', fontWeight: 600 }} dx={-10} />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#000', color: '#fff', border: 'none', borderRadius: '0px', fontSize: '13px', fontWeight: 'bold' }}
                          itemStyle={{ color: '#fff' }}
                          cursor={{ stroke: '#000', strokeWidth: 1, strokeDasharray: '4 4' }}
                        />
                        <Area type="step" dataKey="newUsers" stroke="#000" strokeWidth={4} fillOpacity={1} fill="url(#colorUsers)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>

            {/* SECTION 3 - RETENTION */}
            <div>
              <h2 className="text-2xl font-black uppercase tracking-widest mb-6 pb-2 border-b-4 border-black">
                Section 3 — Retention
              </h2>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <MetricCard title="2+ Sessions" value={metrics.users2PlusSessions} />
                <MetricCard title="Power (5+)" value={metrics.users5PlusSessions} />
                <MetricCard title="Avg Sess. (Paid)" value={metrics.avgSessionsPaidUser.toFixed(1)} />
                <MetricCard title="Active This Week" value={metrics.usersActiveThisWeek} />
                <MetricCard title="Max Platform Streak" value={metrics.maxStreakAllTime} suffix="Days" />
                
                <div className="bg-black text-white border-4 border-black p-6 flex flex-col justify-between shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:translate-x-1 transition-transform col-span-2 lg:col-span-3">
                  <span className="text-xs text-neutral-400 font-black uppercase tracking-[0.2em] block mb-4">
                    At-Risk Top Users (Going Cold)
                  </span>
                  <div className="text-sm font-black flex-1 flex flex-col justify-center space-y-3">
                    {metrics.dormantTopUsers.length > 0 ? (
                      metrics.dormantTopUsers.map((user, idx) => (
                        <div key={idx} className="flex justify-between items-end border-b-2 border-neutral-800 pb-2 last:border-0 last:pb-0">
                          <span className="uppercase text-neutral-300 tracking-wider text-xs">{user.name}</span>
                          <div className="flex items-center gap-4 text-xs font-bold">
                            <span className="text-neutral-500">{user.sessions} Sessions</span>
                            <span className="text-red-400">{user.daysSinceLast} days inactive</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <span className="text-neutral-600 text-xs">No users at risk.</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* LIST DASHBOARD */}
        {activeTab === 'orders' && (
          <div>
            {isLoading && orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 opacity-50">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <span className="uppercase tracking-widest font-bold">Scanning...</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="border-4 border-black border-dashed p-16 text-center">
                <p className="text-2xl font-black uppercase text-neutral-400">
                  No Pending Orders
                </p>
                <p className="text-sm font-bold text-neutral-400 mt-2">
                  System is clear.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {orders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border-2 border-black p-6 flex flex-col justify-between"
                  >
                    <div className="space-y-4 mb-8">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="bg-black text-white text-[10px] uppercase font-black px-2 py-1 mb-2 inline-block">
                            {order.packId}
                          </span>
                          <h3 className="text-2xl font-black tracking-tighter">
                            +{order.credits} CR
                          </h3>
                          <p className="text-xl font-bold text-neutral-500">
                            {Number(order.amountDt).toFixed(3)} DT
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-neutral-400">
                            {new Date(order.createdAt).toLocaleDateString()}
                          </p>
                          <p className="text-xs font-bold text-neutral-400">
                            {new Date(order.createdAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <div className="pt-4 border-t-2 border-black border-dashed grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
                            D17 Sender
                          </span>
                          <span className="font-black text-lg">
                            {order.d17Phone}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
                            Reference
                          </span>
                          <span className="font-bold">
                            {order.reference}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-[10px] text-neutral-400 font-bold uppercase block mb-1">
                            User
                          </span>
                          <span className="font-bold text-sm">
                            {order.userName}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button
                        onClick={() => handleDelete(order.id)}
                        disabled={deletingId === order.id || confirmingId === order.id}
                        className="w-full bg-white text-red-600 border-2 border-red-200 p-4 font-black uppercase flex items-center justify-center gap-2 hover:bg-red-50 hover:border-red-600 disabled:opacity-50 transition-colors"
                      >
                        {deletingId === order.id ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Deleting...
                          </>
                        ) : (
                          <>
                            <X className="w-5 h-5" />
                            Reject
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleConfirm(order.id)}
                        disabled={confirmingId === order.id || deletingId === order.id}
                        className="w-full bg-black text-white p-4 font-black uppercase flex items-center justify-center gap-2 hover:bg-neutral-800 disabled:opacity-50 transition-colors"
                      >
                        {confirmingId === order.id ? (
                          <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            Confirming...
                          </>
                        ) : (
                          <>
                            <Check className="w-5 h-5" />
                            Acknowledge
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
