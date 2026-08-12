import { apiFetch } from './api';
import { Product, ProductListResponse, StockMovement } from '../types';

export interface ListProductsParams {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  warehouseId?: string;
  isActive?: boolean | '';
}

export function listProducts(params: ListProductsParams): Promise<ProductListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.category) query.set('category', params.category);
  if (params.warehouseId) query.set('warehouseId', params.warehouseId);
  if (params.isActive !== undefined && params.isActive !== '') query.set('isActive', String(params.isActive));

  return apiFetch<ProductListResponse>(`/api/products?${query.toString()}`);
}

export function getProduct(id: string): Promise<Product> {
  return apiFetch<Product>(`/api/products/${id}`);
}

export function createProduct(payload: Record<string, unknown>): Promise<Product> {
  return apiFetch<Product>('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateProduct(id: string, payload: Record<string, unknown>): Promise<Product> {
  return apiFetch<Product>(`/api/products/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function addStockMovement(
  productId: string,
  payload: { quantity: number; movementType: 'IN' | 'OUT'; reason: string }
): Promise<{ movement: StockMovement; product: Product }> {
  return apiFetch(`/api/products/${productId}/stock-movements`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function listStockMovements(productId: string): Promise<{ data: StockMovement[] }> {
  return apiFetch(`/api/products/${productId}/stock-movements`);
}
