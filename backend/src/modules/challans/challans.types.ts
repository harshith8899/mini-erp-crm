export type ChallanStatusValue = 'DRAFT' | 'CONFIRMED' | 'CANCELLED';

export interface ChallanItemInput {
  productId: string;
  quantity: number;
}

export interface CreateChallanInput {
  customerId: string;
  status: 'DRAFT' | 'CONFIRMED';
  items: ChallanItemInput[];
}

export interface UpdateChallanInput {
  customerId?: string;
  items?: ChallanItemInput[];
}

export interface ListChallansQuery {
  page: number;
  limit: number;
  status?: ChallanStatusValue;
  customerId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
}
