'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import api from '@/lib/api';

export default function PrintReceiptPage() {
  const params = useParams();
  const [transaction, setTransaction] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [txnRes, companyRes] = await Promise.all([
        api.get(`/pos/transactions/${params.id}`),
        api.get('/master/company'),
      ]);
      setTransaction(txnRes.data.data ?? txnRes.data);
      setCompany(companyRes.data.data ?? companyRes.data);
    } catch (err) {
      console.error('Failed to load transaction', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!loading && transaction) {
      setTimeout(() => window.print(), 500);
    }
  }, [loading, transaction]);

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (!transaction) return <div className="p-8 text-center">Transaction not found</div>;

  const totalPaid = transaction.payments?.reduce((s: number, p: any) => s + Number(p.amount), 0) || 0;
  const change = transaction.payments?.find((p: any) => p.method === 'cash')?.changeAmount || 0;

  return (
    <div className="max-w-[80mm] mx-auto p-2 bg-white text-black font-mono text-xs print:p-0">
      <style jsx global>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
          @page { size: 80mm auto; margin: 2mm; }
        }
      `}</style>

      {/* Header */}
      <div className="text-center mb-2">
        {company?.logo && <img src={company.logo} alt="Logo" className="h-8 mx-auto mb-1" />}
        <p className="font-bold text-sm">{company?.companyName || 'STORE'}</p>
        {company?.tagline && <p>{company.tagline}</p>}
        {company?.address && <p>{company.address}</p>}
        {company?.phone && <p>Tel: {company.phone}</p>}
        {company?.receiptHeader && <p className="mt-1">{company.receiptHeader}</p>}
      </div>

      <div className="border-t border-dashed my-1"></div>

      {/* Transaction Info */}
      <div className="mb-1">
        <p>No: {transaction.transactionNumber}</p>
        <p>Tgl: {new Date(transaction.createdAt).toLocaleString('id-ID')}</p>
        <p>Outlet: {transaction.outlet?.name || '-'}</p>
        {transaction.member && <p>Member: {transaction.member.name} ({transaction.member.code})</p>}
      </div>

      <div className="border-t border-dashed my-1"></div>

      {/* Items */}
      <div className="mb-1">
        {transaction.items?.map((item: any) => (
          <div key={item.id} className="flex justify-between py-0.5">
            <div className="flex-1">
              <p>{item.product?.name || 'Item'}</p>
              <p className="text-[10px]">
                {item.quantity} x Rp {Number(item.price).toLocaleString('id-ID')}
                {Number(item.discount) > 0 && ` (disc: -${Number(item.discount).toLocaleString('id-ID')})`}
              </p>
            </div>
            <p className="text-right">Rp {Number(item.subtotal).toLocaleString('id-ID')}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-dashed my-1"></div>

      {/* Totals */}
      <div className="space-y-0.5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span>Rp {Number(transaction.subtotal).toLocaleString('id-ID')}</span>
        </div>
        {Number(transaction.discount) > 0 && (
          <div className="flex justify-between">
            <span>Diskon</span>
            <span>-Rp {Number(transaction.discount).toLocaleString('id-ID')}</span>
          </div>
        )}
        <div className="flex justify-between font-bold text-sm">
          <span>TOTAL</span>
          <span>Rp {Number(transaction.total).toLocaleString('id-ID')}</span>
        </div>
      </div>

      <div className="border-t border-dashed my-1"></div>

      {/* Payment */}
      <div className="space-y-0.5">
        {transaction.payments?.map((payment: any) => (
          <div key={payment.id} className="flex justify-between">
            <span className="uppercase">{payment.method}</span>
            <span>Rp {Number(payment.amount).toLocaleString('id-ID')}</span>
          </div>
        ))}
        {Number(change) > 0 && (
          <div className="flex justify-between font-bold">
            <span>Kembalian</span>
            <span>Rp {Number(change).toLocaleString('id-ID')}</span>
          </div>
        )}
      </div>

      {/* Points */}
      {transaction.member && Number(transaction.pointsEarned) > 0 && (
        <>
          <div className="border-t border-dashed my-1"></div>
          <p className="text-center">Points earned: +{Number(transaction.pointsEarned)}</p>
        </>
      )}

      <div className="border-t border-dashed my-1"></div>

      {/* Footer */}
      <div className="text-center mt-2">
        {company?.receiptFooter && <p>{company.receiptFooter}</p>}
        <p className="mt-1 text-[10px]">
          {new Date().toLocaleString('id-ID')}
        </p>
      </div>

      {/* Print Button */}
      <div className="no-print mt-4 text-center">
        <button onClick={() => window.print()} className="px-3 py-1 bg-black text-white rounded text-xs">
          Print Struk
        </button>
        <button onClick={() => window.close()} className="px-3 py-1 ml-2 border rounded text-xs">
          Tutup
        </button>
      </div>
    </div>
  );
}
