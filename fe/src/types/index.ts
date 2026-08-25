// Common types shared across the frontend

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  categoryId?: string;
  category?: Category;
  attributes?: Record<string, any>;
  basePrice: number;
  sellPrice: number;
  unit: string;
  minStock: number;
  description?: string;
  image?: string;
  isActive: boolean;
  createdAt: string;
}

export interface ProductBatch {
  id: string;
  productId: string;
  product?: Product;
  batchCode: string;
  productionDate?: string;
  expiredDate: string;
  initialQuantity: number;
  qrCodeData?: string;
  isExpired: boolean;
  isBlocked: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  children?: Category[];
}

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}

export interface Outlet {
  id: string;
  code: string;
  name: string;
  address?: string;
  phone?: string;
  isActive: boolean;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  warehouseId: string;
  warehouse?: Warehouse;
  outletId: string;
  outlet?: Outlet;
  status: 'draft' | 'submitted' | 'shipped' | 'received' | 'approved' | 'rejected' | 'cancelled';
  createdBy: string;
  approvedBy?: string;
  approvedAt?: string;
  shippedAt?: string;
  receivedAt?: string;
  notes?: string;
  items: POItem[];
  createdAt: string;
}

export interface POItem {
  id: string;
  productId: string;
  product?: Product;
  batchId: string;
  batch?: ProductBatch;
  quantity: number;
  receivedQuantity: number;
}

export interface Transaction {
  id: string;
  transactionNumber: string;
  outletId: string;
  outlet?: Outlet;
  cashierId: string;
  memberId?: string;
  member?: Member;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: 'open' | 'hold' | 'completed' | 'void';
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';
  items: TransactionItem[];
  payments: Payment[];
  createdAt: string;
}

export interface TransactionItem {
  id: string;
  productId: string;
  product?: Product;
  batchId?: string;
  batch?: ProductBatch;
  quantity: number;
  price: number;
  discount: number;
  subtotal: number;
}

export interface Payment {
  id: string;
  transactionId: string;
  method: 'cash' | 'midtrans' | 'points';
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  reference?: string;
  changeAmount: number;
}

export interface Member {
  id: string;
  code: string;
  name: string;
  phone: string;
  email?: string;
  points: number;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  totalSpending: number;
  isActive: boolean;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  permissions: Permission[];
}

export interface Permission {
  id: string;
  slug: string;
  name: string;
  description?: string;
}

export interface Notification {
  id: string;
  userId: string;
  type: 'expired_warning' | 'low_stock' | 'po_status' | 'system';
  title: string;
  message: string;
  isRead: boolean;
  data?: Record<string, any>;
  createdAt: string;
}
