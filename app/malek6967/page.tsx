"use client";

import { useState, useEffect } from "react";
import { Lock, LogOut, Check, Loader2, RefreshCw } from "lucide-react";

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

export default function AdminPortalPage() {
  const [token, setToken] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputToken, setInputToken] = useState("");
  
  // Data state
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  // Restore session
  useEffect(() => {
    const saved = localStorage.getItem("OP_TOKEN");
    if (saved) {
      setToken(saved);
      setIsAuthenticated(true);
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
    if (!inputToken.trim()) return;
    setToken(inputToken.trim());
    setIsAuthenticated(true);
    localStorage.setItem("OP_TOKEN", inputToken.trim());
    setInputToken("");
  };

  const handleLogout = () => {
    setToken("");
    setIsAuthenticated(false);
    setOrders([]);
    localStorage.removeItem("OP_TOKEN");
  };

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/payments/orders/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401) {
        handleLogout();
        setError("Token expiré ou invalide.");
        return;
      }
      if (!res.ok) throw new Error("Erreur de récupération.");
      const data = await res.json();
      setOrders(data);
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

      // Remove confirmed order from list
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
    } catch (err: any) {
      setError(err.message || "Erreur de connexion.");
    } finally {
      setConfirmingId(null);
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

        {/* List */}
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

                <button
                  onClick={() => handleConfirm(order.id)}
                  disabled={confirmingId === order.id}
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
                      Acknowledge Payment
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
