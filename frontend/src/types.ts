export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';
export type UserRole = 'ADMIN' | 'SALES' | 'WAREHOUSE' | 'ACCOUNTS';

export interface PublicUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface FollowUpAuthor {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface CustomerFollowUp {
  id: string;
  customerId: string;
  note: string;
  followUpDate: string;
  createdAt: string;
  createdBy: FollowUpAuthor | null;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  email: string | null;
  businessName: string | null;
  gstNumber: string | null;
  customerType: CustomerType;
  address: string | null;
  status: CustomerStatus;
  followUpDate: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  customerFollowUps?: CustomerFollowUp[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CustomerListResponse {
  data: Customer[];
  pagination: PaginationMeta;
}

export interface CustomerFormInput {
  name: string;
  mobile: string;
  email: string;
  businessName: string;
  gstNumber: string;
  customerType: CustomerType | '';
  address: string;
  status: CustomerStatus;
  followUpDate: string;
  notes: string;
}

// ===== Inventory =====

export type MovementType = 'IN' | 'OUT';

export interface WarehouseRef {
  id: string;
  name: string;
  location: string;
}

export interface WarehouseProductSummary {
  id: string;
  name: string;
  sku: string;
  currentStock: number;
  isActive: boolean;
}

export interface Warehouse {
  id: string;
  name: string;
  location: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  products?: WarehouseProductSummary[];
}

export interface WarehouseListResponse {
  data: Warehouse[];
  pagination: PaginationMeta;
}

export interface WarehouseFormInput {
  name: string;
  location: string;
  isActive: boolean;
}

export interface StockMovementAuthor {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface StockMovement {
  id: string;
  productId: string;
  challanId: string | null;
  quantity: number;
  movementType: MovementType;
  reason: string;
  createdById: string | null;
  createdAt: string;
  createdBy: StockMovementAuthor | null;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  category: string | null;
  unitPrice: string;
  currentStock: number;
  minimumStockAlert: number;
  warehouseId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  warehouse?: WarehouseRef | null;
  stockMovements?: StockMovement[];
}

export interface ProductListResponse {
  data: Product[];
  pagination: PaginationMeta;
}

export interface ProductFormInput {
  name: string;
  sku: string;
  category: string;
  unitPrice: string;
  minimumStockAlert: string;
  warehouseId: string;
  isActive: boolean;
}

export interface StockMovementFormInput {
  quantity: string;
  reason: string;
}
