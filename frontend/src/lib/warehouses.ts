import { apiFetch } from './api';
import { Warehouse, WarehouseListResponse } from '../types';

export interface ListWarehousesParams {
  page?: number;
  limit?: number;
  search?: string;
  isActive?: boolean | '';
}

export function listWarehouses(params: ListWarehousesParams): Promise<WarehouseListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.isActive !== undefined && params.isActive !== '') query.set('isActive', String(params.isActive));

  return apiFetch<WarehouseListResponse>(`/api/warehouses?${query.toString()}`);
}

export function getWarehouse(id: string): Promise<Warehouse> {
  return apiFetch<Warehouse>(`/api/warehouses/${id}`);
}

export function createWarehouse(payload: Record<string, unknown>): Promise<Warehouse> {
  return apiFetch<Warehouse>('/api/warehouses', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateWarehouse(id: string, payload: Record<string, unknown>): Promise<Warehouse> {
  return apiFetch<Warehouse>(`/api/warehouses/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}
