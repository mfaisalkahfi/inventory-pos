'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, QrCode, Package, Layers } from 'lucide-react';
import api from '@/lib/api';
import type { Product, ProductBatch } from '@/types';

type Tab = 'products' | 'batches' | 'stock';

export default function InventoryPage() {
  const [activeTab, setActiveTab] = useState<Tab>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  // Product form
  const [showProductForm, setShowProductForm] = useState(false);
  const [productForm, setProductForm] = useState({
    name: '',
    basePrice: '',
    sellPrice: '',
    unit: 'pcs',
    minStock: '10',
    description: '',
  });

  // Batch form
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [batchForm, setBatchForm] = useState({
    productId: '',
    expiredDate: '',
    productionDate: '',
    initialQuantity: '',
    notes: '',
  });
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [selectedProductForBatch, setSelectedProductForBatch] = useState<string>('');

  // QR Display
  const [qrData, setQrData] = useState<string | null>(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await api.get('/inventory/products');
      setProducts(res.data.data ?? res.data ?? []);
    } catch (err) {
      console.error('Failed to fetch products', err);
    }
  };

  const fetchBatches = async (productId: string) => {
    try {
      const res = await api.get(`/inventory/batches/product/${productId}`);
      setBatches(res.data.data ?? res.data ?? []);
    } catch (err) {
      console.error('Failed to fetch batches', err);
    }
  };

  const handleSaveProduct = async () => {
    setLoading(true);
    try {
      await api.post('/inventory/products', {
        name: productForm.name,
        basePrice: Number(productForm.basePrice),
        sellPrice: Number(productForm.sellPrice),
        unit: productForm.unit,
        minStock: Number(productForm.minStock),
        description: productForm.description,
      });
      fetchProducts();
      setShowProductForm(false);
      setProductForm({ name: '', basePrice: '', sellPrice: '', unit: 'pcs', minStock: '10', description: '' });
    } catch (err) {
      console.error('Failed to save product', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    try {
      await api.delete(`/inventory/products/${id}`);
      fetchProducts();
    } catch (err) {
      console.error('Failed to delete product', err);
    }
  };

  const handleSaveBatch = async () => {
    setLoading(true);
    try {
      const res = await api.post('/inventory/batches', {
        productId: batchForm.productId,
        expiredDate: batchForm.expiredDate,
        productionDate: batchForm.productionDate || undefined,
        initialQuantity: Number(batchForm.initialQuantity),
        notes: batchForm.notes || undefined,
      });
      // Show QR data
      const batchData = res.data.data ?? res.data;
      setQrData(batchData.qrCodeData);
      fetchBatches(batchForm.productId);
      setShowBatchForm(false);
      setBatchForm({ productId: '', expiredDate: '', productionDate: '', initialQuantity: '', notes: '' });
    } catch (err) {
      console.error('Failed to create batch', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewBatches = (productId: string) => {
    setSelectedProductForBatch(productId);
    fetchBatches(productId);
    setActiveTab('batches');
  };

  const handleShowQR = (batch: ProductBatch) => {
    setQrData(batch.qrCodeData || null);
  };

  const handlePrintQR = () => {
    if (!qrData) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head><title>QR Code</title></head>
          <body style="display:flex;justify-content:center;align-items:center;min-height:100vh;font-family:sans-serif;">
            <div style="text-align:center;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}" alt="QR Code" />
              <pre style="font-size:10px;max-width:300px;word-wrap:break-word;margin-top:10px;">${qrData}</pre>
              <script>window.print();</script>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="text-muted-foreground">Manage products, batches, and stock</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button
          variant={activeTab === 'products' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('products')}
        >
          <Package className="h-4 w-4 mr-1" />
          Products
        </Button>
        <Button
          variant={activeTab === 'batches' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('batches')}
        >
          <Layers className="h-4 w-4 mr-1" />
          Batches
        </Button>
        <Button
          variant={activeTab === 'stock' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('stock')}
        >
          <Package className="h-4 w-4 mr-1" />
          Stock In
        </Button>
      </div>

      {/* QR Code Modal */}
      {qrData && (
        <Card className="border-2 border-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              QR Code Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-4">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrData)}`}
                alt="QR Code"
                className="border rounded"
              />
              <div className="flex-1">
                <pre className="text-xs bg-muted p-2 rounded overflow-x-auto max-w-md">
                  {JSON.stringify(JSON.parse(qrData), null, 2)}
                </pre>
                <div className="flex gap-2 mt-3">
                  <Button size="sm" onClick={handlePrintQR}>
                    Print QR
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setQrData(null)}>
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Products</h2>
            <Button onClick={() => setShowProductForm(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Product
            </Button>
          </div>

          {showProductForm && (
            <Card>
              <CardHeader>
                <CardTitle>New Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={productForm.name}
                      onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                      placeholder="Product name"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Base Price (Rp)</label>
                    <Input
                      type="number"
                      value={productForm.basePrice}
                      onChange={(e) => setProductForm({ ...productForm, basePrice: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Sell Price (Rp)</label>
                    <Input
                      type="number"
                      value={productForm.sellPrice}
                      onChange={(e) => setProductForm({ ...productForm, sellPrice: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Unit</label>
                    <Input
                      value={productForm.unit}
                      onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                      placeholder="pcs"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Min Stock</label>
                    <Input
                      type="number"
                      value={productForm.minStock}
                      onChange={(e) => setProductForm({ ...productForm, minStock: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={productForm.description}
                      onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                      placeholder="Optional"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProduct} disabled={loading}>
                    {loading ? 'Saving...' : 'Save Product'}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowProductForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Products Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">SKU</th>
                  <th className="text-left p-3 font-medium">Name</th>
                  <th className="text-right p-3 font-medium">Base Price</th>
                  <th className="text-right p-3 font-medium">Sell Price</th>
                  <th className="text-center p-3 font-medium">Unit</th>
                  <th className="text-center p-3 font-medium">Min Stock</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t hover:bg-muted/50">
                    <td className="p-3 font-mono text-xs">{product.sku}</td>
                    <td className="p-3">{product.name}</td>
                    <td className="p-3 text-right">
                      Rp {Number(product.basePrice).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-right">
                      Rp {Number(product.sellPrice).toLocaleString('id-ID')}
                    </td>
                    <td className="p-3 text-center">{product.unit}</td>
                    <td className="p-3 text-center">{product.minStock}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => handleViewBatches(product.id)}
                          title="View Batches"
                        >
                          <Layers className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive"
                          onClick={() => handleDeleteProduct(product.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {products.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-muted-foreground">
                      No products yet. Add your first product!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Batches Tab */}
      {activeTab === 'batches' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Batches</h2>
            <Button onClick={() => {
              setBatchForm({ ...batchForm, productId: selectedProductForBatch });
              setShowBatchForm(true);
            }}>
              <Plus className="h-4 w-4 mr-1" />
              Create Batch
            </Button>
          </div>

          {showBatchForm && (
            <Card>
              <CardHeader>
                <CardTitle>Create Batch</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Product</label>
                    <select
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={batchForm.productId}
                      onChange={(e) => setBatchForm({ ...batchForm, productId: e.target.value })}
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} - {p.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Expired Date</label>
                    <Input
                      type="date"
                      value={batchForm.expiredDate}
                      onChange={(e) => setBatchForm({ ...batchForm, expiredDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Production Date</label>
                    <Input
                      type="date"
                      value={batchForm.productionDate}
                      onChange={(e) => setBatchForm({ ...batchForm, productionDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Quantity</label>
                    <Input
                      type="number"
                      value={batchForm.initialQuantity}
                      onChange={(e) => setBatchForm({ ...batchForm, initialQuantity: e.target.value })}
                      placeholder="100"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Notes</label>
                    <Input
                      value={batchForm.notes}
                      onChange={(e) => setBatchForm({ ...batchForm, notes: e.target.value })}
                      placeholder="Optional notes"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveBatch} disabled={loading || !batchForm.productId}>
                    {loading ? 'Creating...' : 'Create & Generate QR'}
                  </Button>
                  <Button variant="ghost" onClick={() => setShowBatchForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Batches Table */}
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">Batch Code</th>
                  <th className="text-center p-3 font-medium">Production</th>
                  <th className="text-center p-3 font-medium">Expired</th>
                  <th className="text-center p-3 font-medium">Qty</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-right p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((batch) => (
                  <tr key={batch.id} className="border-t hover:bg-muted/50">
                    <td className="p-3 font-mono text-xs">{batch.batchCode}</td>
                    <td className="p-3 text-center">
                      {batch.productionDate
                        ? new Date(batch.productionDate).toLocaleDateString('id-ID')
                        : '-'}
                    </td>
                    <td className="p-3 text-center">
                      {new Date(batch.expiredDate).toLocaleDateString('id-ID')}
                    </td>
                    <td className="p-3 text-center">{batch.initialQuantity}</td>
                    <td className="p-3 text-center">
                      {batch.isBlocked ? (
                        <span className="px-2 py-0.5 bg-destructive/10 text-destructive rounded text-xs">
                          Blocked
                        </span>
                      ) : batch.isExpired ? (
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded text-xs">
                          Expired
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-green-100 text-green-800 rounded text-xs">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleShowQR(batch)}
                        title="Show QR"
                      >
                        <QrCode className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                ))}
                {batches.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-muted-foreground">
                      {selectedProductForBatch
                        ? 'No batches for this product. Create one!'
                        : 'Select a product from the Products tab to view batches.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {/* Stock In Tab */}
      {activeTab === 'stock' && (
        <StockInTab products={products} />
      )}
    </div>
  );
}

// --- Stock In Tab Component ---
function StockInTab({ products }: { products: Product[] }) {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [stockForm, setStockForm] = useState({
    productId: '',
    batchId: '',
    warehouseId: '',
    quantity: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [stockList, setStockList] = useState<any[]>([]);
  const [selectedWarehouse, setSelectedWarehouse] = useState('');

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/master/warehouses');
      setWarehouses(res.data.data ?? res.data ?? []);
    } catch {}
  };

  const fetchBatches = async (productId: string) => {
    try {
      const res = await api.get(`/inventory/batches/product/${productId}`);
      setBatches(res.data.data ?? res.data ?? []);
    } catch {
      setBatches([]);
    }
  };

  const fetchStock = async (warehouseId: string) => {
    try {
      const res = await api.get(`/inventory/stock/warehouse/${warehouseId}`);
      setStockList(res.data.data ?? res.data ?? []);
    } catch {
      setStockList([]);
    }
  };

  const handleStockIn = async () => {
    if (!stockForm.productId || !stockForm.batchId || !stockForm.warehouseId || !stockForm.quantity) {
      alert('Semua field wajib diisi');
      return;
    }
    const qty = parseInt(stockForm.quantity, 10);
    if (qty <= 0) {
      alert('Quantity harus lebih dari 0');
      return;
    }
    setLoading(true);
    try {
      await api.post('/inventory/stock-in', {
        productId: stockForm.productId,
        batchId: stockForm.batchId,
        warehouseId: stockForm.warehouseId,
        quantity: qty,
        notes: stockForm.notes || undefined,
      });
      alert(`Stock In berhasil! ${qty} unit ditambahkan ke warehouse.`);
      setStockForm({ productId: '', batchId: '', warehouseId: '', quantity: '', notes: '' });
      setBatches([]);
      // Refresh stock view
      if (selectedWarehouse) fetchStock(selectedWarehouse);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Stock in gagal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Stock In</h2>
      </div>

      {/* Stock In Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Input Barang ke Warehouse</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">Warehouse</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={stockForm.warehouseId}
                onChange={(e) => setStockForm({ ...stockForm, warehouseId: e.target.value })}
              >
                <option value="">Select warehouse...</option>
                {warehouses.map((wh: any) => (
                  <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Product</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={stockForm.productId}
                onChange={(e) => {
                  setStockForm({ ...stockForm, productId: e.target.value, batchId: '' });
                  if (e.target.value) fetchBatches(e.target.value);
                }}
              >
                <option value="">Select product...</option>
                {products.map(p => (
                  <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Batch</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={stockForm.batchId}
                onChange={(e) => setStockForm({ ...stockForm, batchId: e.target.value })}
              >
                <option value="">Select batch...</option>
                {batches.map(b => (
                  <option key={b.id} value={b.id}>
                    {b.batchCode} (exp: {new Date(b.expiredDate).toLocaleDateString('id-ID')})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Quantity</label>
              <Input
                type="number"
                value={stockForm.quantity}
                onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value })}
                placeholder="100"
                min="1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Notes (optional)</label>
              <Input
                value={stockForm.notes}
                onChange={(e) => setStockForm({ ...stockForm, notes: e.target.value })}
                placeholder="Optional notes"
              />
            </div>
          </div>
          <Button onClick={handleStockIn} disabled={loading}>
            {loading ? 'Processing...' : 'Stock In'}
          </Button>
        </CardContent>
      </Card>

      {/* Stock Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stock Overview</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium">View stock for warehouse:</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={selectedWarehouse}
                onChange={(e) => {
                  setSelectedWarehouse(e.target.value);
                  if (e.target.value) fetchStock(e.target.value);
                }}
              >
                <option value="">Select warehouse...</option>
                {warehouses.map((wh: any) => (
                  <option key={wh.id} value={wh.id}>{wh.code} - {wh.name}</option>
                ))}
              </select>
            </div>
          </div>

          {stockList.length > 0 && (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2">Product</th>
                    <th className="text-left p-2">Batch</th>
                    <th className="text-center p-2">Quantity</th>
                    <th className="text-center p-2">Expired</th>
                  </tr>
                </thead>
                <tbody>
                  {stockList.map((item: any, idx: number) => (
                    <tr key={idx} className="border-t">
                      <td className="p-2">{item.product?.name || item.productId}</td>
                      <td className="p-2 font-mono text-xs">{item.batch?.batchCode || '-'}</td>
                      <td className="p-2 text-center font-medium">{item.quantity}</td>
                      <td className="p-2 text-center text-xs">
                        {item.batch?.expiredDate
                          ? new Date(item.batch.expiredDate).toLocaleDateString('id-ID')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {selectedWarehouse && stockList.length === 0 && (
            <p className="text-center text-muted-foreground py-4">Belum ada stok di warehouse ini.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
