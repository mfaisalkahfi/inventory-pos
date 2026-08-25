'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  FileText,
  Truck,
  CheckCircle,
  Search,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/lib/api';
import type { PurchaseOrder, Warehouse, Outlet, Product, ProductBatch } from '@/types';

const statusColors: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-800',
  submitted: 'bg-blue-100 text-blue-800',
  shipped: 'bg-yellow-100 text-yellow-800',
  received: 'bg-purple-100 text-purple-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

interface POItemForm {
  productId: string;
  batchId: string;
  quantity: number;
  productName?: string;
  batchCode?: string;
}

export default function PurchaseOrdersPage() {
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [searchPO, setSearchPO] = useState('');
  const [loading, setLoading] = useState(false);

  // Create PO form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [poForm, setPoForm] = useState({ warehouseId: '', outletId: '', notes: '' });
  const [poItems, setPoItems] = useState<POItemForm[]>([]);
  const [itemForm, setItemForm] = useState({ productId: '', batchId: '', quantity: '1' });

  useEffect(() => {
    fetchPurchaseOrders();
  }, []);

  const fetchPurchaseOrders = async () => {
    try {
      const res = await api.get('/purchase-orders');
      setPurchaseOrders(res.data.data ?? res.data ?? []);
    } catch (err) {
      console.error('Failed to fetch POs', err);
    }
  };

  const fetchMasterData = async () => {
    try {
      const [whRes, outRes, prodRes] = await Promise.all([
        api.get('/master/warehouses'),
        api.get('/master/outlets'),
        api.get('/inventory/products'),
      ]);
      setWarehouses(whRes.data.data ?? whRes.data ?? []);
      setOutlets(outRes.data.data ?? outRes.data ?? []);
      setProducts(prodRes.data.data ?? prodRes.data ?? []);
    } catch (err) {
      console.error('Failed to fetch master data', err);
    }
  };

  // Stock availability for selected warehouse + batch
  const [availableStock, setAvailableStock] = useState<number>(0);

  const fetchBatches = async (productId: string) => {
    try {
      const res = await api.get(`/inventory/batches/product/${productId}`);
      setBatches(res.data.data ?? res.data ?? []);
    } catch (err) {
      setBatches([]);
    }
  };

  const fetchAvailableStock = async (batchId: string) => {
    if (!poForm.warehouseId) {
      setAvailableStock(0);
      return;
    }
    try {
      const res = await api.get(`/inventory/stock/warehouse/${poForm.warehouseId}`);
      const stockList = res.data.data ?? res.data ?? [];
      const stockItem = stockList.find((s: any) => s.batchId === batchId);
      setAvailableStock(stockItem?.quantity ?? 0);
    } catch {
      setAvailableStock(0);
    }
  };

  const handleOpenCreateForm = () => {
    fetchMasterData();
    setShowCreateForm(true);
  };

  const handleAddItem = () => {
    if (!itemForm.productId || !itemForm.batchId || !itemForm.quantity) return;
    const qty = parseInt(itemForm.quantity, 10);
    if (qty <= 0) {
      alert('Quantity harus lebih dari 0');
      return;
    }
    if (availableStock > 0 && qty > availableStock) {
      alert(`Stok tidak cukup! Tersedia: ${availableStock}`);
      return;
    }
    const product = products.find(p => p.id === itemForm.productId);
    const batch = batches.find(b => b.id === itemForm.batchId);
    setPoItems([...poItems, {
      productId: itemForm.productId,
      batchId: itemForm.batchId,
      quantity: qty,
      productName: product?.name,
      batchCode: batch?.batchCode,
    }]);
    setItemForm({ productId: '', batchId: '', quantity: '1' });
    setBatches([]);
    setAvailableStock(0);
  };

  const handleRemoveItem = (index: number) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleCreatePO = async () => {
    if (!poForm.warehouseId || !poForm.outletId || poItems.length === 0) {
      alert('Pilih warehouse, outlet, dan minimal 1 item');
      return;
    }
    setLoading(true);
    try {
      await api.post('/purchase-orders', {
        warehouseId: poForm.warehouseId,
        outletId: poForm.outletId,
        notes: poForm.notes || undefined,
        items: poItems.map(item => ({
          productId: item.productId,
          batchId: item.batchId,
          quantity: item.quantity,
        })),
      });
      fetchPurchaseOrders();
      setShowCreateForm(false);
      setPoForm({ warehouseId: '', outletId: '', notes: '' });
      setPoItems([]);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to create PO');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPO = async () => {
    if (!searchPO) return;
    setLoading(true);
    try {
      const res = await api.get(`/purchase-orders/number/${searchPO}`);
      setSelectedPO(res.data.data ?? res.data);
    } catch {
      alert('PO not found');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (id: string, action: string) => {
    setLoading(true);
    try {
      if (action === 'submit') {
        await api.put(`/purchase-orders/${id}/submit`);
      } else if (action === 'ship') {
        await api.put(`/purchase-orders/${id}/ship`);
      } else if (action === 'receive') {
        const po = purchaseOrders.find((p) => p.id === id) || selectedPO;
        if (po) {
          await api.put(`/purchase-orders/${id}/receive`, {
            items: po.items.map((item) => ({
              poItemId: item.id,
              receivedQuantity: item.quantity,
            })),
          });
        }
      } else if (action === 'approve') {
        await api.put(`/purchase-orders/${id}/approve`);
      }
      fetchPurchaseOrders();
      if (selectedPO?.id === id) {
        const res = await api.get(`/purchase-orders/${id}`);
        setSelectedPO(res.data.data ?? res.data);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Action failed');
    } finally {
      setLoading(false);
    }
  };

  const getNextAction = (status: string) => {
    switch (status) {
      case 'draft': return { label: 'Submit', action: 'submit', icon: FileText };
      case 'submitted': return { label: 'Ship', action: 'ship', icon: Truck };
      case 'shipped': return { label: 'Receive', action: 'receive', icon: CheckCircle };
      case 'received': return { label: 'Approve', action: 'approve', icon: CheckCircle };
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Purchase Orders</h1>
          <p className="text-muted-foreground">Manage stock transfers from warehouse to outlet</p>
        </div>
        <Button onClick={handleOpenCreateForm}>
          <Plus className="h-4 w-4 mr-1" />
          Create PO
        </Button>
      </div>

      {/* Create PO Form */}
      {showCreateForm && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Create Purchase Order</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium">From Warehouse</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={poForm.warehouseId}
                  onChange={(e) => setPoForm({ ...poForm, warehouseId: e.target.value })}
                >
                  <option value="">Select warehouse...</option>
                  {warehouses.map(wh => (
                    <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">To Outlet</label>
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={poForm.outletId}
                  onChange={(e) => setPoForm({ ...poForm, outletId: e.target.value })}
                >
                  <option value="">Select outlet...</option>
                  {outlets.map(out => (
                    <option key={out.id} value={out.id}>{out.code} - {out.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Notes (optional)</label>
                <Input
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  placeholder="Notes..."
                />
              </div>
            </div>

            {/* Add Items */}
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">Items</p>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <label className="text-xs">Product</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={itemForm.productId}
                    onChange={(e) => {
                      setItemForm({ ...itemForm, productId: e.target.value, batchId: '' });
                      if (e.target.value) fetchBatches(e.target.value);
                    }}
                  >
                    <option value="">Select product...</option>
                    {products.map(p => (
                      <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="text-xs">Batch</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-sm"
                    value={itemForm.batchId}
                    onChange={(e) => {
                      setItemForm({ ...itemForm, batchId: e.target.value });
                      if (e.target.value) fetchAvailableStock(e.target.value);
                    }}
                  >
                    <option value="">Select batch...</option>
                    {batches.map(b => (
                      <option key={b.id} value={b.id}>
                        {b.batchCode} (exp: {new Date(b.expiredDate).toLocaleDateString('id-ID')})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-24">
                  <label className="text-xs">Qty {availableStock > 0 && <span className="text-muted-foreground">(max: {availableStock})</span>}</label>
                  <Input
                    type="number"
                    className="h-9"
                    value={itemForm.quantity}
                    onChange={(e) => setItemForm({ ...itemForm, quantity: e.target.value })}
                    min="1"
                    max={availableStock > 0 ? availableStock : undefined}
                  />
                </div>
                <Button size="sm" className="h-9" onClick={handleAddItem} disabled={!itemForm.productId || !itemForm.batchId}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>

              {poItems.length > 0 && (
                <div className="border rounded overflow-hidden mt-2">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2">Product</th>
                        <th className="text-left p-2">Batch</th>
                        <th className="text-center p-2">Qty</th>
                        <th className="text-right p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {poItems.map((item, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="p-2">{item.productName}</td>
                          <td className="p-2 font-mono text-xs">{item.batchCode}</td>
                          <td className="p-2 text-center">{item.quantity}</td>
                          <td className="p-2 text-right">
                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => handleRemoveItem(idx)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreatePO} disabled={loading || poItems.length === 0}>
                {loading ? 'Creating...' : 'Create PO'}
              </Button>
              <Button variant="ghost" onClick={() => { setShowCreateForm(false); setPoItems([]); }}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search PO */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-10"
                placeholder="Enter PO number to search..."
                value={searchPO}
                onChange={(e) => setSearchPO(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearchPO()}
              />
            </div>
            <Button onClick={handleSearchPO} disabled={loading}>Search</Button>
          </div>
        </CardContent>
      </Card>

      {/* Selected PO Detail */}
      {selectedPO && (
        <Card className="border-2 border-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {selectedPO.poNumber}
              </CardTitle>
              <span className={cn('px-3 py-1 rounded text-xs font-medium capitalize', statusColors[selectedPO.status])}>
                {selectedPO.status}
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">From Warehouse</p>
                <p className="font-medium">{selectedPO.warehouse?.name || selectedPO.warehouseId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">To Outlet</p>
                <p className="font-medium">{selectedPO.outlet?.name || selectedPO.outletId}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Created</p>
                <p className="font-medium">{new Date(selectedPO.createdAt).toLocaleDateString('id-ID')}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Items</p>
                <p className="font-medium">{selectedPO.items.length} items</p>
              </div>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Product</th>
                    <th className="text-center p-2">Batch</th>
                    <th className="text-center p-2">Qty</th>
                    <th className="text-center p-2">Received</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedPO.items.map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-2">{item.product?.name || item.productId}</td>
                      <td className="p-2 text-center font-mono text-xs">{item.batch?.batchCode || '-'}</td>
                      <td className="p-2 text-center">{item.quantity}</td>
                      <td className="p-2 text-center">{item.receivedQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(() => {
              const nextAction = getNextAction(selectedPO.status);
              if (!nextAction) return null;
              const Icon = nextAction.icon;
              return (
                <Button onClick={() => handleUpdateStatus(selectedPO.id, nextAction.action)} disabled={loading}>
                  <Icon className="h-4 w-4 mr-1" /> {nextAction.label}
                </Button>
              );
            })()}
            <Button variant="ghost" size="sm" onClick={() => setSelectedPO(null)}>Close</Button>
            <Button variant="outline" size="sm" onClick={() => window.open(`/print/po/${selectedPO.id}`, '_blank')}>
              Print Surat PO
            </Button>
          </CardContent>
        </Card>
      )}

      {/* PO List */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold">All Purchase Orders</h2>
        {purchaseOrders.length === 0 ? (
          <Card><CardContent className="p-6 text-center text-muted-foreground">No purchase orders yet. Click "Create PO" to get started.</CardContent></Card>
        ) : (
          <div className="space-y-2">
            {purchaseOrders.map((po) => {
              const nextAction = getNextAction(po.status);
              return (
                <Card key={po.id} className="cursor-pointer hover:border-primary transition-colors" onClick={() => setSelectedPO(po)}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium">{po.poNumber}</p>
                        <p className="text-xs text-muted-foreground">
                          {po.warehouse?.name || 'Warehouse'} <ArrowRight className="h-3 w-3 inline" /> {po.outlet?.name || 'Outlet'}
                          {' | '}{po.items.length} items
                          {' | '}{new Date(po.createdAt).toLocaleDateString('id-ID')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn('px-2 py-0.5 rounded text-xs font-medium capitalize', statusColors[po.status])}>{po.status}</span>
                      {nextAction && (
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); handleUpdateStatus(po.id, nextAction.action); }} disabled={loading}>
                          {nextAction.label}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
