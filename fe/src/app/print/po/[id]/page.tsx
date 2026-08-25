'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

export default function PrintPOPage() {
  const params = useParams();
  const [po, setPo] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [poRes, companyRes] = await Promise.all([
        api.get(`/purchase-orders/${params.id}`),
        api.get('/master/company'),
      ]);
      setPo(poRes.data.data ?? poRes.data);
      setCompany(companyRes.data.data ?? companyRes.data);
    } catch (err) {
      console.error('Failed to load PO', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && po) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, po]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!po) return <div className="p-8 text-center">PO not found</div>;

  return (
    <div className="max-w-[210mm] mx-auto p-8 bg-white text-black text-sm print:p-4">
      <style jsx global>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-4">
        <div>
          {company?.logo && <img src={company.logo} alt="Logo" className="h-12 mb-2" />}
          <h1 className="text-xl font-bold">{company?.companyName || 'Company Name'}</h1>
          <p className="text-xs">{company?.address}</p>
          <p className="text-xs">Tel: {company?.phone} | Email: {company?.email}</p>
          {company?.taxId && <p className="text-xs">NPWP: {company.taxId}</p>}
        </div>
        <div className="text-right">
          <h2 className="text-2xl font-bold">SURAT PO</h2>
          <p className="text-lg font-mono font-bold mt-1">{po.poNumber}</p>
          <p className="text-xs mt-2">Tanggal: {new Date(po.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          <p className="text-xs">Status: <span className="font-semibold uppercase">{po.status}</span></p>
        </div>
      </div>

      {/* From/To */}
      <div className="grid grid-cols-2 gap-8 mb-6">
        <div>
          <p className="font-bold text-xs uppercase text-gray-600 mb-1">Dari (Warehouse)</p>
          <p className="font-semibold">{po.warehouse?.name || '-'}</p>
          <p className="text-xs">{po.warehouse?.address || ''}</p>
        </div>
        <div>
          <p className="font-bold text-xs uppercase text-gray-600 mb-1">Kepada (Outlet)</p>
          <p className="font-semibold">{po.outlet?.name || '-'}</p>
          <p className="text-xs">{po.outlet?.address || ''}</p>
        </div>
      </div>

      {/* Items Table */}
      <table className="w-full border-collapse mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="border border-gray-300 px-2 py-1 text-left text-xs">No</th>
            <th className="border border-gray-300 px-2 py-1 text-left text-xs">Produk</th>
            <th className="border border-gray-300 px-2 py-1 text-left text-xs">Batch</th>
            <th className="border border-gray-300 px-2 py-1 text-center text-xs">Expired</th>
            <th className="border border-gray-300 px-2 py-1 text-center text-xs">Qty Kirim</th>
            <th className="border border-gray-300 px-2 py-1 text-center text-xs">Qty Terima</th>
          </tr>
        </thead>
        <tbody>
          {po.items?.map((item: any, idx: number) => (
            <tr key={item.id}>
              <td className="border border-gray-300 px-2 py-1 text-xs">{idx + 1}</td>
              <td className="border border-gray-300 px-2 py-1 text-xs">{item.product?.name || item.productId}</td>
              <td className="border border-gray-300 px-2 py-1 text-xs font-mono">{item.batch?.batchCode || '-'}</td>
              <td className="border border-gray-300 px-2 py-1 text-xs text-center">
                {item.batch?.expiredDate ? new Date(item.batch.expiredDate).toLocaleDateString('id-ID') : '-'}
              </td>
              <td className="border border-gray-300 px-2 py-1 text-xs text-center">{item.quantity}</td>
              <td className="border border-gray-300 px-2 py-1 text-xs text-center">{item.receivedQuantity || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Notes */}
      {po.notes && (
        <div className="mb-6">
          <p className="text-xs font-bold">Catatan:</p>
          <p className="text-xs">{po.notes}</p>
        </div>
      )}

      {/* Signatures */}
      <div className="grid grid-cols-3 gap-4 mt-12">
        <div className="text-center">
          <p className="text-xs mb-16">Dibuat oleh,</p>
          <div className="border-b border-black mx-4"></div>
          <p className="text-xs mt-1">Warehouse Staff</p>
        </div>
        <div className="text-center">
          <p className="text-xs mb-16">Pengirim,</p>
          <div className="border-b border-black mx-4"></div>
          <p className="text-xs mt-1">Driver</p>
        </div>
        <div className="text-center">
          <p className="text-xs mb-16">Penerima,</p>
          <div className="border-b border-black mx-4"></div>
          <p className="text-xs mt-1">Outlet Staff</p>
        </div>
      </div>

      {/* Footer */}
      {company?.poFooter && (
        <p className="text-xs text-center text-gray-500 mt-8 border-t pt-2">{company.poFooter}</p>
      )}

      {/* Print Button */}
      <div className="no-print mt-8 text-center">
        <button onClick={() => window.print()} className="px-4 py-2 bg-black text-white rounded text-sm">
          Print Surat PO
        </button>
        <button onClick={() => window.close()} className="px-4 py-2 ml-2 border rounded text-sm">
          Tutup
        </button>
      </div>
    </div>
  );
}
