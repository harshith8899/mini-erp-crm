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
