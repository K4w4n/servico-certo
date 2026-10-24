'use client';

import { Search } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SearchableSelect } from '@/shared/ui/searchable-select';
import type { ServiceOrderReferences } from '../lib/service-order-references';

export type ServiceOrderFiltersValues = {
  protocol: string;
  customerId: string;
  productId: string;
  serviceId: string;
};

type ServiceOrdersFiltersProps = {
  values: ServiceOrderFiltersValues;
  references: ServiceOrderReferences;
  isReferencesLoading: boolean;
  onChange: (values: ServiceOrderFiltersValues) => void;
  onSubmit: () => void;
  onClear: () => void;
};

export function ServiceOrdersFilters({
  values,
  references,
  isReferencesLoading,
  onChange,
  onSubmit,
  onClear,
}: ServiceOrdersFiltersProps) {
  function handleProtocolChange(event: ChangeEvent<HTMLInputElement>) {
    onChange({ ...values, protocol: event.target.value.replace(/\D/g, '') });
  }

  function handleSelectChange(field: 'customerId' | 'productId' | 'serviceId') {
    return (value: string) => {
      onChange({ ...values, [field]: value });
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form
      className="rounded-xl border bg-card p-4 text-card-foreground shadow-sm"
      onSubmit={handleSubmit}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-protocol">Protocolo</Label>
          <Input
            id="filter-protocol"
            name="protocol"
            type="search"
            inputMode="numeric"
            autoComplete="off"
            placeholder="Buscar por protocolo"
            maxLength={9}
            value={values.protocol}
            onChange={handleProtocolChange}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-customer">Cliente</Label>
          <SearchableSelect
            id="filter-customer"
            value={values.customerId}
            options={references.customers.map((customer) => ({
              value: customer.id,
              label: customer.name,
            }))}
            onChange={handleSelectChange('customerId')}
            placeholder="Todos os clientes"
            emptyMessage="Nenhum cliente encontrado."
            disabled={isReferencesLoading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-product">Produto</Label>
          <SearchableSelect
            id="filter-product"
            value={values.productId}
            options={references.products.map((product) => ({
              value: product.id,
              label: product.name,
            }))}
            onChange={handleSelectChange('productId')}
            placeholder="Todos os produtos"
            emptyMessage="Nenhum produto encontrado."
            disabled={isReferencesLoading}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-service">Serviço</Label>
          <SearchableSelect
            id="filter-service"
            value={values.serviceId}
            options={references.services.map((service) => ({
              value: service.id,
              label: service.name,
            }))}
            onChange={handleSelectChange('serviceId')}
            placeholder="Todos os serviços"
            emptyMessage="Nenhum serviço encontrado."
            disabled={isReferencesLoading}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap justify-end gap-2">
        <Button type="submit">
          <Search aria-hidden="true" />
          Pesquisar
        </Button>
        <Button type="button" variant="outline" onClick={onClear}>
          Limpar
        </Button>
      </div>
    </form>
  );
}
