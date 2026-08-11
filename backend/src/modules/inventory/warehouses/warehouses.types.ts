export interface CreateWarehouseInput {
  name: string;
  location: string;
  isActive?: boolean;
}

export interface UpdateWarehouseInput {
  name?: string;
  location?: string;
  isActive?: boolean;
}

export interface ListWarehousesQuery {
  page: number;
  limit: number;
  search?: string;
  isActive?: boolean;
}
