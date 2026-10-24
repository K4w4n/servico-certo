'use client';

import { Search } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export type ProductFiltersValues = {
  name: string;
};

type ProductsFiltersProps = {
  values: ProductFiltersValues;
  onChange: (values: ProductFiltersValues) => void;
  onSubmit: () => void;
  onClear: () => void;
};

export function ProductsFilters({ values, onChange, onSubmit, onClear }: ProductsFiltersProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange({ ...values, name: event.target.value });
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
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-name">Nome</Label>
          <Input
            id="filter-name"
            name="name"
            type="search"
            autoComplete="off"
            placeholder="Buscar por nome"
            maxLength={160}
            value={values.name}
            onChange={handleChange}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit">
            <Search aria-hidden="true" />
            Pesquisar
          </Button>
          <Button type="button" variant="outline" onClick={onClear}>
            Limpar
          </Button>
        </div>
      </div>
    </form>
  );
}
