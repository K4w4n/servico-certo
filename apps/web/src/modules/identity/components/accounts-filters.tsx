'use client';

import { Search } from 'lucide-react';
import type { ChangeEvent, FormEvent } from 'react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';

export type AccountFiltersValues = {
  name: string;
  email: string;
};

type AccountsFiltersProps = {
  values: AccountFiltersValues;
  onChange: (values: AccountFiltersValues) => void;
  onSubmit: () => void;
  onClear: () => void;
};

export function AccountsFilters({ values, onChange, onSubmit, onClear }: AccountsFiltersProps) {
  function handleChange(field: keyof AccountFiltersValues) {
    return (event: ChangeEvent<HTMLInputElement>) => {
      onChange({ ...values, [field]: event.target.value });
    };
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="rounded-2xl border bg-card p-4 text-card-foreground" onSubmit={handleSubmit}>
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-name" className="text-fog/70">
            Nome
          </Label>
          <Input
            id="filter-name"
            name="name"
            type="search"
            autoComplete="off"
            placeholder="Buscar por nome"
            maxLength={120}
            value={values.name}
            onChange={handleChange('name')}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-email" className="text-fog/70">
            E-mail
          </Label>
          <Input
            id="filter-email"
            name="email"
            type="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Buscar por e-mail"
            maxLength={255}
            value={values.email}
            onChange={handleChange('email')}
          />
        </div>

        <div className="flex gap-2">
          <Button type="submit" variant="brand">
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
