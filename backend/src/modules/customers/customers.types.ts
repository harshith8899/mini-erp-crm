export type CustomerType = 'RETAIL' | 'WHOLESALE' | 'DISTRIBUTOR';
export type CustomerStatus = 'LEAD' | 'ACTIVE' | 'INACTIVE';

export interface CreateCustomerInput {
  name: string;
  mobile: string;
  email?: string | null;
  businessName?: string | null;
  gstNumber?: string | null;
  customerType: CustomerType;
  address?: string | null;
  status?: CustomerStatus;
  followUpDate?: Date | null;
  notes?: string | null;
}

export interface UpdateCustomerInput {
  name?: string;
  mobile?: string;
  email?: string | null;
  businessName?: string | null;
  gstNumber?: string | null;
  customerType?: CustomerType;
  address?: string | null;
  status?: CustomerStatus;
  followUpDate?: Date | null;
  notes?: string | null;
}

export interface ListCustomersQuery {
  page: number;
  limit: number;
  search?: string;
  status?: CustomerStatus;
  customerType?: CustomerType;
}

export interface CreateFollowUpInput {
  note: string;
  followUpDate: Date;
}
