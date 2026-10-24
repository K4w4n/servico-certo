'use client';

import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerInput,
  type Customer,
  type CustomerDocumentType,
  type UpdateCustomerInput,
} from '@servico-certo/contracts';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError, type ApiClient } from '@/shared/lib/api-client';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { createCustomer, updateCustomer } from '../lib/customers-api';
import { getCustomerErrorMessage, isDocumentTakenError } from '../lib/customer-errors';
import {
  formatDocument,
  formatPhoneNumber,
  normalizeDocument,
  normalizePhoneNumber,
} from '../lib/customer-format';

type FieldName = 'name' | 'documentType' | 'document' | 'phoneNumber' | 'address';
type FieldErrors = Partial<Record<FieldName, string>>;
type DocumentTypeValue = '' | CustomerDocumentType;

type FormValues = {
  name: string;
  documentType: DocumentTypeValue;
  document: string;
  phoneNumber: string;
  address: string;
};

const FIELDS: FieldName[] = ['name', 'documentType', 'document', 'phoneNumber', 'address'];

function isFieldName(value: unknown): value is FieldName {
  return typeof value === 'string' && FIELDS.includes(value as FieldName);
}

function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]): FieldErrors {
  const errors: FieldErrors = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (isFieldName(field) && !errors[field]) {
      errors[field] = issue.message;
    }
  }

  return errors;
}

type CommonProps = {
  request: ApiClient['fetch'];
  onClose: () => void;
  onSaved: (customer: Customer) => void;
};

type CustomerFormDialogProps =
  | (CommonProps & {
      mode: 'create';
    })
  | (CommonProps & {
      mode: 'edit';
      customer: Customer;
    });

export function CustomerFormDialog(props: CustomerFormDialogProps) {
  const isEdit = props.mode === 'edit';
  const customer = props.mode === 'edit' ? props.customer : null;

  const [values, setValues] = useState<FormValues>(() => ({
    name: customer?.name ?? '',
    documentType: customer?.documentType ?? '',
    document: customer?.document ? formatDocument(customer.document) : '',
    phoneNumber: customer?.phoneNumber ? formatPhoneNumber(customer.phoneNumber) : '',
    address: customer?.address ?? '',
  }));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const documentPlaceholder =
    values.documentType === 'CNPJ' ? '00.000.000/0000-00' : '000.000.000-00';

  function handleChange(field: 'name' | 'document' | 'phoneNumber' | 'address') {
    return (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { value } = event.target;

      setValues((current) => ({ ...current, [field]: value }));
      setFieldErrors((current) => ({ ...current, [field]: undefined }));
      setFormError(null);
    };
  }

  function handleDocumentTypeChange(event: ChangeEvent<HTMLSelectElement>) {
    const documentType = event.target.value as DocumentTypeValue;

    setValues((current) => ({
      ...current,
      documentType,
      ...(documentType === '' ? { document: '' } : {}),
    }));
    setFieldErrors((current) => ({ ...current, documentType: undefined, document: undefined }));
    setFormError(null);
  }

  function handleDocumentBlur() {
    const document = normalizeDocument(values.document);

    if (values.documentType === 'CPF' && /^\d{11}$/.test(document)) {
      setValues((current) => ({ ...current, document: formatDocument(document) }));
      return;
    }

    if (values.documentType === 'CNPJ' && /^[A-Z0-9]{12}\d{2}$/.test(document)) {
      setValues((current) => ({ ...current, document: formatDocument(document) }));
    }
  }

  function validateDocumentPair(): boolean {
    const document = normalizeDocument(values.document);
    const hasDocument = document.length > 0;
    const hasDocumentType = values.documentType !== '';

    if (hasDocument !== hasDocumentType) {
      setFieldErrors(
        hasDocument
          ? { documentType: 'Selecione o tipo do documento' }
          : { document: 'Informe o número do documento' },
      );
      return false;
    }

    if (!hasDocument) {
      return true;
    }

    if (values.documentType === 'CPF' && !/^\d{11}$/.test(document)) {
      setFieldErrors({ document: 'CPF deve conter 11 dígitos' });
      return false;
    }

    if (values.documentType === 'CNPJ' && !/^[A-Z0-9]{12}\d{2}$/.test(document)) {
      setFieldErrors({
        document: 'CNPJ deve conter 12 caracteres alfanuméricos e 2 dígitos verificadores',
      });
      return false;
    }

    return true;
  }

  function handleApiError(error: unknown) {
    if (error instanceof ApiError) {
      if (isDocumentTakenError(error)) {
        setFieldErrors((current) => ({
          ...current,
          document: 'Este documento já está em uso neste tenant.',
        }));
        return;
      }

      if (error.code === 'INVALID_DOCUMENT') {
        setFieldErrors((current) => ({
          ...current,
          document: error.message || 'Documento inválido.',
        }));
        return;
      }

      if (error.code === 'INVALID_PHONE_NUMBER') {
        setFieldErrors((current) => ({
          ...current,
          phoneNumber: error.message || 'Telefone inválido.',
        }));
        return;
      }

      if (error.code === 'INVALID_CUSTOMER_NAME') {
        setFieldErrors((current) => ({
          ...current,
          name: error.message || 'Nome do cliente inválido.',
        }));
        return;
      }

      if (error.code === 'INVALID_ADDRESS') {
        setFieldErrors((current) => ({
          ...current,
          address: error.message || 'Endereço do cliente inválido.',
        }));
        return;
      }
    }

    setFormError(
      getCustomerErrorMessage(
        error,
        isEdit ? 'Não foi possível salvar as alterações.' : 'Não foi possível criar o cliente.',
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

    if (!validateDocumentPair()) {
      return;
    }

    const document = normalizeDocument(values.document);
    const hasDocument = document.length > 0;

    if (props.mode === 'create') {
      const input: CreateCustomerInput = {
        name: values.name,
        ...(values.address.trim() ? { address: values.address } : {}),
        ...(values.phoneNumber.trim() ? { phoneNumber: values.phoneNumber } : {}),
        ...(hasDocument
          ? { document, documentType: values.documentType as CustomerDocumentType }
          : {}),
      };
      const result = createCustomerSchema.safeParse(input);

      if (!result.success) {
        setFieldErrors(toFieldErrors(result.error.issues));
        return;
      }

      setIsSubmitting(true);

      try {
        const saved = await createCustomer(props.request, result.data);
        props.onSaved(saved);
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const changes: UpdateCustomerInput = {};
    const name = values.name.trim();
    const address = values.address.trim() || null;
    const phoneNumber = normalizePhoneNumber(values.phoneNumber) || null;

    if (name !== props.customer.name) {
      changes.name = name;
    }

    if (address !== props.customer.address) {
      changes.address = address;
    }

    if (phoneNumber !== props.customer.phoneNumber) {
      changes.phoneNumber = phoneNumber;
    }

    if (hasDocument) {
      const documentType = values.documentType as CustomerDocumentType;

      if (document !== props.customer.document || documentType !== props.customer.documentType) {
        changes.document = document;
        changes.documentType = documentType;
      }
    } else if (props.customer.document !== null || props.customer.documentType !== null) {
      changes.document = null;
      changes.documentType = null;
    }

    if (Object.keys(changes).length === 0) {
      setFormError('Nenhuma alteração para salvar.');
      return;
    }

    const result = updateCustomerSchema.safeParse(changes);

    if (!result.success) {
      setFieldErrors(toFieldErrors(result.error.issues));
      return;
    }

    setIsSubmitting(true);

    try {
      const saved = await updateCustomer(props.request, props.customer.id, result.data);
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
      title={isEdit ? 'Editar cliente' : 'Novo cliente'}
      description={isEdit ? 'Atualize os dados do cliente.' : 'Cadastre um novo cliente no tenant.'}
      closeDisabled={isSubmitting}
    >
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        <div className="flex flex-col gap-2">
          <Label htmlFor="customer-name">Nome</Label>
          <Input
            id="customer-name"
            name="name"
            type="text"
            autoComplete="name"
            autoFocus
            placeholder="Maria Silva"
            maxLength={160}
            value={values.name}
            onChange={handleChange('name')}
            aria-invalid={Boolean(fieldErrors.name)}
            aria-describedby={fieldErrors.name ? 'customer-name-error' : undefined}
            disabled={isSubmitting}
          />
          {fieldErrors.name ? (
            <p id="customer-name-error" className="text-sm text-destructive">
              {fieldErrors.name}
            </p>
          ) : null}
        </div>

        <div
          className={
            values.documentType
              ? 'grid gap-4 sm:grid-cols-[minmax(0,10rem)_minmax(0,1fr)]'
              : 'flex flex-col gap-4'
          }
        >
          <div className="flex flex-col gap-2">
            <Label htmlFor="customer-document-type">Tipo de documento</Label>
            <Select
              id="customer-document-type"
              name="documentType"
              value={values.documentType}
              onChange={handleDocumentTypeChange}
              aria-invalid={Boolean(fieldErrors.documentType)}
              aria-describedby={
                fieldErrors.documentType ? 'customer-document-type-error' : undefined
              }
              disabled={isSubmitting}
            >
              <option value="">Sem documento</option>
              <option value="CPF">CPF</option>
              <option value="CNPJ">CNPJ</option>
            </Select>
            {fieldErrors.documentType ? (
              <p id="customer-document-type-error" className="text-sm text-destructive">
                {fieldErrors.documentType}
              </p>
            ) : null}
          </div>

          {values.documentType ? (
            <div className="flex flex-col gap-2">
              <Label htmlFor="customer-document">Documento</Label>
              <Input
                id="customer-document"
                name="document"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={documentPlaceholder}
                maxLength={18}
                value={values.document}
                onChange={handleChange('document')}
                onBlur={handleDocumentBlur}
                aria-invalid={Boolean(fieldErrors.document)}
                aria-describedby={
                  fieldErrors.document ? 'customer-document-error' : 'customer-document-hint'
                }
                disabled={isSubmitting}
              />
              {fieldErrors.document ? (
                <p id="customer-document-error" className="text-sm text-destructive">
                  {fieldErrors.document}
                </p>
              ) : (
                <p id="customer-document-hint" className="text-xs text-muted-foreground">
                  CPF ou CNPJ, com ou sem pontuação. Para remover, selecione “Sem documento”.
                </p>
              )}
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="customer-phone">Telefone</Label>
          <Input
            id="customer-phone"
            name="phoneNumber"
            type="tel"
            autoComplete="tel"
            placeholder="(11) 99999-8888"
            maxLength={15}
            value={values.phoneNumber}
            onChange={handleChange('phoneNumber')}
            aria-invalid={Boolean(fieldErrors.phoneNumber)}
            aria-describedby={
              fieldErrors.phoneNumber ? 'customer-phone-error' : 'customer-phone-hint'
            }
            disabled={isSubmitting}
          />
          {fieldErrors.phoneNumber ? (
            <p id="customer-phone-error" className="text-sm text-destructive">
              {fieldErrors.phoneNumber}
            </p>
          ) : (
            <p id="customer-phone-hint" className="text-xs text-muted-foreground">
              10 ou 11 dígitos, com ou sem pontuação.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="customer-address">Endereço</Label>
          <Textarea
            id="customer-address"
            name="address"
            autoComplete="street-address"
            placeholder="Rua das Flores, 123 — Centro"
            maxLength={500}
            rows={3}
            value={values.address}
            onChange={handleChange('address')}
            aria-invalid={Boolean(fieldErrors.address)}
            aria-describedby={fieldErrors.address ? 'customer-address-error' : undefined}
            disabled={isSubmitting}
          />
          {fieldErrors.address ? (
            <p id="customer-address-error" className="text-sm text-destructive">
              {fieldErrors.address}
            </p>
          ) : null}
        </div>

        {formError ? <Alert variant="destructive">{formError}</Alert> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={props.onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar cliente'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
