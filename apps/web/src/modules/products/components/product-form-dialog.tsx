'use client';

import {
  createProductSchema,
  updateProductSchema,
  type CreateProductInput,
  type Product,
  type UpdateProductInput,
} from '@servico-certo/contracts';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError, type ApiClient } from '@/shared/lib/api-client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { createProduct, updateProduct } from '../lib/products-api';
import { getProductErrorMessage } from '../lib/product-errors';
import { formatPriceInput, parsePriceToCents } from '@/shared/lib/price';

type FieldName = 'name' | 'description' | 'price';
type FieldErrors = Partial<Record<FieldName, string>>;

type FormValues = {
  name: string;
  description: string;
  price: string;
};

const FIELD_BY_PATH: Record<string, FieldName> = {
  name: 'name',
  description: 'description',
  priceCents: 'price',
};

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of issues) {
    const field = FIELD_BY_PATH[issue.path.map(String).join('.')];

    if (field && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

type CommonProps = {
  request: ApiClient['fetch'];
  onClose: () => void;
  onSaved: (product: Product) => void;
};

type ProductFormDialogProps =
  | (CommonProps & {
      mode: 'create';
    })
  | (CommonProps & {
      mode: 'edit';
      product: Product;
    });

export function ProductFormDialog(props: ProductFormDialogProps) {
  const isEdit = props.mode === 'edit';
  const product = props.mode === 'edit' ? props.product : null;

  const [values, setValues] = useState<FormValues>(() => ({
    name: product?.name ?? '',
    description: product?.description ?? '',
    price: product ? formatPriceInput(product.priceCents) : '',
  }));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function handleChange(field: FieldName) {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;

      setValues((current) => ({ ...current, [field]: value }));
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
      setFormError(null);
    };
  }

  function handlePriceBlur() {
    const priceCents = parsePriceToCents(values.price);

    if (priceCents !== null) {
      setValues((current) => ({ ...current, price: formatPriceInput(priceCents) }));
    }
  }

  function handleApiError(error: unknown) {
    if (error instanceof ApiError) {
      if (error.code === 'INVALID_PRICE') {
        setFieldErrors((current) => ({
          ...current,
          price: error.message || 'Preço inválido.',
        }));
        return;
      }

      if (error.code === 'INVALID_PRODUCT_NAME') {
        setFieldErrors((current) => ({
          ...current,
          name: error.message || 'Nome do produto inválido.',
        }));
        return;
      }

      if (error.code === 'INVALID_PRODUCT_DESCRIPTION') {
        setFieldErrors((current) => ({
          ...current,
          description: error.message || 'Descrição do produto inválida.',
        }));
        return;
      }
    }

    setFormError(
      getProductErrorMessage(
        error,
        isEdit ? 'Não foi possível salvar as alterações.' : 'Não foi possível criar o produto.',
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError(null);
    setFieldErrors({});

    const priceCents = parsePriceToCents(values.price);

    if (props.mode === 'create') {
      const input: CreateProductInput = {
        name: values.name,
        description: values.description,
        priceCents: priceCents ?? 0,
      };
      const result = createProductSchema.safeParse(input);

      if (!result.success) {
        const errors = toFieldErrors(result.error.issues);

        if (priceCents === null) {
          errors.price = 'Informe um preço válido';
        }

        setFieldErrors(errors);
        return;
      }

      if (priceCents === null) {
        setFieldErrors({ price: 'Informe um preço válido' });
        return;
      }

      setIsSubmitting(true);

      try {
        const saved = await createProduct(props.request, result.data);
        props.onSaved(saved);
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    if (priceCents === null) {
      setFieldErrors({ price: 'Informe um preço válido' });
      return;
    }

    const changes: UpdateProductInput = {};
    const name = values.name.trim();
    const description = values.description.trim();

    if (name !== props.product.name) {
      changes.name = name;
    }

    if (description !== props.product.description) {
      changes.description = description;
    }

    if (priceCents !== props.product.priceCents) {
      changes.priceCents = priceCents;
    }

    if (Object.keys(changes).length === 0) {
      setFormError('Nenhuma alteração para salvar.');
      return;
    }

    const result = updateProductSchema.safeParse(changes);

    if (!result.success) {
      setFieldErrors(toFieldErrors(result.error.issues));
      return;
    }

    setIsSubmitting(true);

    try {
      const saved = await updateProduct(props.request, props.product.id, result.data);
      props.onSaved(saved);
    } catch (error) {
      handleApiError(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog
      open
      onClose={props.onClose}
      title={isEdit ? 'Editar produto' : 'Novo produto'}
      description={isEdit ? 'Atualize os dados do produto.' : 'Cadastre um novo produto no tenant.'}
      closeDisabled={isSubmitting}
    >
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="product-name" className="text-fog/70">
            Nome
          </Label>
          <Input
            id="product-name"
            name="name"
            type="text"
            autoComplete="off"
            autoFocus
            placeholder="Tinta de Cabelo"
            maxLength={160}
            value={values.name}
            onChange={handleChange('name')}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'product-name-error' : undefined}
            disabled={isSubmitting}
          />
          {fieldErrors.name ? (
            <p id="product-name-error" className="text-sm text-destructive">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="product-description" className="text-fog/70">
            Descrição
          </Label>
          <Textarea
            id="product-description"
            name="description"
            placeholder="Tinta profissional castanho 60 ml"
            maxLength={2000}
            rows={4}
            value={values.description}
            onChange={handleChange('description')}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={fieldErrors.description ? 'product-description-error' : undefined}
            disabled={isSubmitting}
          />
          {fieldErrors.description ? (
            <p id="product-description-error" className="text-sm text-destructive">
              {fieldErrors.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="product-price" className="text-fog/70">
            Preço (R$)
          </Label>
          <Input
            id="product-price"
            name="price"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0,00"
            maxLength={18}
            value={values.price}
            onChange={handleChange('price')}
            onBlur={handlePriceBlur}
            aria-invalid={Boolean(fieldErrors.price)}
            aria-describedby={fieldErrors.price ? 'product-price-error' : 'product-price-hint'}
            disabled={isSubmitting}
          />
          {fieldErrors.price ? (
            <p id="product-price-error" className="text-sm text-destructive">
              {fieldErrors.price}
            </p>
          ) : (
            <p id="product-price-hint" className="text-xs text-fog/45">
              Use vírgula para os centavos. Ex.: 45,90.
            </p>
          )}
        </div>

        {formError ? <Alert variant="destructive">{formError}</Alert> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={props.onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="brand" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar produto'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
