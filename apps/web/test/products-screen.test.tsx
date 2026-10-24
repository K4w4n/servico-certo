import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ListProductsResponse, Product } from '@servico-certo/contracts';
import { ApiError } from '@/shared/lib/api-client';

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

const CONDICIONADOR: Product = {
  id: 'prd_CcFrLZYfcVevBwi2on-gZQ',
  name: 'Condicionador',
  description: 'Condicionador 200 ml',
  priceCents: 12990,
  createdAt: '2026-10-24T00:00:00.000Z',
  updatedAt: '2026-10-24T00:00:00.000Z',
};

const mocks = vi.hoisted(() => ({
  listProducts: vi.fn(),
  createProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  request: vi.fn(),
}));

vi.mock('@/modules/products/lib/products-api', () => ({
  listProducts: mocks.listProducts,
  createProduct: mocks.createProduct,
  updateProduct: mocks.updateProduct,
  deleteProduct: mocks.deleteProduct,
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

import { ProductsScreen } from '@/modules/products/components/products-screen';

function pageOf(products: Product[], offset = 0, total = products.length): ListProductsResponse {
  return {
    data: products,
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
  fireEvent.click(screen.getByRole('button', { name: 'Novo produto' }));

  return screen.findByRole('dialog', { name: 'Novo produto' });
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
    target: { value: values.name ?? ' Condicionador ' },
  });
  fireEvent.change(within(dialog).getByLabelText('Descrição'), {
    target: { value: values.description ?? ' Condicionador 200 ml ' },
  });
  fireEvent.change(within(dialog).getByLabelText('Preço (R$)'), {
    target: { value: values.price ?? '45,90' },
  });
}

describe('ProductsScreen', () => {
  beforeEach(() => {
    mocks.listProducts.mockReset();
    mocks.createProduct.mockReset();
    mocks.updateProduct.mockReset();
    mocks.deleteProduct.mockReset();
    mocks.listProducts.mockResolvedValue(pageOf([TINTA, SHAMPOO, CONDICIONADOR]));
  });

  it('lista os produtos com descrição e preço formatado', async () => {
    render(<ProductsScreen />);

    expect(await screen.findByText('Tinta de Cabelo')).toBeInTheDocument();
    expect(screen.getByText('Tinta profissional castanho 60 ml')).toBeInTheDocument();
    expect(screen.getByText('Shampoo')).toBeInTheDocument();
    expect(screen.getByText('Condicionador')).toBeInTheDocument();
    expect(getRow('Tinta de Cabelo').getByText(/45,90/)).toBeInTheDocument();
    expect(getRow('Shampoo').getByText(/25,90/)).toBeInTheDocument();
    expect(getRow('Condicionador').getByText(/129,90/)).toBeInTheDocument();
    expect(mocks.listProducts).toHaveBeenCalledWith(mocks.request, { limit: 20, offset: 0 });
  });

  it('aplica filtro por nome', async () => {
    render(<ProductsScreen />);
    await screen.findByText('Tinta de Cabelo');

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: ' Tinta ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));

    await waitFor(() => {
      expect(mocks.listProducts).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
        name: 'Tinta',
      });
    });
  });

  it('limpa o filtro e volta para a primeira página', async () => {
    render(<ProductsScreen />);
    await screen.findByText('Tinta de Cabelo');

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Tinta' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));

    await waitFor(() => {
      expect(mocks.listProducts).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
        name: 'Tinta',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    await waitFor(() => {
      expect(mocks.listProducts).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
      });
    });
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  it('navega entre as páginas', async () => {
    mocks.listProducts.mockImplementation(
      async (_request: unknown, query: { limit: number; offset: number }) =>
        pageOf([TINTA], query.offset, 45),
    );

    render(<ProductsScreen />);

    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => {
      expect(mocks.listProducts).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 20,
      });
    });
    expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));

    await waitFor(() => {
      expect(mocks.listProducts).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
      });
    });
  });

  it('cria um produto com os dados normalizados e preço em centavos', async () => {
    mocks.createProduct.mockResolvedValueOnce(CONDICIONADOR);

    render(<ProductsScreen />);
    await screen.findByText('Tinta de Cabelo');

    const dialog = await openCreateDialog();

    fillCreateDialog(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar produto' }));

    await waitFor(() => {
      expect(mocks.createProduct).toHaveBeenCalledWith(mocks.request, {
        name: 'Condicionador',
        description: 'Condicionador 200 ml',
        priceCents: 4590,
      });
    });

    expect(await screen.findByText('Produto criado com sucesso.')).toBeInTheDocument();
  });

  it('cria um produto sem descrição', async () => {
    mocks.createProduct.mockResolvedValueOnce({
      ...TINTA,
      id: 'prd_DdFrLZYfcVevBwi2on-gZQ',
      name: 'Produto sem descrição',
      description: '',
    });

    render(<ProductsScreen />);
    await screen.findByText('Tinta de Cabelo');

    const dialog = await openCreateDialog();

    fillCreateDialog(dialog, {
      name: 'Produto sem descrição',
      description: '',
      price: '10,00',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar produto' }));

    await waitFor(() => {
      expect(mocks.createProduct).toHaveBeenCalledWith(mocks.request, {
        name: 'Produto sem descrição',
        description: '',
        priceCents: 1000,
      });
    });

    expect(await screen.findByText('Produto criado com sucesso.')).toBeInTheDocument();
  });

  it('mascara o preço ao sair do campo', async () => {
    render(<ProductsScreen />);
    await screen.findByText('Tinta de Cabelo');

    const dialog = await openCreateDialog();
    const priceInput = within(dialog).getByLabelText('Preço (R$)');

    fireEvent.change(priceInput, { target: { value: '45,9' } });
    fireEvent.blur(priceInput);
    expect(priceInput).toHaveValue('45,90');

    fireEvent.change(priceInput, { target: { value: '1.234,5' } });
    fireEvent.blur(priceInput);
    expect(priceInput).toHaveValue('1.234,50');
  });

  it('valida nome e preço', async () => {
    render(<ProductsScreen />);
    await screen.findByText('Tinta de Cabelo');

    const dialog = await openCreateDialog();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar produto' }));

    expect(await screen.findByText('Informe o nome do produto')).toBeInTheDocument();
    expect(screen.getByText('Informe um preço válido')).toBeInTheDocument();
    expect(mocks.createProduct).not.toHaveBeenCalled();
  });

  it('edita apenas o preço alterado', async () => {
    mocks.updateProduct.mockResolvedValueOnce({ ...TINTA, priceCents: 5990 });

    render(<ProductsScreen />);
    await screen.findByText('Tinta de Cabelo');

    fireEvent.click(getRow('Tinta de Cabelo').getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar produto' });

    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Tinta de Cabelo');
    expect(within(dialog).getByLabelText('Preço (R$)')).toHaveValue('45,90');

    fireEvent.change(within(dialog).getByLabelText('Preço (R$)'), {
      target: { value: '59,90' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(mocks.updateProduct).toHaveBeenCalledWith(mocks.request, TINTA.id, {
        priceCents: 5990,
      });
    });

    expect(await screen.findByText('Produto atualizado com sucesso.')).toBeInTheDocument();
  });

  it('informa quando não há alterações para salvar', async () => {
    render(<ProductsScreen />);
    await screen.findByText('Tinta de Cabelo');

    fireEvent.click(getRow('Tinta de Cabelo').getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar produto' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Nenhuma alteração para salvar.')).toBeInTheDocument();
    expect(mocks.updateProduct).not.toHaveBeenCalled();
  });

  it('exclui um produto com confirmação', async () => {
    mocks.deleteProduct.mockResolvedValueOnce(undefined);

    render(<ProductsScreen />);
    await screen.findByText('Tinta de Cabelo');

    fireEvent.click(getRow('Tinta de Cabelo').getByRole('button', { name: 'Excluir' }));

    const dialog = await screen.findByRole('dialog', { name: 'Excluir produto?' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(mocks.deleteProduct).toHaveBeenCalledWith(mocks.request, TINTA.id);
    });

    expect(await screen.findByText('Produto Tinta de Cabelo excluído.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra erro de listagem e permite tentar novamente', async () => {
    mocks.listProducts
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Falha de rede'))
      .mockResolvedValueOnce(pageOf([TINTA, SHAMPOO, CONDICIONADOR]));

    render(<ProductsScreen />);

    expect(
      await screen.findByText(
        'Não foi possível conectar à API. Verifique sua conexão e tente novamente.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Tinta de Cabelo')).toBeInTheDocument();
    expect(mocks.listProducts).toHaveBeenCalledTimes(2);
  });
});
