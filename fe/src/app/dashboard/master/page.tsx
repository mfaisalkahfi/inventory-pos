'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Edit, Trash2, Building2, Store, Tags } from 'lucide-react';
import api from '@/lib/api';
import type { Warehouse, Outlet, Category } from '@/types';

type Tab = 'warehouses' | 'outlets' | 'categories';

export default function MasterDataPage() {
  const [activeTab, setActiveTab] = useState<Tab>('warehouses');
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);

  // Forms
  const [showForm, setShowForm] = useState(false);
  const [whForm, setWhForm] = useState({ code: '', name: '', address: '', phone: '' });
  const [outletForm, setOutletForm] = useState({ code: '', name: '', address: '', phone: '' });
  const [catForm, setCatForm] = useState({ name: '', description: '' });

  useEffect(() => {
    fetchWarehouses();
    fetchOutlets();
    fetchCategories();
  }, []);

  const fetchWarehouses = async () => {
    try {
      const res = await api.get('/master/warehouses');
      setWarehouses(res.data.data ?? res.data ?? []);
    } catch (err) { /* empty */ }
  };

  const fetchOutlets = async () => {
    try {
      const res = await api.get('/master/outlets');
      setOutlets(res.data.data ?? res.data ?? []);
    } catch (err) { /* empty */ }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/master/categories');
      setCategories(res.data.data ?? res.data ?? []);
    } catch (err) { /* empty */ }
  };

  const handleSaveWarehouse = async () => {
    setLoading(true);
    try {
      await api.post('/master/warehouses', whForm);
      fetchWarehouses();
      setShowForm(false);
      setWhForm({ code: '', name: '', address: '', phone: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOutlet = async () => {
    setLoading(true);
    try {
      await api.post('/master/outlets', outletForm);
      fetchOutlets();
      setShowForm(false);
      setOutletForm({ code: '', name: '', address: '', phone: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCategory = async () => {
    setLoading(true);
    try {
      await api.post('/master/categories', catForm);
      fetchCategories();
      setShowForm(false);
      setCatForm({ name: '', description: '' });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (type: string, id: string) => {
    if (!confirm('Delete this item?')) return;
    try {
      await api.delete(`/master/${type}/${id}`);
      if (type === 'warehouses') fetchWarehouses();
      else if (type === 'outlets') fetchOutlets();
      else fetchCategories();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Master Data</h1>
        <p className="text-muted-foreground">Manage warehouses, outlets, and categories</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        <Button variant={activeTab === 'warehouses' ? 'default' : 'ghost'} size="sm" onClick={() => { setActiveTab('warehouses'); setShowForm(false); }}>
          <Building2 className="h-4 w-4 mr-1" /> Warehouses
        </Button>
        <Button variant={activeTab === 'outlets' ? 'default' : 'ghost'} size="sm" onClick={() => { setActiveTab('outlets'); setShowForm(false); }}>
          <Store className="h-4 w-4 mr-1" /> Outlets
        </Button>
        <Button variant={activeTab === 'categories' ? 'default' : 'ghost'} size="sm" onClick={() => { setActiveTab('categories'); setShowForm(false); }}>
          <Tags className="h-4 w-4 mr-1" /> Categories
        </Button>
      </div>

      {/* Warehouses */}
      {activeTab === 'warehouses' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold">Warehouses</h2>
            <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>
          {showForm && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input placeholder="Code (WH-001)" value={whForm.code} onChange={(e) => setWhForm({ ...whForm, code: e.target.value })} />
                  <Input placeholder="Name" value={whForm.name} onChange={(e) => setWhForm({ ...whForm, name: e.target.value })} />
                  <Input placeholder="Address" value={whForm.address} onChange={(e) => setWhForm({ ...whForm, address: e.target.value })} />
                  <Input placeholder="Phone" value={whForm.phone} onChange={(e) => setWhForm({ ...whForm, phone: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveWarehouse} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3">
            {warehouses.map((wh) => (
              <Card key={wh.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{wh.name}</p>
                    <p className="text-sm text-muted-foreground">{wh.code} | {wh.address || '-'} | {wh.phone || '-'}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete('warehouses', wh.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {warehouses.length === 0 && <p className="text-center text-muted-foreground py-6">No warehouses yet.</p>}
          </div>
        </div>
      )}

      {/* Outlets */}
      {activeTab === 'outlets' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold">Outlets</h2>
            <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>
          {showForm && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Input placeholder="Code (OUT-001)" value={outletForm.code} onChange={(e) => setOutletForm({ ...outletForm, code: e.target.value })} />
                  <Input placeholder="Name" value={outletForm.name} onChange={(e) => setOutletForm({ ...outletForm, name: e.target.value })} />
                  <Input placeholder="Address" value={outletForm.address} onChange={(e) => setOutletForm({ ...outletForm, address: e.target.value })} />
                  <Input placeholder="Phone" value={outletForm.phone} onChange={(e) => setOutletForm({ ...outletForm, phone: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveOutlet} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3">
            {outlets.map((outlet) => (
              <Card key={outlet.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{outlet.name}</p>
                    <p className="text-sm text-muted-foreground">{outlet.code} | {outlet.address || '-'} | {outlet.phone || '-'}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete('outlets', outlet.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {outlets.length === 0 && <p className="text-center text-muted-foreground py-6">No outlets yet.</p>}
          </div>
        </div>
      )}

      {/* Categories */}
      {activeTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex justify-between">
            <h2 className="text-xl font-semibold">Categories</h2>
            <Button onClick={() => setShowForm(true)}><Plus className="h-4 w-4 mr-1" /> Add</Button>
          </div>
          {showForm && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Category name" value={catForm.name} onChange={(e) => setCatForm({ ...catForm, name: e.target.value })} />
                  <Input placeholder="Description" value={catForm.description} onChange={(e) => setCatForm({ ...catForm, description: e.target.value })} />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveCategory} disabled={loading}>{loading ? 'Saving...' : 'Save'}</Button>
                  <Button variant="ghost" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}
          <div className="grid gap-3">
            {categories.map((cat) => (
              <Card key={cat.id}>
                <CardContent className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{cat.name}</p>
                    <p className="text-sm text-muted-foreground">{cat.description || 'No description'}</p>
                  </div>
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete('categories', cat.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
            {categories.length === 0 && <p className="text-center text-muted-foreground py-6">No categories yet.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
