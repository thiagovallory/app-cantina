export interface Person {
  id: string;
  customId?: string;
  name: string;
  photo?: string;
  initialDeposit: number;
  balance: number;
  purchases: Purchase[];
}

export interface Product {
  id: string;
  name: string;
  barcode?: string;
  price: number;
  stock: number;
  costPrice?: number; // Custo total do lote comprado
  purchasedQuantity?: number; // Quantidade comprada no lote inicial
}

export interface PurchaseItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Purchase {
  id: string;
  personId: string;
  date: Date;
  items: PurchaseItem[];
  total: number;
}

export interface BrandingConfig {
  organizationName: string;
  logoUrl: string;
  showLogo: boolean;
  darkMode: boolean;
  missionaryGoal: number;
  missionaryOffersResetAt?: string;
}
