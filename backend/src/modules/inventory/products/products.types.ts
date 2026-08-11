export type MovementType = 'IN' | 'OUT';

export interface CreateProductInput {
  name: string;
  sku: string;
  category?: string | null;
  unitPrice: number;
  minimumStockAlert?: number;
  warehouseId?: string | null;
  isActive?: boolean;
}

export interface UpdateProductInput {
  name?: string;
  sku?: string;
  category?: string | null;
  unitPrice?: number;
  minimumStockAlert?: number;
  warehouseId?: string | null;
  isActive?: boolean;
}

export interface ListProductsQuery {
  page: number;
  limit: number;
  search?: string;
  category?: string;
  warehouseId?: string;
  isActive?: boolean;
}

export interface CreateStockMovementInput {
  quantity: number;
  movementType: MovementType;
  reason: string;
}

export type StockMovementFailureReason = 'PRODUCT_NOT_FOUND' | 'PRODUCT_INACTIVE' | 'INSUFFICIENT_STOCK';

export interface StockMovementResult {
  ok: boolean;
  reason?: StockMovementFailureReason;
  movement?: unknown;
  product?: unknown;
}
