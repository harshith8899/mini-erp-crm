import { apiFetch } from './api';
import { Customer, CustomerListResponse, CustomerStatus, CustomerType } from '../types';

export interface ListCustomersParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: CustomerStatus | '';
  type?: CustomerType | '';
}

export function listCustomers(params: ListCustomersParams): Promise<CustomerListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.search) query.set('search', params.search);
  if (params.status) query.set('status', params.status);
  if (params.type) query.set('type', params.type);

  return apiFetch<CustomerListResponse>(`/api/customers?${query.toString()}`);
}

export function getCustomer(id: string): Promise<Customer> {
  return apiFetch<Customer>(`/api/customers/${id}`);
}

export function createCustomer(payload: Record<string, unknown>): Promise<Customer> {
  return apiFetch<Customer>('/api/customers', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

export function updateCustomer(id: string, payload: Record<string, unknown>): Promise<Customer> {
  return apiFetch<Customer>(`/api/customers/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function addFollowUp(customerId: string, payload: { note: string; followUpDate?: string }) {
  return apiFetch(`/api/customers/${customerId}/follow-ups`, {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}
