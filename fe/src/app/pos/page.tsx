'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  ShoppingCart, Search, Trash2, Plus, Minus, CreditCard, Banknote,
  Users, X, PlayCircle, StopCircle, Clock, ArrowLeft, Printer,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import api from '@/lib/api';

interface CartItem {
  id: string; productId: string; batchId?: string;
  name: string; sku: string; price: number; quantity: number; discount: number; subtotal: number;
  maxStock: number;
}
interface SessionData { id: string; outletId: string; status: string; openingCash: number; openedAt: string; outlet?: { name: string }; }
interface UserOutlet { id: string; location_type: string; location_id: string; location?: { id: string; code: string; name: string } }
interface ProductResult { id: string; sku: string; name: string; sellPrice: number; availableStock?: number; }

export default function POSPage() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [userOutlets, setUserOutlets] = useState<UserOutlet[]>([]);
  const [startForm, setStartForm] = useState({ outletId: '', openingCash: '' });
  const [showCloseForm, setShowCloseForm] = useState(false);
  const [closeForm, setCloseForm] = useState({ closingCash: '', notes: '' });
  const [sessionSummary, setSessionSummary] = useState<any>(null);
  const [staleSession, setStaleSession] = useState(false);

  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [memberPhone, setMemberPhone] = useState('');
  const [member, setMember] = useState<any>(null);
  const [showPayment, setShowPayment] = useState(false);
  const [cashAmount, setCashAmount] = useState('');
  const [processing, setProcessing] = useState(false);
  const scannerRef = useRef<HTMLInputElement>(null);

  const subtotal = cart.reduce((s, i) => s + i.subtotal, 0);
  const total = subtotal;
  const change = Number(cashAmount) - total;

  useEffect(() => { init(); }, []);

  const init = async () => {
    setSessionLoading(true);
    // Fetch user's assigned outlets
    let locs: UserOutlet[] = [];
    try {
      const locRes = await api.get('/auth/me/locations');
      locs = ((locRes.data.data ?? locRes.data ?? []) as UserOutlet[]).filter(l => l.location_type === 'outlet');
      setUserOutlets(locs);
      if (locs.length === 1) setStartForm(f => ({ ...f, outletId: locs[0].location_id }));
    } catch {}

    // If no assigned outlets (admin/superuser), fetch all outlets
    if (locs.length === 0) {
      try {
        const allRes = await api.get('/master/outlets');
        const allOutlets = (allRes.data.data ?? allRes.data ?? []) as any[];
        const mapped: UserOutlet[] = allOutlets.map(o => ({
          id: o.id, location_type: 'outlet', location_id: o.id,
          location: { id: o.id, code: o.code, name: o.name },
        }));
        setUserOutlets(mapped);
        if (mapped.length === 1) setStartForm(f => ({ ...f, outletId: mapped[0].location_id }));
      } catch {}
    }

    // Check active session
    try {
      const res = await api.get('/pos/sessions/active');
      const data = res.data.data ?? res.data;
      if (data && data.id) {
        if (new Date(data.openedAt).toDateString() !== new Date().toDateString()) setStaleSession(true);
        setSession(data);
      }
    } catch {}
    setSessionLoading(false);
  };

  const handleStartSession = async () => {
    if (!startForm.outletId || !startForm.openingCash) { toast.error('Masukkan kas awal'); return; }
    try {
      const res = await api.post('/pos/sessions/start', { outletId: startForm.outletId, openingCash: Number(startForm.openingCash) });
      setSession(res.data.data ?? res.data); setStaleSession(false);
      toast.success('Session started!');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Gagal start session'); }
  };

  const handleCloseSession = async () => {
    if (!session || !closeForm.closingCash) { toast.error('Masukkan kas akhir'); return; }
    try {
      const res = await api.put(`/pos/sessions/${session.id}/close`, { closingCash: Number(closeForm.closingCash), notes: closeForm.notes || undefined });
      setSessionSummary(res.data.data ?? res.data);
      setSession(null); setShowCloseForm(false); setCloseForm({ closingCash: '', notes: '' }); setCart([]); setStaleSession(false);
      toast.success('Session closed');
    } catch (err: any) { toast.error(err.response?.data?.message || 'Gagal close'); }
  };

  // --- SEARCH with stock info ---
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query || query.length < 1) { setSearchResults([]); setShowResults(false); return; }
    try { const qr = JSON.parse(query); if (qr.productId) { await addProductById(qr.productId); setSearchQuery(''); setShowResults(false); return; } } catch {}
    try {
      const res = await api.get(`/pos/products/search?q=${encodeURIComponent(query)}&outletId=${session?.outletId || ''}`);
      setSearchResults(res.data.data ?? res.data ?? []);
      setShowResults(true);
    } catch { setSearchResults([]); }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && searchResults.length === 1) {
      selectProduct(searchResults[0]); setSearchQuery(''); setShowResults(false);
    }
    if (e.key === 'Escape') setShowResults(false);
  };

  const selectProduct = (product: ProductResult) => {
    const stock = product.availableStock ?? 999;
    if (stock <= 0) { toast.error(`${product.name} — stok habis!`); return; }

    const existing = cart.find(i => i.productId === product.id);
    if (existing) {
      if (existing.quantity >= stock) { toast.error(`Stok maksimal: ${stock}`); return; }
      setCart(prev => prev.map(i => i.productId === product.id ? { ...i, quantity: i.quantity + 1, subtotal: i.price * (i.quantity + 1) } : i));
      toast.success(`${product.name} — qty ${(existing.quantity + 1)}`);
    } else {
      const price = Number(product.sellPrice);
      setCart(prev => [...prev, { id: `${product.id}-${Date.now()}`, productId: product.id, name: product.name, sku: product.sku, price, quantity: 1, discount: 0, subtotal: price, maxStock: stock }]);
      toast.success(`${product.name} added`);
    }
    setSearchQuery(''); setShowResults(false);
  };

  const addProductById = async (productId: string) => {
    try {
      const res = await api.get(`/pos/products/search?q=&outletId=${session?.outletId || ''}`);
      const products = res.data.data ?? res.data ?? [];
      const p = products.find((x: any) => x.id === productId);
      if (p) selectProduct(p);
      else toast.error('Produk tidak ditemukan');
    } catch { toast.error('Gagal cari produk'); }
  };

  const updateQuantity = (id: string, newQty: number) => {
    const item = cart.find(i => i.id === id);
    if (!item) return;
    if (newQty <= 0) { setCart(prev => prev.filter(i => i.id !== id)); toast.info('Item removed'); return; }
    if (newQty > item.maxStock) { toast.error(`Stok maksimal: ${item.maxStock}`); return; }
    setCart(prev => prev.map(i => i.id === id ? { ...i, quantity: newQty, subtotal: i.price * newQty } : i));
  };

  const removeFromCart = (id: string) => { setCart(prev => prev.filter(i => i.id !== id)); toast.info('Item removed'); };
  const clearCart = () => { setCart([]); setMember(null); setMemberPhone(''); setShowPayment(false); setCashAmount(''); };

  const handleMemberLookup = async () => {
    if (!memberPhone) return;
    try {
      const res = await api.get(`/pos/members/phone/${memberPhone}`);
      setMember(res.data.data ?? res.data);
      toast.success(`Member: ${(res.data.data ?? res.data).name}`);
    } catch { toast.error('Member tidak ditemukan'); setMember(null); }
  };

  // --- PAYMENT ---
  const handlePayCash = async () => {
    if (cart.length === 0) { toast.error('Cart kosong'); return; }
    if (Number(cashAmount) < total) { toast.error('Nominal kurang dari total'); return; }
    if (!session) { toast.error('No active session'); return; }

    setProcessing(true);
    try {
      // 1. Create transaction
      const txnRes = await api.post('/pos/transactions', {
        outletId: session.outletId,
        memberId: member?.id || undefined,
        items: cart.map(item => ({ productId: item.productId, batchId: item.batchId, quantity: item.quantity, discount: item.discount })),
      });
      const txn = txnRes.data.data ?? txnRes.data;

      // 2. Process payment
      const payRes = await api.post('/pos/payment', {
        transactionId: txn.id,
        payments: [{ method: 'cash', amount: Number(cashAmount) }],
      });
      const completedTxn = payRes.data.data ?? payRes.data;

      toast.success('Pembayaran berhasil!');

      // 3. Open receipt
      window.open(`/print/receipt/${completedTxn.id}`, '_blank');

      // 4. Reset cart
      clearCart();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Pembayaran gagal');
    } finally {
      setProcessing(false);
    }
  };

  const handlePayMidtrans = () => {
    toast.info('Midtrans integration — Snap token akan di-generate dari backend');
  };

  // --- RENDERS ---
  if (sessionLoading) return <div className="h-screen flex items-center justify-center"><p className="text-muted-foreground">Loading POS...</p></div>;

  if (sessionSummary) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-lg">
          <CardHeader><CardTitle className="flex items-center gap-2"><StopCircle className="h-5 w-5 text-destructive" /> Session Closed</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">Total Sales</p><p className="text-xl font-bold">Rp {Number(sessionSummary.totalSales||0).toLocaleString('id-ID')}</p></div>
              <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">Transactions</p><p className="text-xl font-bold">{sessionSummary.totalTransactions||0}</p></div>
              <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">Cash</p><p className="font-bold">Rp {Number(sessionSummary.totalCashPayments||0).toLocaleString('id-ID')}</p></div>
              <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">Digital</p><p className="font-bold">Rp {Number(sessionSummary.totalDigitalPayments||0).toLocaleString('id-ID')}</p></div>
              <div className="p-3 bg-muted rounded-lg"><p className="text-muted-foreground">Expected</p><p className="font-medium">Rp {Number(sessionSummary.expectedCash||0).toLocaleString('id-ID')}</p></div>
              <div className={cn('p-3 rounded-lg', Number(sessionSummary.cashDifference||0) >= 0 ? 'bg-green-50' : 'bg-red-50')}><p className="text-muted-foreground">Selisih</p><p className={cn('font-bold', Number(sessionSummary.cashDifference||0) >= 0 ? 'text-green-700' : 'text-red-700')}>Rp {Number(sessionSummary.cashDifference||0).toLocaleString('id-ID')}</p></div>
            </div>
            <Button className="w-full" onClick={() => setSessionSummary(null)}>Mulai Session Baru</Button>
            <Button variant="ghost" className="w-full" onClick={() => window.location.href = '/dashboard'}><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (staleSession && session) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md border-destructive">
          <CardHeader><CardTitle className="text-destructive">Session Belum Ditutup!</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm">Session dari <strong>{new Date(session.openedAt).toLocaleDateString('id-ID')}</strong> belum di-close.</p>
            <div><label className="text-sm font-medium">Kas Akhir (Rp)</label><Input type="number" value={closeForm.closingCash} onChange={(e) => setCloseForm({ ...closeForm, closingCash: e.target.value })} className="mt-1" /></div>
            <Button className="w-full" variant="destructive" onClick={handleCloseSession}>Close Session Sebelumnya</Button>
            <Button variant="ghost" className="w-full" onClick={() => window.location.href = '/dashboard'}><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    const hasOne = userOutlets.length === 1;
    return (
      <div className="h-screen flex items-center justify-center bg-muted/30 p-6">
        <Card className="w-full max-w-md">
          <CardHeader><CardTitle className="flex items-center gap-2"><PlayCircle className="h-5 w-5 text-green-600" /> Start POS Session</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {hasOne ? (
              <div className="p-3 bg-muted rounded-lg"><p className="text-xs text-muted-foreground">Outlet</p><p className="font-medium">{userOutlets[0].location?.name || userOutlets[0].location_id}</p></div>
            ) : userOutlets.length > 1 ? (
              <div><label className="text-sm font-medium">Outlet</label><select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm mt-1" value={startForm.outletId} onChange={(e) => setStartForm({ ...startForm, outletId: e.target.value })}><option value="">Pilih...</option>{userOutlets.map(l => <option key={l.location_id} value={l.location_id}>{l.location?.name}</option>)}</select></div>
            ) : (<div className="p-3 bg-yellow-50 text-yellow-800 rounded-lg text-sm">Belum di-assign outlet. Hubungi admin.</div>)}
            <div><label className="text-sm font-medium">Kas Awal (Rp)</label><Input type="number" value={startForm.openingCash} onChange={(e) => setStartForm({ ...startForm, openingCash: e.target.value })} placeholder="500000" className="mt-1" /></div>
            <Button className="w-full" onClick={handleStartSession} disabled={!startForm.outletId || !startForm.openingCash}><PlayCircle className="h-4 w-4 mr-2" /> Start</Button>
            <Button variant="ghost" className="w-full" onClick={() => window.location.href = '/dashboard'}><ArrowLeft className="h-4 w-4 mr-1" /> Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- ACTIVE POS ---
  return (
    <div className="h-screen flex flex-col bg-muted/30">
      <header className="h-14 bg-card border-b flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.location.href = '/dashboard'}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-lg font-bold flex items-center gap-2"><ShoppingCart className="h-5 w-5" /> POS</h1>
          <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs flex items-center gap-1"><Clock className="h-3 w-3" />{session.outlet?.name || 'Active'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={clearCart}><X className="h-4 w-4 mr-1" /> Clear</Button>
          <Button variant="destructive" size="sm" onClick={() => setShowCloseForm(true)}><StopCircle className="h-4 w-4 mr-1" /> Close</Button>
        </div>
      </header>

      {showCloseForm && (
        <div className="absolute inset-0 z-50 bg-black/50 flex items-center justify-center">
          <Card className="w-full max-w-md"><CardHeader><CardTitle>Close Session</CardTitle></CardHeader><CardContent className="space-y-4">
            <div><label className="text-sm font-medium">Kas Akhir</label><Input type="number" value={closeForm.closingCash} onChange={(e) => setCloseForm({ ...closeForm, closingCash: e.target.value })} className="mt-1" autoFocus /></div>
            <div><label className="text-sm font-medium">Notes</label><Input value={closeForm.notes} onChange={(e) => setCloseForm({ ...closeForm, notes: e.target.value })} className="mt-1" /></div>
            <div className="flex gap-2"><Button className="flex-1" onClick={handleCloseSession}>Close & Report</Button><Button variant="ghost" onClick={() => setShowCloseForm(false)}>Cancel</Button></div>
          </CardContent></Card>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col p-4">
          {/* Search */}
          <div className="mb-4 flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input ref={scannerRef} className="pl-10" placeholder="Scan QR / ketik nama / SKU..." value={searchQuery} onChange={(e) => handleSearch(e.target.value)} onKeyDown={handleSearchKeyDown} onFocus={() => searchResults.length > 0 && setShowResults(true)} onBlur={() => setTimeout(() => setShowResults(false), 200)} />
              {showResults && searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 max-h-64 overflow-y-auto">
                  {searchResults.map(p => (
                    <button key={p.id} className="w-full text-left px-4 py-3 hover:bg-muted flex justify-between items-center border-b last:border-b-0" onMouseDown={() => selectProduct(p)}>
                      <div><p className="font-medium text-sm">{p.name}</p><p className="text-xs text-muted-foreground">{p.sku}</p></div>
                      <div className="text-right">
                        <p className="font-medium text-sm">Rp {Number(p.sellPrice).toLocaleString('id-ID')}</p>
                        <p className={cn('text-xs', (p.availableStock ?? 0) > 0 ? 'text-green-600' : 'text-red-500')}>Stok: {p.availableStock ?? '?'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
              {showResults && searchResults.length === 0 && searchQuery.length >= 1 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-card border rounded-lg shadow-lg z-50 p-4 text-center text-sm text-muted-foreground">Produk tidak ditemukan</div>
              )}
            </div>
            <div className="relative w-48">
              <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-10" placeholder="HP Member..." value={memberPhone} onChange={(e) => setMemberPhone(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleMemberLookup()} />
            </div>
          </div>

          {/* Cart */}
          <div className="flex-1 overflow-y-auto">
            {cart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground"><div className="text-center"><ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" /><p>Scan QR atau ketik nama produk</p></div></div>
            ) : (
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-muted-foreground uppercase"><div className="col-span-4">Product</div><div className="col-span-2 text-center">Harga</div><div className="col-span-3 text-center">Qty</div><div className="col-span-2 text-right">Subtotal</div><div className="col-span-1"></div></div>
                {cart.map(item => (
                  <div key={item.id} className="grid grid-cols-12 gap-2 items-center px-3 py-3 bg-card rounded-lg border">
                    <div className="col-span-4"><p className="font-medium text-sm">{item.name}</p><p className="text-xs text-muted-foreground">{item.sku} | stok: {item.maxStock}</p></div>
                    <div className="col-span-2 text-center text-sm">Rp {item.price.toLocaleString('id-ID')}</div>
                    <div className="col-span-3 flex items-center justify-center gap-1">
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity - 1)}><Minus className="h-3 w-3" /></Button>
                      <input type="number" className="w-12 h-7 text-center text-sm font-medium border rounded-md bg-background" value={item.quantity} min={1} max={item.maxStock} onChange={(e) => updateQuantity(item.id, parseInt(e.target.value, 10) || 1)} />
                      <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, item.quantity + 1)}><Plus className="h-3 w-3" /></Button>
                    </div>
                    <div className="col-span-2 text-right text-sm font-medium">Rp {item.subtotal.toLocaleString('id-ID')}</div>
                    <div className="col-span-1 text-right"><Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeFromCart(item.id)}><Trash2 className="h-3 w-3" /></Button></div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Payment Sidebar */}
        <div className="w-80 border-l bg-card flex flex-col">
          <div className="flex-1 p-4 space-y-4">
            {member && (<Card className="border-green-200 bg-green-50"><CardContent className="p-3"><p className="text-sm font-medium">{member.name}</p><p className="text-xs text-muted-foreground">{member.code} | {member.points} pts</p></CardContent></Card>)}
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Items</span><span>{cart.reduce((s, i) => s + i.quantity, 0)} pcs</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span>Rp {subtotal.toLocaleString('id-ID')}</span></div>
              <div className="flex justify-between text-xl font-bold border-t pt-2"><span>Total</span><span>Rp {total.toLocaleString('id-ID')}</span></div>
            </div>
            {showPayment && (
              <div className="space-y-3 border-t pt-3">
                <div><label className="text-sm font-medium">Nominal Bayar (Rp)</label><Input type="number" placeholder="Masukkan nominal..." value={cashAmount} onChange={(e) => setCashAmount(e.target.value)} className="mt-1" autoFocus /></div>
                {Number(cashAmount) > 0 && (
                  <div className={cn('p-3 rounded-lg text-center', change >= 0 ? 'bg-green-50' : 'bg-red-50')}>
                    <p className="text-xs text-muted-foreground">Kembalian</p>
                    <p className={cn('text-2xl font-bold', change >= 0 ? 'text-green-700' : 'text-red-600')}>Rp {Math.max(0, change).toLocaleString('id-ID')}</p>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-4 border-t space-y-2">
            {!showPayment ? (
              <Button className="w-full h-12 text-lg" disabled={cart.length === 0} onClick={() => setShowPayment(true)}>
                Bayar Rp {total.toLocaleString('id-ID')}
              </Button>
            ) : (
              <>
                <Button className="w-full h-11" disabled={Number(cashAmount) < total || processing} onClick={handlePayCash}>
                  <Banknote className="h-4 w-4 mr-2" /> {processing ? 'Processing...' : 'Bayar Tunai'}
                </Button>
                <Button className="w-full h-11" variant="outline" onClick={handlePayMidtrans} disabled={processing}>
                  <CreditCard className="h-4 w-4 mr-2" /> Midtrans
                </Button>
                <Button className="w-full" variant="ghost" onClick={() => { setShowPayment(false); setCashAmount(''); }}>Batal</Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
