import { apiFetch } from './api';
import { Challan, ChallanLineInput, ChallanListResponse, ChallanStatus } from '../types';

export interface ListChallansParams {
  page?: number;
  limit?: number;
  status?: ChallanStatus | '';
  customerId?: string;
  search?: string;
}

export function listChallans(params: ListChallansParams): Promise<ChallanListResponse> {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.status) query.set('status', params.status);
  if (params.customerId) query.set('customerId', params.customerId);
  if (params.search) query.set('search', params.search);

  return apiFetch<ChallanListResponse>(`/api/challans?${query.toString()}`);
}

export function getChallan(id: string): Promise<Challan> {
  return apiFetch<Challan>(`/api/challans/${id}`);
}

export function createChallan(
  customerId: string,
  items: ChallanLineInput[],
  status: 'DRAFT' | 'CONFIRMED'
): Promise<Challan> {
  return apiFetch<Challan>('/api/challans', {
    method: 'POST',
    body: JSON.stringify({ customerId, items, status })
  });
}

export function updateChallan(
  id: string,
  payload: { customerId?: string; items?: ChallanLineInput[] }
): Promise<Challan> {
  return apiFetch<Challan>(`/api/challans/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload)
  });
}

export function confirmChallan(id: string): Promise<Challan> {
  return apiFetch<Challan>(`/api/challans/${id}/confirm`, { method: 'POST' });
}

export function cancelChallan(id: string): Promise<Challan> {
  return apiFetch<Challan>(`/api/challans/${id}/cancel`, { method: 'POST' });
}
