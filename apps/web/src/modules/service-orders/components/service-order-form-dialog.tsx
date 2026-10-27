'use client';

import {
  MAX_SERVICE_ORDER_NOTE_LENGTH,
  MAX_SERVICE_ORDER_QUANTITY,
  createServiceOrderSchema,
  updateServiceOrderSchema,
  type CreateServiceOrderInput,
  type ServiceOrder,
  type UpdateServiceOrderInput,
} from '@servico-certo/contracts';
import { Plus, Trash2 } from 'lucide-react';
import { useState, type ChangeEvent, type FormEvent } from 'react';
import { ApiError, type ApiClient } from '@/shared/lib/api-client';
import { formatPrice, formatPriceInput, parsePriceToCents } from '@/shared/lib/price';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { Dialog } from '@/shared/ui/dialog';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { SearchableSelect } from '@/shared/ui/searchable-select';
import { Textarea } from '@/shared/ui/textarea';
import { createServiceOrder, updateServiceOrder } from '../lib/service-orders-api';
import { getServiceOrderErrorMessage } from '../lib/service-order-errors';
import type { ServiceOrderReferences } from '../lib/service-order-references';

type ProductLine = {
  key: string;
  productId: string;
  name: string;
  unitPrice: string;
  quantity: string;
};

type ServiceLine = {
  key: string;
  serviceId: string;
  name: string;
  price: string;
};

type CustomerFieldErrors = {
  customerId?: string;
};

type ProductLineErrors = {
  productId?: string;
  unitPrice?: string;
  quantity?: string;
};

type ServiceLineErrors = {
  serviceId?: string;
  price?: string;
};

let lineKeySequence = 0;

function nextLineKey(prefix: 'product' | 'service'): string {
  lineKeySequence += 1;

  return `${prefix}-${lineKeySequence}`;
}

function normalizeNote(value: string): string | null {
  const trimmed = value.trim();

  return trimmed.length > 0 ? trimmed : null;
}

type CommonProps = {
  request: ApiClient['fetch'];
  references: ServiceOrderReferences;
  isReferencesLoading: boolean;
  referencesError: string | null;
  onRetryReferences: () => void;
  onClose: () => void;
  onSaved: (order: ServiceOrder) => void;
};

type ServiceOrderFormDialogProps =
  | (CommonProps & {
      mode: 'create';
    })
  | (CommonProps & {
      mode: 'edit';
      serviceOrder: ServiceOrder;
    });

export function ServiceOrderFormDialog(props: ServiceOrderFormDialogProps) {
  const isEdit = props.mode === 'edit';
  const order = props.mode === 'edit' ? props.serviceOrder : null;

  const [customerId, setCustomerId] = useState(order?.customer.id ?? '');
  const [note, setNote] = useState(order?.note ?? '');
  const [productLines, setProductLines] = useState<ProductLine[]>(() =>
    (order?.products ?? []).map((item) => ({
      key: nextLineKey('product'),
      productId: item.productId,
      name: item.name,
      unitPrice: formatPriceInput(item.unitPriceCents),
      quantity: String(item.quantity),
    })),
  );
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>(() =>
    (order?.services ?? []).map((item) => ({
      key: nextLineKey('service'),
      serviceId: item.serviceId,
      name: item.name,
      price: formatPriceInput(item.priceCents),
    })),
  );
  const [customerErrors, setCustomerErrors] = useState<CustomerFieldErrors>({});
  const [productErrors, setProductErrors] = useState<Record<string, ProductLineErrors>>({});
  const [serviceErrors, setServiceErrors] = useState<Record<string, ServiceLineErrors>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentOrderCustomer = props.mode === 'edit' ? props.serviceOrder.customer : null;
  const customerMissing =
    currentOrderCustomer !== null &&
    !props.references.customers.some((item) => item.id === currentOrderCustomer.id);
  const customerOptions = [
    ...props.references.customers.map((customer) => ({
      value: customer.id,
      label: customer.name,
    })),
    ...(customerMissing && currentOrderCustomer
      ? [
          {
            value: currentOrderCustomer.id,
            label: `${currentOrderCustomer.name} (indisponível)`,
          },
        ]
      : []),
  ];
  const hasItems = productLines.length > 0 || serviceLines.length > 0;

  const totalCents = productLines.reduce(
    (total, line) => {
      const unitPriceCents = parsePriceToCents(line.unitPrice);
      const quantity = Number(line.quantity);

      if (unitPriceCents === null || !Number.isInteger(quantity) || quantity < 1) {
        return total;
      }

      return total + unitPriceCents * quantity;
    },
    serviceLines.reduce((total, line) => {
      const priceCents = parsePriceToCents(line.price);

      return priceCents === null ? total : total + priceCents;
    }, 0),
  );

  function clearLineErrors(key: string) {
    setProductErrors((current) => ({ ...current, [key]: {} }));
    setServiceErrors((current) => ({ ...current, [key]: {} }));
  }

  function handleCustomerChange(value: string) {
    setCustomerId(value);
    setCustomerErrors({});
    setFormError(null);
  }

  function handleNoteChange(event: ChangeEvent<HTMLTextAreaElement>) {
    setNote(event.target.value);
    setFormError(null);
  }

  function addProductLine() {
    setProductLines((current) => [
      ...current,
      {
        key: nextLineKey('product'),
        productId: '',
        name: '',
        unitPrice: '',
        quantity: '1',
      },
    ]);
    setFormError(null);
  }

  function addServiceLine() {
    setServiceLines((current) => [
      ...current,
      {
        key: nextLineKey('service'),
        serviceId: '',
        name: '',
        price: '',
      },
    ]);
    setFormError(null);
  }

  function removeProductLine(key: string) {
    setProductLines((current) => current.filter((line) => line.key !== key));
    setProductErrors((current) => {
      const next = { ...current };

      delete next[key];

      return next;
    });
    setFormError(null);
  }

  function removeServiceLine(key: string) {
    setServiceLines((current) => current.filter((line) => line.key !== key));
    setServiceErrors((current) => {
      const next = { ...current };

      delete next[key];

      return next;
    });
    setFormError(null);
  }

  function handleProductChange(line: ProductLine, productId: string) {
    const product = props.references.products.find((item) => item.id === productId);

    setProductLines((current) =>
      current.map((item) =>
        item.key === line.key
          ? {
              ...item,
              productId,
              name: product?.name ?? '',
              unitPrice: product ? formatPriceInput(product.priceCents) : '',
            }
          : item,
      ),
    );
    clearLineErrors(line.key);
    setFormError(null);
  }

  function handleProductPriceChange(line: ProductLine, value: string) {
    setProductLines((current) =>
      current.map((item) => (item.key === line.key ? { ...item, unitPrice: value } : item)),
    );
    clearLineErrors(line.key);
    setFormError(null);
  }

  function handleProductQuantityChange(line: ProductLine, value: string) {
    const quantity = value.replace(/\D/g, '');

    setProductLines((current) =>
      current.map((item) => (item.key === line.key ? { ...item, quantity } : item)),
    );
    clearLineErrors(line.key);
    setFormError(null);
  }

  function handleProductPriceBlur(line: ProductLine) {
    const priceCents = parsePriceToCents(line.unitPrice);

    if (priceCents === null) {
      return;
    }

    setProductLines((current) =>
      current.map((item) =>
        item.key === line.key ? { ...item, unitPrice: formatPriceInput(priceCents) } : item,
      ),
    );
  }

  function handleServiceChange(line: ServiceLine, serviceId: string) {
    const service = props.references.services.find((item) => item.id === serviceId);

    setServiceLines((current) =>
      current.map((item) =>
        item.key === line.key
          ? {
              ...item,
              serviceId,
              name: service?.name ?? '',
              price: service ? formatPriceInput(service.priceCents) : '',
            }
          : item,
      ),
    );
    clearLineErrors(line.key);
    setFormError(null);
  }

  function handleServicePriceChange(line: ServiceLine, value: string) {
    setServiceLines((current) =>
      current.map((item) => (item.key === line.key ? { ...item, price: value } : item)),
    );
    clearLineErrors(line.key);
    setFormError(null);
  }

  function handleServicePriceBlur(line: ServiceLine) {
    const priceCents = parsePriceToCents(line.price);

    if (priceCents === null) {
      return;
    }

    setServiceLines((current) =>
      current.map((item) =>
        item.key === line.key ? { ...item, price: formatPriceInput(priceCents) } : item,
      ),
    );
  }

  function validateForm(): boolean {
    const nextCustomerErrors: CustomerFieldErrors = customerId
      ? {}
      : { customerId: 'Informe o cliente' };
    const nextProductErrors: Record<string, ProductLineErrors> = {};
    const nextServiceErrors: Record<string, ServiceLineErrors> = {};
    const seenProducts = new Set<string>();
    const seenServices = new Set<string>();
    let hasLineErrors = false;

    for (const line of productLines) {
      const lineErrors: ProductLineErrors = {};

      if (!line.productId) {
        lineErrors.productId = 'Selecione o produto';
      } else if (seenProducts.has(line.productId)) {
        lineErrors.productId = 'Produto já adicionado';
      } else {
        seenProducts.add(line.productId);
      }

      if (parsePriceToCents(line.unitPrice) === null) {
        lineErrors.unitPrice = 'Informe um preço válido';
      }

      const quantity = Number(line.quantity);

      if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_SERVICE_ORDER_QUANTITY) {
        lineErrors.quantity = `Informe uma quantidade entre 1 e ${MAX_SERVICE_ORDER_QUANTITY}`;
      }

      if (Object.keys(lineErrors).length > 0) {
        nextProductErrors[line.key] = lineErrors;
        hasLineErrors = true;
      }
    }

    for (const line of serviceLines) {
      const lineErrors: ServiceLineErrors = {};

      if (!line.serviceId) {
        lineErrors.serviceId = 'Selecione o serviço';
      } else if (seenServices.has(line.serviceId)) {
        lineErrors.serviceId = 'Serviço já adicionado';
      } else {
        seenServices.add(line.serviceId);
      }

      if (parsePriceToCents(line.price) === null) {
        lineErrors.price = 'Informe um preço válido';
      }

      if (Object.keys(lineErrors).length > 0) {
        nextServiceErrors[line.key] = lineErrors;
        hasLineErrors = true;
      }
    }

    setCustomerErrors(nextCustomerErrors);
    setProductErrors(nextProductErrors);
    setServiceErrors(nextServiceErrors);

    if (!hasItems) {
      setFormError('Informe pelo menos um produto ou serviço.');
    } else {
      setFormError(null);
    }

    return Boolean(customerId) && hasItems && !hasLineErrors;
  }

  function toProductInput(line: ProductLine) {
    return {
      productId: line.productId,
      unitPriceCents: parsePriceToCents(line.unitPrice) ?? 0,
      quantity: Number(line.quantity),
    };
  }

  function toServiceInput(line: ServiceLine) {
    return {
      serviceId: line.serviceId,
      priceCents: parsePriceToCents(line.price) ?? 0,
    };
  }

  function sameProducts(
    items: ReturnType<typeof toProductInput>[],
    existing: ServiceOrder['products'],
  ): boolean {
    if (items.length !== existing.length) {
      return false;
    }

    const existingById = new Map(existing.map((item) => [item.productId, item]));

    return items.every((item) => {
      const current = existingById.get(item.productId);

      return (
        current !== undefined &&
        current.unitPriceCents === item.unitPriceCents &&
        current.quantity === item.quantity
      );
    });
  }

  function sameServices(
    items: ReturnType<typeof toServiceInput>[],
    existing: ServiceOrder['services'],
  ): boolean {
    if (items.length !== existing.length) {
      return false;
    }

    const existingById = new Map(existing.map((item) => [item.serviceId, item]));

    return items.every((item) => {
      const current = existingById.get(item.serviceId);

      return current !== undefined && current.priceCents === item.priceCents;
    });
  }

  function handleApiError(error: unknown) {
    if (error instanceof ApiError && error.code === 'CUSTOMER_NOT_FOUND') {
      setCustomerErrors({ customerId: 'Cliente não encontrado. Selecione outro cliente.' });
      return;
    }

    setFormError(
      getServiceOrderErrorMessage(
        error,
        isEdit ? 'Não foi possível salvar as alterações.' : 'Não foi possível criar a ordem.',
      ),
    );
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    setFormError(null);

    if (!validateForm()) {
      return;
    }

    const normalizedNote = normalizeNote(note);
    const products = productLines.map(toProductInput);
    const services = serviceLines.map(toServiceInput);

    if (props.mode === 'create') {
      const input: CreateServiceOrderInput = {
        customerId,
        ...(normalizedNote !== null ? { note: normalizedNote } : {}),
        ...(products.length > 0 ? { products } : {}),
        ...(services.length > 0 ? { services } : {}),
      };
      const result = createServiceOrderSchema.safeParse(input);

      if (!result.success) {
        setFormError(result.error.issues[0]?.message ?? 'Verifique os dados informados.');
        return;
      }

      setIsSubmitting(true);

      try {
        const saved = await createServiceOrder(props.request, result.data);
        props.onSaved(saved);
      } catch (error) {
        handleApiError(error);
      } finally {
        setIsSubmitting(false);
      }

      return;
    }

    const productsChanged = !sameProducts(products, props.serviceOrder.products);
    const servicesChanged = !sameServices(services, props.serviceOrder.services);
    const changes: UpdateServiceOrderInput = {};

    if (customerId !== props.serviceOrder.customer.id) {
      changes.customerId = customerId;
    }

    if (normalizedNote !== props.serviceOrder.note) {
      changes.note = normalizedNote;
    }

    if (productsChanged) {
      changes.products = products;
    }

    if (servicesChanged) {
      changes.services = services;
    }

    if (Object.keys(changes).length === 0) {
      setFormError('Nenhuma alteração para salvar.');
      return;
    }

    const result = updateServiceOrderSchema.safeParse(changes);

    if (!result.success) {
      setFormError(result.error.issues[0]?.message ?? 'Verifique os dados informados.');
      return;
    }

    setIsSubmitting(true);

    try {
      const saved = await updateServiceOrder(props.request, props.serviceOrder.id, result.data);
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
      title={isEdit ? 'Editar ordem de serviço' : 'Nova ordem de serviço'}
      description={
        isEdit
          ? 'Atualize o cliente, a observação e os itens da ordem.'
          : 'Cadastre uma nova ordem de serviço no tenant.'
      }
      className="max-w-3xl"
      closeDisabled={isSubmitting}
    >
      <form className="flex flex-col gap-4" noValidate onSubmit={handleSubmit}>
        {props.isReferencesLoading ? (
          <Alert>Carregando clientes, produtos e serviços…</Alert>
        ) : null}

        {props.referencesError ? (
          <Alert variant="destructive">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span>{props.referencesError}</span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={props.onRetryReferences}
                disabled={props.isReferencesLoading}
              >
                Tentar novamente
              </Button>
            </div>
          </Alert>
        ) : null}

        <div className="flex flex-col gap-2">
          <Label htmlFor="service-order-customer" className="text-fog/70">
            Cliente
          </Label>
          <SearchableSelect
            id="service-order-customer"
            value={customerId}
            options={customerOptions}
            onChange={handleCustomerChange}
            placeholder="Selecione um cliente"
            emptyMessage="Nenhum cliente encontrado."
            ariaInvalid={Boolean(customerErrors.customerId)}
            ariaDescribedBy={customerErrors.customerId ? 'service-order-customer-error' : undefined}
            disabled={isSubmitting || props.isReferencesLoading}
          />
          {customerErrors.customerId ? (
            <p id="service-order-customer-error" className="text-sm text-destructive">
              {customerErrors.customerId}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="service-order-note" className="text-fog/70">
            Observação
          </Label>
          <Textarea
            id="service-order-note"
            name="note"
            rows={3}
            maxLength={MAX_SERVICE_ORDER_NOTE_LENGTH}
            placeholder="Informações adicionais sobre a ordem"
            value={note}
            onChange={handleNoteChange}
            disabled={isSubmitting || props.isReferencesLoading}
          />
        </div>

        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Produtos</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addProductLine}
              disabled={isSubmitting || props.isReferencesLoading}
            >
              <Plus aria-hidden="true" />
              Adicionar produto
            </Button>
          </div>

          {productLines.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-fog/45">
              Nenhum produto adicionado.
            </p>
          ) : null}

          {productLines.map((line, index) => {
            const errors = productErrors[line.key] ?? {};
            const productMissing =
              line.productId !== '' &&
              !props.references.products.some((product) => product.id === line.productId);
            const productOptions = [
              ...props.references.products.map((product) => ({
                value: product.id,
                label: product.name,
              })),
              ...(productMissing
                ? [
                    {
                      value: line.productId,
                      label: `${line.name || 'Produto'} (indisponível)`,
                    },
                  ]
                : []),
            ];

            return (
              <div key={line.key} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_90px_auto] md:items-end">
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor={`service-order-product-${line.key}`}
                      className="text-xs text-fog/45"
                    >
                      Produto
                    </Label>
                    <SearchableSelect
                      id={`service-order-product-${line.key}`}
                      value={line.productId}
                      options={productOptions}
                      onChange={(productId) => handleProductChange(line, productId)}
                      placeholder="Selecione o produto"
                      emptyMessage="Nenhum produto encontrado."
                      ariaLabel={`Produto ${index + 1}`}
                      ariaInvalid={Boolean(errors.productId)}
                      disabled={isSubmitting || props.isReferencesLoading}
                    />
                    {errors.productId ? (
                      <p className="text-xs text-destructive">{errors.productId}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor={`service-order-product-price-${line.key}`}
                      className="text-xs text-fog/45"
                    >
                      Preço unitário (R$)
                    </Label>
                    <Input
                      id={`service-order-product-price-${line.key}`}
                      aria-label={`Preço unitário do produto ${index + 1}`}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0,00"
                      maxLength={18}
                      value={line.unitPrice}
                      onChange={(event) => handleProductPriceChange(line, event.target.value)}
                      onBlur={() => handleProductPriceBlur(line)}
                      aria-invalid={Boolean(errors.unitPrice)}
                      disabled={isSubmitting || props.isReferencesLoading}
                    />
                    {errors.unitPrice ? (
                      <p className="text-xs text-destructive">{errors.unitPrice}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor={`service-order-product-quantity-${line.key}`}
                      className="text-xs text-fog/45"
                    >
                      Qtd.
                    </Label>
                    <Input
                      id={`service-order-product-quantity-${line.key}`}
                      aria-label={`Quantidade do produto ${index + 1}`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="off"
                      maxLength={4}
                      value={line.quantity}
                      onChange={(event) => handleProductQuantityChange(line, event.target.value)}
                      aria-invalid={Boolean(errors.quantity)}
                      disabled={isSubmitting || props.isReferencesLoading}
                    />
                    {errors.quantity ? (
                      <p className="text-xs text-destructive">{errors.quantity}</p>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-fog/45 hover:bg-white/5 hover:text-destructive"
                    aria-label={`Remover produto ${index + 1}`}
                    onClick={() => removeProductLine(line.key)}
                    disabled={isSubmitting || props.isReferencesLoading}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })}
        </section>

        <section className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold text-white">Serviços</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addServiceLine}
              disabled={isSubmitting || props.isReferencesLoading}
            >
              <Plus aria-hidden="true" />
              Adicionar serviço
            </Button>
          </div>

          {serviceLines.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-4 text-sm text-fog/45">
              Nenhum serviço adicionado.
            </p>
          ) : null}

          {serviceLines.map((line, index) => {
            const errors = serviceErrors[line.key] ?? {};
            const serviceMissing =
              line.serviceId !== '' &&
              !props.references.services.some((service) => service.id === line.serviceId);
            const serviceOptions = [
              ...props.references.services.map((service) => ({
                value: service.id,
                label: service.name,
              })),
              ...(serviceMissing
                ? [
                    {
                      value: line.serviceId,
                      label: `${line.name || 'Serviço'} (indisponível)`,
                    },
                  ]
                : []),
            ];

            return (
              <div key={line.key} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_140px_auto] md:items-end">
                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor={`service-order-service-${line.key}`}
                      className="text-xs text-fog/45"
                    >
                      Serviço
                    </Label>
                    <SearchableSelect
                      id={`service-order-service-${line.key}`}
                      value={line.serviceId}
                      options={serviceOptions}
                      onChange={(serviceId) => handleServiceChange(line, serviceId)}
                      placeholder="Selecione o serviço"
                      emptyMessage="Nenhum serviço encontrado."
                      ariaLabel={`Serviço ${index + 1}`}
                      ariaInvalid={Boolean(errors.serviceId)}
                      disabled={isSubmitting || props.isReferencesLoading}
                    />
                    {errors.serviceId ? (
                      <p className="text-xs text-destructive">{errors.serviceId}</p>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-1">
                    <Label
                      htmlFor={`service-order-service-price-${line.key}`}
                      className="text-xs text-fog/45"
                    >
                      Preço (R$)
                    </Label>
                    <Input
                      id={`service-order-service-price-${line.key}`}
                      aria-label={`Preço do serviço ${index + 1}`}
                      type="text"
                      inputMode="decimal"
                      autoComplete="off"
                      placeholder="0,00"
                      maxLength={18}
                      value={line.price}
                      onChange={(event) => handleServicePriceChange(line, event.target.value)}
                      onBlur={() => handleServicePriceBlur(line)}
                      aria-invalid={Boolean(errors.price)}
                      disabled={isSubmitting || props.isReferencesLoading}
                    />
                    {errors.price ? (
                      <p className="text-xs text-destructive">{errors.price}</p>
                    ) : null}
                  </div>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-fog/45 hover:bg-white/5 hover:text-destructive"
                    aria-label={`Remover serviço ${index + 1}`}
                    onClick={() => removeServiceLine(line.key)}
                    disabled={isSubmitting || props.isReferencesLoading}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                </div>
              </div>
            );
          })}
        </section>

        <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.04] px-4 py-3">
          <span className="text-sm font-medium">Total</span>
          <span className="text-lg font-semibold" aria-live="polite">
            {formatPrice(totalCents)}
          </span>
        </div>

        {formError ? <Alert variant="destructive">{formError}</Alert> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" onClick={props.onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="brand"
            disabled={isSubmitting || props.isReferencesLoading}
          >
            {isSubmitting ? 'Salvando…' : isEdit ? 'Salvar alterações' : 'Criar ordem de serviço'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
