import type { ServiceOrder } from '@servico-certo/contracts';

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function formatProtocol(protocol: string): string {
  return `#${protocol}`;
}

export function formatServiceOrderDate(isoDate: string): string {
  const date = new Date(isoDate);

  return Number.isNaN(date.getTime()) ? '—' : dateTimeFormatter.format(date);
}

export function describeServiceOrderItems(order: ServiceOrder): string {
  const items = [
    ...order.products.map((item) => `${item.quantity}× ${item.name}`),
    ...order.services.map((item) => item.name),
  ];

  return items.length > 0 ? items.join(' · ') : 'Sem itens';
}

export function countServiceOrderItems(order: ServiceOrder): string {
  const parts: string[] = [];

  if (order.products.length > 0) {
    parts.push(`${order.products.length} produto${order.products.length === 1 ? '' : 's'}`);
  }

  if (order.services.length > 0) {
    parts.push(`${order.services.length} serviço${order.services.length === 1 ? '' : 's'}`);
  }

  return parts.join(' · ');
}
