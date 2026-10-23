export const SERVICE_ORDER_QUERIES = Symbol('SERVICE_ORDER_QUERIES');

export type ServiceOrderCustomerView = {
  id: string;
  name: string;
  address: string | null;
  document: string | null;
  documentType: 'CPF' | 'CNPJ' | null;
  phoneNumber: string | null;
};

export type ServiceOrderProductView = {
  productId: string;
  name: string;
  unitPriceCents: number;
  quantity: number;
  totalCents: number;
};

export type ServiceOrderServiceView = {
  serviceId: string;
  name: string;
  priceCents: number;
};

export type ServiceOrderView = {
  id: string;
  protocol: string;
  note: string | null;
  customer: ServiceOrderCustomerView;
  products: ServiceOrderProductView[];
  services: ServiceOrderServiceView[];
  totalCents: number;
  createdAt: Date;
  updatedAt: Date;
};

export type ServiceOrderListFilters = {
  tenantId: string;
  limit: number;
  offset: number;
  protocol?: string;
  customerId?: string;
  productId?: string;
  serviceId?: string;
};

export type ServiceOrderListResult = {
  items: ServiceOrderView[];
  total: number;
};

export interface ServiceOrderQueries {
  findById(tenantId: string, id: string): Promise<ServiceOrderView | null>;
  list(filters: ServiceOrderListFilters): Promise<ServiceOrderListResult>;
}
