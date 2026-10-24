'use client';

import {
  createServiceSchema,
  updateServiceSchema,
  type CreateServiceInput,
  type Service,
  type UpdateServiceInput,
} from '@servico-certo/contracts';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError, type ApiClient } from '@/shared/lib/api-client';
import { formatPriceInput, parsePriceToCents } from '@/shared/lib/price';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Textarea } from '@/shared/ui/textarea';
import { createService, updateService } from '../lib/services-api';
import { getServiceErrorMessage } from '../lib/service-errors';

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
  onSaved: (service: Service) => void;
};

type ServiceFormDialogProps =
  | (CommonProps & {
      mode: 'create';
    })
  | (CommonProps & {
      mode: 'edit';
      service: Service;
    });

export function ServiceFormDialog(props: ServiceFormDialogProps) {
  const isEdit = props.mode === 'edit';
  const service = props.mode === 'edit' ? props.service : null;

  const [values, setValues] = useState<FormValues>(() => ({
    name: service?.name ?? '',
    description: service?.description ?? '',
    price: service ? formatPriceInput(service.priceCents) : '',
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

      if (error.code === 'INVALID_SERVICE_NAME') {
        setFieldErrors((current) => ({
          ...current,
          name: error.message || 'Nome do serviço inválido.',
        }));
        return;
      }

      if (error.code === 'INVALID_SERVICE_DESCRIPTION') {
        setFieldErrors((current) => ({
          ...current,
          description: error.message || 'Descrição do serviço inválida.',
        }));
        return;
      }
    }

    setFormError(
      getServiceErrorMessage(
        error,
        isEdit ? 'Não foi possível salvar as alterações.' : 'Não foi possível criar o serviço.',
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
      const input: CreateServiceInput = {
        name: values.name,
        description: values.description,
        priceCents: priceCents ?? 0,
      };
      const result = createServiceSchema.safeParse(input);

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
        const saved = await createService(props.request, result.data);
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

    const changes: UpdateServiceInput = {};
    const name = values.name.trim();
    const description = values.description.trim();

    if (name !== props.service.name) {
      changes.name = name;
    }

    if (description !== props.service.description) {
      changes.description = description;
    }

    if (priceCents !== props.service.priceCents) {
      changes.priceCents = priceCents;
    }

    if (Object.keys(changes).length === 0) {
      setFormError('Nenhuma alteração para salvar.');
      return;
    }

    const result = updateServiceSchema.safeParse(changes);

    if (!result.success) {
      setFieldErrors(toFieldErrors(result.error.issues));
      return;
    }

    setIsSubmitting(true);

    try {
      const saved = await updateService(props.request, props.service.id, result.data);
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
      title={isEdit ? 'Editar serviço' : 'Novo serviço'}
      description={isEdit ? 'Atualize os dados do serviço.' : 'Cadastre um novo serviço no tenant.'}
      closeDisabled={isSubmitting}
    >
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="service-name">Nome</Label>
          <Input
            id="service-name"
            name="name"
            type="text"
            autoComplete="off"
            autoFocus
            placeholder="Troca de óleo"
            maxLength={160}
            value={values.name}
            onChange={handleChange('name')}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'service-name-error' : undefined}
            disabled={isSubmitting}
          />
          {fieldErrors.name ? (
            <p id="service-name-error" className="text-sm text-destructive">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="service-description">Descrição</Label>
          <Textarea
            id="service-description"
            name="description"
            placeholder="Troca de óleo e filtro para carro de passeio"
            maxLength={2000}
            rows={4}
            value={values.description}
            onChange={handleChange('description')}
            aria-invalid={Boolean(fieldErrors.description)}
            aria-describedby={fieldErrors.description ? 'service-description-error' : undefined}
            disabled={isSubmitting}
          />
          {fieldErrors.description ? (
            <p id="service-description-error" className="text-sm text-destructive">
              {fieldErrors.description}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="service-price">Preço (R$)</Label>
          <Input
            id="service-price"
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
            aria-describedby={fieldErrors.price ? 'service-price-error' : 'service-price-hint'}
            disabled={isSubmitting}
          />
          {fieldErrors.price ? (
            <p id="service-price-error" className="text-sm text-destructive">
              {fieldErrors.price}
            </p>
          ) : (
            <p id="service-price-hint" className="text-xs text-muted-foreground">
              Use vírgula para os centavos. Ex.: 120,00.
            </p>
          )}
        </div>

        {formError ? <Alert variant="destructive">{formError}</Alert> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={props.onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar serviço'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
