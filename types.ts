
export type ProductUnit = 'unit' | 'kg' | 'g' | 'lb' | 'l' | 'ml';

export interface Category {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
  categoryId: string;
  code: string;
  image: string; // Base64
  costPrice: number;
  salePrice: number;
  stock: number;
  unit: ProductUnit;
  expiryDate?: string; // YYYY-MM-DD
}

export interface InventoryMovement {
  id: string;
  productId: string;
  quantity: number;
  type: 'in' | 'out';
  reason: string;
  date: number;
}

export interface SaleItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  unit: ProductUnit;
}

export interface Sale {
  id: string;
  items: SaleItem[];
  total: number;
  paymentMethod: 'cash' | 'transfer';
  date: number;
  closureId?: string; // Vinculación a la sesión de caja
}

export interface ProductClosureSnapshot {
  productId: string;
  name: string;
  unit: ProductUnit;
  initialStock: number;
  soldQuantity: number;
}

export interface DayClosure {
  id: string;
  startTime: number;
  endTime: number | null;
  initialCash: number;
  totalCashSales: number;
  totalTransferSales: number;
  finalCashReal: number | null;
  status: 'open' | 'closed';
  notes?: string;
  productSnapshots: Record<string, ProductClosureSnapshot>;
}

export interface FinancialSettings {
  businessName: string;
  initialInvestment: number;
  workerSalaryRate: number;
  telegramConfig?: {
    chatId: string;
    botToken?: string;
    enabled: boolean;
  };
}

export interface AutoSaveConfig {
  enabled: boolean;
  lastSaved: number | null;
}

export type Permission = 'pos' | 'inventory' | 'products' | 'stats' | 'insights' | 'sales-history' | 'settings';

export interface Role {
  id: string;
  name: string;
  permissions: Permission[];
}

export interface User {
  id: string;
  username: string;
  roleId: string;
  email?: string;
}
