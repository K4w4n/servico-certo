import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type {
  Customer,
  ListServiceOrdersResponse,
  Product,
  Service,
  ServiceOrder,
} from '@servico-certo/contracts';
import { ApiError } from '@/shared/lib/api-client';

const ANA: Customer = {
  id: 'cus_AaFrLZYfcVevBwi2on-gZQ',
  name: 'Ana Souza',
  address: 'Rua das Flores, 10',
  document: '52998224725',
  documentType: 'CPF',
  phoneNumber: '11999998888',
};

const BRUNO: Customer = {
  id: 'cus_BbFrLZYfcVevBwi2on-gZQ',
  name: 'Bruno Lima',
  address: null,
  document: null,
  documentType: null,
  phoneNumber: null,
};

const TINTA: Product = {
  id: 'prd_AaFrLZYfcVevBwi2on-gZQ',
  name: 'Tinta de Cabelo',
  description: 'Tinta profissional castanho 60 ml',
  priceCents: 4590,
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

const SHAMPOO: Product = {
  id: 'prd_BbFrLZYfcVevBwi2on-gZQ',
  name: 'Shampoo',
  description: 'Shampoo hidratante 300 ml',
  priceCents: 2590,
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

const OLEO: Service = {
  id: 'srv_AaFrLZYfcVevBwi2on-gZQ',
  name: 'Troca de óleo',
  description: 'Troca de óleo e filtro',
  priceCents: 12000,
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

const ALINHAMENTO: Service = {
  id: 'srv_BbFrLZYfcVevBwi2on-gZQ',
  name: 'Alinhamento',
  description: 'Alinhamento e balanceamento',
  priceCents: 8000,
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

const CREATED_BY = {
  id: 'acc_AaFrLZYfcVevBwi2on-gZQ',
  name: 'João',
  email: 'joao@exemplo.com',
};

const ORDER_1: ServiceOrder = {
  id: 'ord_AaFrLZYfcVevBwi2on-gZQ',
  protocol: '100001',
  note: 'Troca de óleo e filtro',
  customer: ANA,
  createdBy: CREATED_BY,
  products: [
    {
      productId: TINTA.id,
      name: TINTA.name,
      unitPriceCents: 4590,
      quantity: 2,
      totalCents: 9180,
    },
  ],
  services: [
    {
      serviceId: OLEO.id,
      name: OLEO.name,
      priceCents: 12000,
    },
  ],
  totalCents: 21180,
  createdAt: '2026-10-24T10:30:00.000Z',
  updatedAt: '2026-10-24T10:30:00.000Z',
};

const ORDER_2: ServiceOrder = {
  id: 'ord_BbFrLZYfcVevBwi2on-gZQ',
  protocol: '100002',
  note: null,
  customer: BRUNO,
  createdBy: CREATED_BY,
  products: [
    {
      productId: SHAMPOO.id,
      name: SHAMPOO.name,
      unitPriceCents: 2590,
      quantity: 1,
      totalCents: 2590,
    },
  ],
  services: [
    {
      serviceId: ALINHAMENTO.id,
      name: ALINHAMENTO.name,
      priceCents: 8000,
    },
  ],
  totalCents: 10590,
  createdAt: '2026-10-24T11:00:00.000Z',
  updatedAt: '2026-10-24T11:00:00.000Z',
};

const ORDER_3: ServiceOrder = {
  id: 'ord_CcFrLZYfcVevBwi2on-gZQ',
  protocol: '100003',
  note: null,
  customer: ANA,
  createdBy: CREATED_BY,
  products: [],
  services: [
    {
      serviceId: OLEO.id,
      name: OLEO.name,
      priceCents: 12000,
    },
  ],
  totalCents: 12000,
  createdAt: '2026-10-24T12:00:00.000Z',
  updatedAt: '2026-10-24T12:00:00.000Z',
};

const mocks = vi.hoisted(() => ({
  listServiceOrders: vi.fn(),
  createServiceOrder: vi.fn(),
  updateServiceOrder: vi.fn(),
  deleteServiceOrder: vi.fn(),
  loadServiceOrderReferences: vi.fn(),
  downloadServiceOrderReceipt: vi.fn(),
  download: vi.fn(),
  request: vi.fn(),
}));

vi.mock('@/modules/service-orders/lib/service-orders-api', () => ({
  listServiceOrders: mocks.listServiceOrders,
  createServiceOrder: mocks.createServiceOrder,
  updateServiceOrder: mocks.updateServiceOrder,
  deleteServiceOrder: mocks.deleteServiceOrder,
}));

vi.mock('@/modules/service-orders/lib/service-order-receipt', () => ({
  downloadServiceOrderReceipt: mocks.downloadServiceOrderReceipt,
}));

vi.mock('@/modules/service-orders/lib/service-order-references', () => ({
  loadServiceOrderReferences: mocks.loadServiceOrderReferences,
}));

vi.mock('@/modules/identity/providers/auth-provider', () => ({
  useAuth: () => ({
    status: 'authenticated',
    account: {
      id: 'acc_AAAAAAAAAAAAAAAAAAAAAA',
      name: 'João',
      email: 'joao@exemplo.com',
      status: 'ACTIVE',
    },
    tenant: {
      id: 'ten_AAAAAAAAAAAAAAAAAAAAAA',
      name: 'Oficina do João',
      domain: 'oficina-do-joao',
    },
    login: vi.fn(),
    register: vi.fn(),
    logout: vi.fn(),
    updateAccount: vi.fn(),
    request: mocks.request,
    download: mocks.download,
  }),
}));

import { ServiceOrdersScreen } from '@/modules/service-orders/components/service-orders-screen';

function pageOf(
  orders: ServiceOrder[],
  offset = 0,
  total = orders.length,
): ListServiceOrdersResponse {
  return {
    data: orders,
    meta: { limit: 20, offset, total },
  };
}

function getRow(protocol: string) {
  const cell = screen.getByText(`#${protocol}`);
  const row = cell.closest('tr');

  if (!row) {
    throw new Error(`Linha não encontrada para o protocolo ${protocol}`);
  }

  return within(row);
}

async function waitForReferences() {
  await waitFor(() => {
    expect(screen.getByLabelText('Cliente')).not.toBeDisabled();
  });
}

function chooseOption(scope: HTMLElement, label: string, optionLabel: string, query = optionLabel) {
  const view = within(scope);
  const input = view.getByLabelText(label);

  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: query } });
  fireEvent.click(view.getByRole('option', { name: optionLabel }));
}

async function openCreateDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Nova ordem de serviço' }));

  return screen.findByRole('dialog', { name: 'Nova ordem de serviço' });
}

async function openEditDialog(protocol: string) {
  fireEvent.click(getRow(protocol).getByRole('button', { name: 'Editar' }));

  return screen.findByRole('dialog', { name: 'Editar ordem de serviço' });
}

describe('ServiceOrdersScreen', () => {
  beforeEach(() => {
    mocks.listServiceOrders.mockReset();
    mocks.createServiceOrder.mockReset();
    mocks.updateServiceOrder.mockReset();
    mocks.deleteServiceOrder.mockReset();
    mocks.loadServiceOrderReferences.mockReset();
    mocks.downloadServiceOrderReceipt.mockReset();
    mocks.download.mockReset();
    mocks.listServiceOrders.mockResolvedValue(pageOf([ORDER_1, ORDER_2, ORDER_3]));
    mocks.loadServiceOrderReferences.mockResolvedValue({
      customers: [ANA, BRUNO],
      products: [TINTA, SHAMPOO],
      services: [OLEO, ALINHAMENTO],
    });
  });

  it('lista as ordens com protocolo, cliente, itens e total', async () => {
    render(<ServiceOrdersScreen />);

    expect(await screen.findByText('#100001')).toBeInTheDocument();
    expect(screen.getByText('#100002')).toBeInTheDocument();
    expect(screen.getByText('#100003')).toBeInTheDocument();
    expect(getRow('100001').getByText('Ana Souza')).toBeInTheDocument();
    expect(getRow('100001').getByText('2× Tinta de Cabelo · Troca de óleo')).toBeInTheDocument();
    expect(getRow('100001').getByText(/211,80/)).toBeInTheDocument();
    expect(getRow('100002').getByText(/105,90/)).toBeInTheDocument();
    expect(mocks.listServiceOrders).toHaveBeenCalledWith(mocks.request, {
      limit: 20,
      offset: 0,
    });
  });

  it('pesquisa clientes no select antes de selecionar', async () => {
    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');
    await waitForReferences();

    const input = screen.getByLabelText('Cliente');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'bru' } });

    expect(screen.getByRole('option', { name: 'Bruno Lima' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Ana Souza' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('option', { name: 'Bruno Lima' }));

    expect(input).toHaveValue('Bruno Lima');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('abre os detalhes da ordem e baixa o comprovante em PDF', async () => {
    mocks.downloadServiceOrderReceipt.mockResolvedValue(undefined);

    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');

    fireEvent.click(getRow('100001').getByRole('button', { name: 'Abrir' }));

    const dialog = await screen.findByRole('dialog', { name: 'Ordem de serviço #100001' });

    expect(within(dialog).getByText('Ana Souza')).toBeInTheDocument();
    expect(within(dialog).getByText('João')).toBeInTheDocument();
    expect(within(dialog).getByText('joao@exemplo.com')).toBeInTheDocument();
    expect(within(dialog).getByText('Troca de óleo e filtro')).toBeInTheDocument();
    expect(within(dialog).getByText(/211,80/)).toBeInTheDocument();
    expect(within(dialog).getByText('2')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Baixar comprovante' }));
    fireEvent.click(within(dialog).getByRole('menuitem', { name: 'Arquivo PDF' }));

    await waitFor(() => {
      expect(mocks.downloadServiceOrderReceipt).toHaveBeenCalledWith(
        mocks.download,
        ORDER_1.id,
        'pdf',
      );
    });
  });

  it('baixa o comprovante em imagem quando escolhido', async () => {
    mocks.downloadServiceOrderReceipt.mockResolvedValue(undefined);

    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');

    fireEvent.click(getRow('100001').getByRole('button', { name: 'Abrir' }));

    const dialog = await screen.findByRole('dialog', { name: 'Ordem de serviço #100001' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Baixar comprovante' }));
    fireEvent.click(within(dialog).getByRole('menuitem', { name: 'Arquivo em Imagem' }));

    await waitFor(() => {
      expect(mocks.downloadServiceOrderReceipt).toHaveBeenCalledWith(
        mocks.download,
        ORDER_1.id,
        'image',
      );
    });
  });

  it('mostra erro quando não consegue gerar o comprovante', async () => {
    mocks.downloadServiceOrderReceipt.mockRejectedValue(new Error('falha'));

    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');

    fireEvent.click(getRow('100001').getByRole('button', { name: 'Abrir' }));

    const dialog = await screen.findByRole('dialog', { name: 'Ordem de serviço #100001' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Baixar comprovante' }));
    fireEvent.click(within(dialog).getByRole('menuitem', { name: 'Arquivo PDF' }));

    expect(
      await within(dialog).findByText('Não foi possível gerar o comprovante em PDF.'),
    ).toBeInTheDocument();
  });

  it('aplica todos os filtros', async () => {
    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');
    await waitForReferences();

    fireEvent.change(screen.getByLabelText('Protocolo'), { target: { value: '10a01' } });
    chooseOption(document.body, 'Cliente', 'Ana Souza', 'ana');
    chooseOption(document.body, 'Produto', 'Tinta de Cabelo', 'tinta');
    chooseOption(document.body, 'Serviço', 'Troca de óleo', 'oleo');
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));

    await waitFor(() => {
      expect(mocks.listServiceOrders).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
        protocol: '1001',
        customerId: ANA.id,
        productId: TINTA.id,
        serviceId: OLEO.id,
      });
    });
  });

  it('limpa os filtros e volta para a primeira página', async () => {
    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');
    await waitForReferences();

    fireEvent.change(screen.getByLabelText('Protocolo'), { target: { value: '100001' } });
    chooseOption(document.body, 'Cliente', 'Ana Souza');
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));

    await waitFor(() => {
      expect(mocks.listServiceOrders).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
        protocol: '100001',
        customerId: ANA.id,
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    await waitFor(() => {
      expect(mocks.listServiceOrders).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
      });
    });
    expect(screen.getByLabelText('Protocolo')).toHaveValue('');
    expect(screen.getByLabelText('Cliente')).toHaveValue('');
  });

  it('navega entre as páginas', async () => {
    mocks.listServiceOrders.mockImplementation(
      async (_request: unknown, query: { limit: number; offset: number }) =>
        pageOf([ORDER_1], query.offset, 45),
    );

    render(<ServiceOrdersScreen />);

    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => {
      expect(mocks.listServiceOrders).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 20,
      });
    });
    expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));

    await waitFor(() => {
      expect(mocks.listServiceOrders).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
      });
    });
  });

  it('cria uma ordem com cliente, produtos e serviços', async () => {
    mocks.createServiceOrder.mockResolvedValueOnce(ORDER_1);

    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');
    await waitForReferences();

    const dialog = await openCreateDialog();

    chooseOption(dialog, 'Cliente', 'Ana Souza');
    fireEvent.change(within(dialog).getByLabelText('Observação'), {
      target: { value: ' Troca de óleo e filtro ' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Adicionar produto' }));
    chooseOption(dialog, 'Produto 1', 'Tinta de Cabelo', 'tinta');
    fireEvent.change(within(dialog).getByLabelText('Quantidade do produto 1'), {
      target: { value: '2' },
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Adicionar serviço' }));
    chooseOption(dialog, 'Serviço 1', 'Troca de óleo', 'oleo');

    expect(within(dialog).getByLabelText('Preço unitário do produto 1')).toHaveValue('45,90');
    expect(within(dialog).getByLabelText('Preço do serviço 1')).toHaveValue('120,00');
    expect(within(dialog).getByText('R$ 211,80')).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar ordem de serviço' }));

    await waitFor(() => {
      expect(mocks.createServiceOrder).toHaveBeenCalledWith(mocks.request, {
        customerId: ANA.id,
        note: 'Troca de óleo e filtro',
        products: [
          {
            productId: TINTA.id,
            unitPriceCents: 4590,
            quantity: 2,
          },
        ],
        services: [
          {
            serviceId: OLEO.id,
            priceCents: 12000,
          },
        ],
      });
    });

    expect(await screen.findByText('Ordem de serviço criada com sucesso.')).toBeInTheDocument();
  });

  it('valida cliente e a presença de ao menos um item', async () => {
    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');
    await waitForReferences();

    const dialog = await openCreateDialog();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar ordem de serviço' }));

    expect(await within(dialog).findByText('Informe o cliente')).toBeInTheDocument();
    expect(
      within(dialog).getByText('Informe pelo menos um produto ou serviço.'),
    ).toBeInTheDocument();
    expect(mocks.createServiceOrder).not.toHaveBeenCalled();
  });

  it('valida os campos dos itens e rejeita produtos duplicados', async () => {
    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');
    await waitForReferences();

    const dialog = await openCreateDialog();

    chooseOption(dialog, 'Cliente', 'Ana Souza');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Adicionar produto' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'Adicionar produto' }));

    chooseOption(dialog, 'Produto 1', 'Tinta de Cabelo');
    chooseOption(dialog, 'Produto 2', 'Tinta de Cabelo');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar ordem de serviço' }));

    expect(await within(dialog).findByText('Produto já adicionado')).toBeInTheDocument();
    expect(mocks.createServiceOrder).not.toHaveBeenCalled();
  });

  it('edita apenas a observação alterada', async () => {
    mocks.updateServiceOrder.mockResolvedValueOnce({
      ...ORDER_1,
      note: 'Cliente autorizou troca do filtro',
    });

    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');
    await waitForReferences();

    const dialog = await openEditDialog('100001');

    expect(within(dialog).getByLabelText('Cliente')).toHaveValue('Ana Souza');
    expect(within(dialog).getByLabelText('Observação')).toHaveValue('Troca de óleo e filtro');

    fireEvent.change(within(dialog).getByLabelText('Observação'), {
      target: { value: 'Cliente autorizou troca do filtro' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(mocks.updateServiceOrder).toHaveBeenCalledWith(mocks.request, ORDER_1.id, {
        note: 'Cliente autorizou troca do filtro',
      });
    });

    expect(await screen.findByText('Ordem de serviço atualizada com sucesso.')).toBeInTheDocument();
  });

  it('envia a lista de produtos quando a quantidade muda', async () => {
    mocks.updateServiceOrder.mockResolvedValueOnce({
      ...ORDER_1,
      products: [{ ...ORDER_1.products[0]!, quantity: 3, totalCents: 13770 }],
      totalCents: 25770,
    });

    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');
    await waitForReferences();

    const dialog = await openEditDialog('100001');

    fireEvent.change(within(dialog).getByLabelText('Quantidade do produto 1'), {
      target: { value: '3' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(mocks.updateServiceOrder).toHaveBeenCalledWith(mocks.request, ORDER_1.id, {
        products: [
          {
            productId: TINTA.id,
            unitPriceCents: 4590,
            quantity: 3,
          },
        ],
      });
    });
  });

  it('informa quando não há alterações para salvar', async () => {
    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');
    await waitForReferences();

    const dialog = await openEditDialog('100001');

    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    expect(await within(dialog).findByText('Nenhuma alteração para salvar.')).toBeInTheDocument();
    expect(mocks.updateServiceOrder).not.toHaveBeenCalled();
  });

  it('exclui uma ordem com confirmação', async () => {
    mocks.deleteServiceOrder.mockResolvedValueOnce(undefined);

    render(<ServiceOrdersScreen />);
    await screen.findByText('#100001');
    await waitForReferences();

    fireEvent.click(getRow('100001').getByRole('button', { name: 'Excluir' }));

    const dialog = await screen.findByRole('dialog', {
      name: 'Excluir ordem de serviço?',
    });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(mocks.deleteServiceOrder).toHaveBeenCalledWith(mocks.request, ORDER_1.id);
    });

    expect(await screen.findByText('Ordem de serviço #100001 excluída.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra erro de listagem e permite tentar novamente', async () => {
    mocks.listServiceOrders
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Falha de rede'))
      .mockResolvedValueOnce(pageOf([ORDER_1, ORDER_2, ORDER_3]));

    render(<ServiceOrdersScreen />);

    expect(
      await screen.findByText(
        'Não foi possível conectar à API. Verifique sua conexão e tente novamente.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('#100001')).toBeInTheDocument();
    expect(mocks.listServiceOrders).toHaveBeenCalledTimes(2);
  });
});
