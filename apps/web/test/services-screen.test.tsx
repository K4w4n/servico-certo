import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListServicesResponse, Service } from '@servico-certo/contracts';
import { ApiError } from '@/shared/lib/api-client';

const OLEO: Service = {
  id: 'srv_AaFrLZYfcVevBwi2on-gZQ',
  name: 'Troca de óleo',
  description: 'Troca de óleo e filtro para carro de passeio',
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

const REVISAO: Service = {
  id: 'srv_CcFrLZYfcVevBwi2on-gZQ',
  name: 'Revisão completa',
  description: 'Revisão de 20 mil km',
  priceCents: 35000,
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

const mocks = vi.hoisted(() => ({
  listServices: vi.fn(),
  createService: vi.fn(),
  updateService: vi.fn(),
  deleteService: vi.fn(),
  request: vi.fn(),
}));

vi.mock('@/modules/services/lib/services-api', () => ({
  listServices: mocks.listServices,
  createService: mocks.createService,
  updateService: mocks.updateService,
  deleteService: mocks.deleteService,
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
  }),
}));

import { ServicesScreen } from '@/modules/services/components/services-screen';

function pageOf(services: Service[], offset = 0, total = services.length): ListServicesResponse {
  return {
    data: services,
    meta: { limit: 20, offset, total },
  };
}

function getRow(name: string) {
  const cell = screen.getByText(name);
  const row = cell.closest('tr');

  if (!row) {
    throw new Error(`Linha não encontrada para ${name}`);
  }

  return within(row);
}

function openCreateDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Novo serviço' }));

  return screen.findByRole('dialog', { name: 'Novo serviço' });
}

function fillCreateDialog(
  dialog: HTMLElement,
  values: {
    name?: string;
    description?: string;
    price?: string;
  } = {},
) {
  fireEvent.change(within(dialog).getByLabelText('Nome'), {
    target: { value: values.name ?? ' Revisão completa ' },
  });
  fireEvent.change(within(dialog).getByLabelText('Descrição'), {
    target: { value: values.description ?? ' Revisão de 20 mil km ' },
  });
  fireEvent.change(within(dialog).getByLabelText('Preço (R$)'), {
    target: { value: values.price ?? '120,00' },
  });
}

describe('ServicesScreen', () => {
  beforeEach(() => {
    mocks.listServices.mockReset();
    mocks.createService.mockReset();
    mocks.updateService.mockReset();
    mocks.deleteService.mockReset();
    mocks.listServices.mockResolvedValue(pageOf([OLEO, ALINHAMENTO, REVISAO]));
  });

  it('lista os serviços com descrição e preço formatado', async () => {
    render(<ServicesScreen />);

    expect(await screen.findByText('Troca de óleo')).toBeInTheDocument();
    expect(screen.getByText('Troca de óleo e filtro para carro de passeio')).toBeInTheDocument();
    expect(screen.getByText('Alinhamento')).toBeInTheDocument();
    expect(screen.getByText('Revisão completa')).toBeInTheDocument();
    expect(getRow('Troca de óleo').getByText(/120,00/)).toBeInTheDocument();
    expect(getRow('Alinhamento').getByText(/80,00/)).toBeInTheDocument();
    expect(getRow('Revisão completa').getByText(/350,00/)).toBeInTheDocument();
    expect(mocks.listServices).toHaveBeenCalledWith(mocks.request, { limit: 20, offset: 0 });
  });

  it('aplica filtro por nome', async () => {
    render(<ServicesScreen />);
    await screen.findByText('Troca de óleo');

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: ' Troca ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));

    await waitFor(() => {
      expect(mocks.listServices).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
        name: 'Troca',
      });
    });
  });

  it('limpa o filtro e volta para a primeira página', async () => {
    render(<ServicesScreen />);
    await screen.findByText('Troca de óleo');

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Troca' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));

    await waitFor(() => {
      expect(mocks.listServices).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
        name: 'Troca',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    await waitFor(() => {
      expect(mocks.listServices).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
      });
    });
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  it('navega entre as páginas', async () => {
    mocks.listServices.mockImplementation(
      async (_request: unknown, query: { limit: number; offset: number }) =>
        pageOf([OLEO], query.offset, 45),
    );

    render(<ServicesScreen />);

    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => {
      expect(mocks.listServices).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 20,
      });
    });
    expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));

    await waitFor(() => {
      expect(mocks.listServices).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
      });
    });
  });

  it('cria um serviço com os dados normalizados e preço em centavos', async () => {
    mocks.createService.mockResolvedValueOnce(REVISAO);

    render(<ServicesScreen />);
    await screen.findByText('Troca de óleo');

    const dialog = await openCreateDialog();

    fillCreateDialog(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar serviço' }));

    await waitFor(() => {
      expect(mocks.createService).toHaveBeenCalledWith(mocks.request, {
        name: 'Revisão completa',
        description: 'Revisão de 20 mil km',
        priceCents: 12000,
      });
    });

    expect(await screen.findByText('Serviço criado com sucesso.')).toBeInTheDocument();
  });

  it('cria um serviço sem descrição', async () => {
    mocks.createService.mockResolvedValueOnce({
      ...OLEO,
      id: 'srv_DdFrLZYfcVevBwi2on-gZQ',
      name: 'Serviço sem descrição',
      description: '',
      priceCents: 1000,
    });

    render(<ServicesScreen />);
    await screen.findByText('Troca de óleo');

    const dialog = await openCreateDialog();

    fillCreateDialog(dialog, {
      name: 'Serviço sem descrição',
      description: '',
      price: '10,00',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar serviço' }));

    await waitFor(() => {
      expect(mocks.createService).toHaveBeenCalledWith(mocks.request, {
        name: 'Serviço sem descrição',
        description: '',
        priceCents: 1000,
      });
    });

    expect(await screen.findByText('Serviço criado com sucesso.')).toBeInTheDocument();
  });

  it('mascara o preço ao sair do campo', async () => {
    render(<ServicesScreen />);
    await screen.findByText('Troca de óleo');

    const dialog = await openCreateDialog();
    const priceInput = within(dialog).getByLabelText('Preço (R$)');

    fireEvent.change(priceInput, { target: { value: '120,5' } });
    fireEvent.blur(priceInput);
    expect(priceInput).toHaveValue('120,50');

    fireEvent.change(priceInput, { target: { value: '1.234,5' } });
    fireEvent.blur(priceInput);
    expect(priceInput).toHaveValue('1.234,50');
  });

  it('valida nome e preço', async () => {
    render(<ServicesScreen />);
    await screen.findByText('Troca de óleo');

    const dialog = await openCreateDialog();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar serviço' }));

    expect(await screen.findByText('Informe o nome do serviço')).toBeInTheDocument();
    expect(screen.getByText('Informe um preço válido')).toBeInTheDocument();
    expect(mocks.createService).not.toHaveBeenCalled();
  });

  it('edita apenas o preço alterado', async () => {
    mocks.updateService.mockResolvedValueOnce({ ...OLEO, priceCents: 15000 });

    render(<ServicesScreen />);
    await screen.findByText('Troca de óleo');

    fireEvent.click(getRow('Troca de óleo').getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar serviço' });

    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Troca de óleo');
    expect(within(dialog).getByLabelText('Preço (R$)')).toHaveValue('120,00');

    fireEvent.change(within(dialog).getByLabelText('Preço (R$)'), {
      target: { value: '150,00' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(mocks.updateService).toHaveBeenCalledWith(mocks.request, OLEO.id, {
        priceCents: 15000,
      });
    });

    expect(await screen.findByText('Serviço atualizado com sucesso.')).toBeInTheDocument();
  });

  it('informa quando não há alterações para salvar', async () => {
    render(<ServicesScreen />);
    await screen.findByText('Troca de óleo');

    fireEvent.click(getRow('Troca de óleo').getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar serviço' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Nenhuma alteração para salvar.')).toBeInTheDocument();
    expect(mocks.updateService).not.toHaveBeenCalled();
  });

  it('exclui um serviço com confirmação', async () => {
    mocks.deleteService.mockResolvedValueOnce(undefined);

    render(<ServicesScreen />);
    await screen.findByText('Troca de óleo');

    fireEvent.click(getRow('Troca de óleo').getByRole('button', { name: 'Excluir' }));

    const dialog = await screen.findByRole('dialog', { name: 'Excluir serviço?' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(mocks.deleteService).toHaveBeenCalledWith(mocks.request, OLEO.id);
    });

    expect(await screen.findByText('Serviço Troca de óleo excluído.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra erro de listagem e permite tentar novamente', async () => {
    mocks.listServices
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Falha de rede'))
      .mockResolvedValueOnce(pageOf([OLEO, ALINHAMENTO, REVISAO]));

    render(<ServicesScreen />);

    expect(
      await screen.findByText(
        'Não foi possível conectar à API. Verifique sua conexão e tente novamente.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Troca de óleo')).toBeInTheDocument();
    expect(mocks.listServices).toHaveBeenCalledTimes(2);
  });
});
