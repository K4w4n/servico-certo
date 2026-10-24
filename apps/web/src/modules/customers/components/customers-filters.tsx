'use client';

import { Search } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export type CustomerFiltersValues = {
  name: string;
  document: string;
};

type CustomersFiltersProps = {
  values: CustomerFiltersValues;
  onChange: (values: CustomerFiltersValues) => void;
  onSubmit: () => void;
  onClear: () => void;
};

export function CustomersFilters({ values, onChange, onSubmit, onClear }: CustomersFiltersProps) {
  function handleChange(field: keyof CustomerFiltersValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...values, [field]: event.target.value });
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
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
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
            onChange={handleChange('name')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-document">Documento</Label>
          <Input
            id="filter-document"
            name="document"
            type="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Buscar por CPF/CNPJ"
            maxLength={18}
            value={values.document}
            onChange={handleChange('document')}
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
