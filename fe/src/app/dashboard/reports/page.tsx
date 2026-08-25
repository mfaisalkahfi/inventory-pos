'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarChart3, TrendingUp, Package, AlertTriangle, DollarSign, Download } from 'lucide-react';
import { toast } from 'sonner';
import api from '@/lib/api';

type ReportType = 'sales' | 'stock' | 'expired';

export default function ReportsPage() {
  const [activeReport, setActiveReport] = useState<ReportType>('sales');
  const [dateFrom, setDateFrom] = useState(new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10));
  const [dateTo, setDateTo] = useState(new Date().toISOString().slice(0, 10));
  const [salesData, setSalesData] = useState<any>(null);
  const [stockData, setStockData] = useState<any>(null);
  const [expiredData, setExpiredData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchReport(); }, [activeReport]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      if (activeReport === 'sales') {
        const res = await api.get(`/reports/sales?from=${dateFrom}&to=${dateTo}`);
        setSalesData(res.data.data ?? res.data);
      } else if (activeReport === 'stock') {
        const res = await api.get('/reports/stock');
        setStockData(res.data.data ?? res.data);
      } else if (activeReport === 'expired') {
        const res = await api.get('/reports/expired');
        setExpiredData(res.data.data ?? res.data);
      }
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  const handleExport = async (type: 'excel' | 'pdf') => {
    try {
      const endpoint = activeReport === 'stock'
        ? '/reports/export/stock/excel'
        : `/reports/export/sales/${type}?from=${dateFrom}&to=${dateTo}`;
      
      const res = await api.get(endpoint, { responseType: 'blob' });
      const blob = new Blob([res.data], {
        type: type === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${activeReport}-report-${dateFrom}-${dateTo}.${type === 'excel' ? 'xlsx' : 'pdf'}`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${type.toUpperCase()} exported!`);
    } catch (err) {
      toast.error('Export gagal');
    }
  };

  const reports = [
    { key: 'sales' as ReportType, label: 'Sales', icon: TrendingUp },
    { key: 'stock' as ReportType, label: 'Stock', icon: Package },
    { key: 'expired' as ReportType, label: 'Expired', icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div><h1 className="text-3xl font-bold">Reports</h1><p className="text-muted-foreground">Laporan penjualan, stok, dan expired</p></div>

      {/* Tabs */}
      <div className="flex gap-2 border-b pb-2">
        {reports.map(r => {
          const Icon = r.icon;
          return <Button key={r.key} variant={activeReport === r.key ? 'default' : 'ghost'} size="sm" onClick={() => setActiveReport(r.key)}><Icon className="h-4 w-4 mr-1" /> {r.label}</Button>;
        })}
      </div>

      {/* Sales Report */}
      {activeReport === 'sales' && (
        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-4">
              <div><label className="text-sm font-medium">Dari</label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" /></div>
              <div><label className="text-sm font-medium">Sampai</label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" /></div>
              <Button onClick={fetchReport} disabled={loading} className="mt-5">{loading ? 'Loading...' : 'Filter'}</Button>
              <div className="flex-1" />
              <Button variant="outline" className="mt-5" onClick={() => handleExport('excel')}><Download className="h-4 w-4 mr-1" /> Excel</Button>
              <Button variant="outline" className="mt-5" onClick={() => handleExport('pdf')}><Download className="h-4 w-4 mr-1" /> PDF</Button>
            </CardContent>
          </Card>

          {salesData && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">Rp {Number(salesData.totalSales).toLocaleString('id-ID')}</p><p className="text-xs text-muted-foreground">Total Sales</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{salesData.totalTransactions}</p><p className="text-xs text-muted-foreground">Transaksi</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">Rp {Number(salesData.totalCash).toLocaleString('id-ID')}</p><p className="text-xs text-muted-foreground">Cash</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">Rp {Number(salesData.totalDigital).toLocaleString('id-ID')}</p><p className="text-xs text-muted-foreground">Digital</p></CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Daily Breakdown</CardTitle></CardHeader>
                <CardContent>
                  {salesData.dailyBreakdown?.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted"><tr><th className="text-left p-2">Tanggal</th><th className="text-right p-2">Sales</th><th className="text-center p-2">Transaksi</th></tr></thead>
                        <tbody>
                          {salesData.dailyBreakdown.map((day: any) => (
                            <tr key={day.date} className="border-t"><td className="p-2">{new Date(day.date).toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })}</td><td className="p-2 text-right font-medium">Rp {Number(day.sales).toLocaleString('id-ID')}</td><td className="p-2 text-center">{day.count}</td></tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : <p className="text-center text-muted-foreground py-4">Tidak ada data untuk periode ini.</p>}
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}

      {/* Stock Report */}
      {activeReport === 'stock' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')}><Download className="h-4 w-4 mr-1" /> Export Excel</Button>
          </div>
          {stockData && (
            <>
              <div className="grid grid-cols-3 gap-4">
                <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stockData.totalItems}</p><p className="text-xs text-muted-foreground">Total Products</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{stockData.lowStockCount}</p><p className="text-xs text-muted-foreground">Low Stock</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{stockData.items?.reduce((s: number, i: any) => s + i.totalStock, 0) || 0}</p><p className="text-xs text-muted-foreground">Total Qty</p></CardContent></Card>
              </div>

              <Card>
                <CardHeader><CardTitle className="text-base">Stock per Product</CardTitle></CardHeader>
                <CardContent>
                  <table className="w-full text-sm">
                    <thead className="bg-muted"><tr><th className="text-left p-2">SKU</th><th className="text-left p-2">Product</th><th className="text-center p-2">Stock</th><th className="text-center p-2">Min</th><th className="text-center p-2">Status</th></tr></thead>
                    <tbody>
                      {stockData.items?.map((item: any) => (
                        <tr key={item.productId} className="border-t">
                          <td className="p-2 font-mono text-xs">{item.sku}</td>
                          <td className="p-2">{item.name}</td>
                          <td className="p-2 text-center font-medium">{item.totalStock}</td>
                          <td className="p-2 text-center">{item.minStock}</td>
                          <td className="p-2 text-center">
                            {item.isLowStock ? <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">Low</span> : <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-xs">OK</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {(!stockData.items || stockData.items.length === 0) && <p className="text-center text-muted-foreground py-4">Tidak ada data stok.</p>}
                </CardContent>
              </Card>
            </>
          )}
          {loading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
        </div>
      )}

      {/* Expired Report */}
      {activeReport === 'expired' && (
        <div className="space-y-4">
          {expiredData && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-red-600">{expiredData.expiredCount}</p><p className="text-xs text-muted-foreground">Sudah Expired</p></CardContent></Card>
                <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-yellow-600">{expiredData.expiringSoonCount}</p><p className="text-xs text-muted-foreground">Expired &lt; 7 hari</p></CardContent></Card>
              </div>

              {expiredData.expiringSoon?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base text-yellow-700">Segera Expired (7 hari)</CardTitle></CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead className="bg-yellow-50"><tr><th className="text-left p-2">Product</th><th className="text-left p-2">Batch</th><th className="text-center p-2">Expired</th><th className="text-center p-2">Sisa Hari</th></tr></thead>
                      <tbody>
                        {expiredData.expiringSoon.map((b: any, i: number) => (
                          <tr key={i} className="border-t"><td className="p-2">{b.product}</td><td className="p-2 font-mono text-xs">{b.batchCode}</td><td className="p-2 text-center">{new Date(b.expiredDate).toLocaleDateString('id-ID')}</td><td className="p-2 text-center font-bold text-yellow-700">{b.daysLeft} hari</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}

              {expiredData.expired?.length > 0 && (
                <Card>
                  <CardHeader><CardTitle className="text-base text-red-700">Sudah Expired</CardTitle></CardHeader>
                  <CardContent>
                    <table className="w-full text-sm">
                      <thead className="bg-red-50"><tr><th className="text-left p-2">Product</th><th className="text-left p-2">Batch</th><th className="text-center p-2">Expired Date</th></tr></thead>
                      <tbody>
                        {expiredData.expired.map((b: any, i: number) => (
                          <tr key={i} className="border-t"><td className="p-2">{b.product}</td><td className="p-2 font-mono text-xs">{b.batchCode}</td><td className="p-2 text-center text-red-600">{new Date(b.expiredDate).toLocaleDateString('id-ID')}</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
          {loading && <p className="text-center text-muted-foreground py-8">Loading...</p>}
        </div>
      )}
    </div>
  );
}
