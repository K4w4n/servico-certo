import {
  PUBLIC_ID_PREFIXES,
  type ListServicesResponse,
  type Service as ServiceResponse,
} from '@servico-certo/contracts';
import { encodePublicId } from '../../../../shared/ids/public-id.js';
import type { Service } from '../../domain/entities/service.js';
import type { ServiceListResult } from '../../domain/repositories/service.repository.js';

export function toServiceResponse(service: Service): ServiceResponse {
  return {
    id: encodePublicId(PUBLIC_ID_PREFIXES.service, service.id),
    name: service.name,
    description: service.description,
    priceCents: service.price.cents,
    createdAt: service.createdAt.toISOString(),
    updatedAt: service.updatedAt.toISOString(),
  };
}

export function toListServicesResponse(
  result: ServiceListResult,
  pagination: { limit: number; offset: number },
): ListServicesResponse {
  return {
    data: result.items.map(toServiceResponse),
    meta: {
      limit: pagination.limit,
      offset: pagination.offset,
      total: result.total,
    },
  };
}
