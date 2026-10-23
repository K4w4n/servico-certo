import type { ServiceOrder } from '../entities/service-order.js';
import type { Protocol } from '../value-objects/protocol.js';

export const SERVICE_ORDER_REPOSITORY = Symbol('SERVICE_ORDER_REPOSITORY');

export interface ServiceOrderRepository {
  findById(tenantId: string, id: string): Promise<ServiceOrder | null>;
  save(order: ServiceOrder): Promise<void>;
  replaceItems(order: ServiceOrder): Promise<void>;
  nextProtocol(tenantId: string): Promise<Protocol>;
  softDelete(tenantId: string, id: string, deletedAt: Date): Promise<boolean>;
}
