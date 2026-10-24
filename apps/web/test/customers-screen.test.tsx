import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Customer, ListCustomersResponse } from '@servico-certo/contracts';
import { ApiError } from '@/shared/lib/api-client';

const MARIA: Customer = {
  id: 'cus_AaFrLZYfcVevBwi2on-gZQ',
  name: 'Maria Silva',
  address: 'Rua das Flores, 123',
  document: '52998224725',
  documentType: 'CPF',
  phoneNumber: '11999998888',
};

const EMPRESA: Customer = {
  id: 'cus_BbFrLZYfcVevBwi2on-gZQ',
  name: 'Empresa Exemplo LTDA',
  address: 'Av. Paulista, 1000',
  document: '11222333000181',
  documentType: 'CNPJ',
  phoneNumber: '1133334444',
};

const JOAO: Customer = {
  id: 'cus_CcFrLZYfcVevBwi2on-gZQ',
  name: 'João Souza',
  address: null,
  document: null,
  documentType: null,
  phoneNumber: null,
};

const mocks = vi.hoisted(() => ({
  listCustomers: vi.fn(),
  createCustomer: vi.fn(),
  updateCustomer: vi.fn(),
  deleteCustomer: vi.fn(),
  request: vi.fn(),
}));

vi.mock('@/modules/customers/lib/customers-api', () => ({
  listCustomers: mocks.listCustomers,
  createCustomer: mocks.createCustomer,
  updateCustomer: mocks.updateCustomer,
  deleteCustomer: mocks.deleteCustomer,
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

import { CustomersScreen } from '@/modules/customers/components/customers-screen';

function pageOf(
  customers: Customer[],
  offset = 0,
  total = customers.length,
): ListCustomersResponse {
  return {
    data: customers,
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
  fireEvent.click(screen.getByRole('button', { name: 'Novo cliente' }));

  return screen.findByRole('dialog', { name: 'Novo cliente' });
}

function fillCreateDialog(
  dialog: HTMLElement,
  values: {
    name?: string;
    documentType?: 'CPF' | 'CNPJ' | '';
    document?: string;
    phoneNumber?: string;
    address?: string;
  } = {},
) {
  fireEvent.change(within(dialog).getByLabelText('Nome'), {
    target: { value: values.name ?? ' Ana ' },
  });

  if (values.documentType) {
    fireEvent.change(within(dialog).getByLabelText('Tipo de documento'), {
      target: { value: values.documentType },
    });
  }

  if (values.document) {
    fireEvent.change(within(dialog).getByLabelText('Documento'), {
      target: { value: values.document },
    });
  }

  if (values.phoneNumber) {
    fireEvent.change(within(dialog).getByLabelText('Telefone'), {
      target: { value: values.phoneNumber },
    });
  }

  if (values.address) {
    fireEvent.change(within(dialog).getByLabelText('Endereço'), {
      target: { value: values.address },
    });
  }
}

describe('CustomersScreen', () => {
  beforeEach(() => {
    mocks.listCustomers.mockReset();
    mocks.createCustomer.mockReset();
    mocks.updateCustomer.mockReset();
    mocks.deleteCustomer.mockReset();
    mocks.listCustomers.mockResolvedValue(pageOf([MARIA, EMPRESA, JOAO]));
  });

  it('lista os clientes com documento, telefone e endereço', async () => {
    render(<CustomersScreen />);

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(screen.getByText('Empresa Exemplo LTDA')).toBeInTheDocument();
    expect(screen.getByText('João Souza')).toBeInTheDocument();
    expect(screen.getByText('529.982.247-25')).toBeInTheDocument();
    expect(screen.getByText('11.222.333/0001-81')).toBeInTheDocument();
    expect(screen.getByText('(11) 99999-8888')).toBeInTheDocument();
    expect(screen.getByText('(11) 3333-4444')).toBeInTheDocument();
    expect(screen.getByText('Rua das Flores, 123')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(2);
    expect(mocks.listCustomers).toHaveBeenCalledWith(mocks.request, { limit: 20, offset: 0 });
  });

  it('aplica filtros de nome e documento', async () => {
    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: ' Maria ' } });
    fireEvent.change(screen.getByLabelText('Documento'), {
      target: { value: ' 529.982 ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));

    await waitFor(() => {
      expect(mocks.listCustomers).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
        name: 'Maria',
        document: '529982',
      });
    });
  });

  it('limpa os filtros e volta para a primeira página', async () => {
    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));

    await waitFor(() => {
      expect(mocks.listCustomers).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
        name: 'Maria',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    await waitFor(() => {
      expect(mocks.listCustomers).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
      });
    });
    expect(screen.getByLabelText('Nome')).toHaveValue('');
    expect(screen.getByLabelText('Documento')).toHaveValue('');
  });

  it('navega entre as páginas', async () => {
    mocks.listCustomers.mockImplementation(
      async (_request: unknown, query: { limit: number; offset: number }) =>
        pageOf([MARIA], query.offset, 45),
    );

    render(<CustomersScreen />);

    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => {
      expect(mocks.listCustomers).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 20,
      });
    });
    expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));

    await waitFor(() => {
      expect(mocks.listCustomers).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
      });
    });
  });

  it('cria um cliente somente com nome', async () => {
    mocks.createCustomer.mockResolvedValueOnce({
      id: 'cus_DdFrLZYfcVevBwi2on-gZQ',
      name: 'Ana',
      address: null,
      document: null,
      documentType: null,
      phoneNumber: null,
    });

    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    const dialog = await openCreateDialog();

    fillCreateDialog(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar cliente' }));

    await waitFor(() => {
      expect(mocks.createCustomer).toHaveBeenCalledWith(mocks.request, { name: 'Ana' });
    });

    expect(await screen.findByText('Cliente criado com sucesso.')).toBeInTheDocument();
  });

  it('cria um cliente com documento, telefone e endereço normalizados', async () => {
    mocks.createCustomer.mockResolvedValueOnce(MARIA);

    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    const dialog = await openCreateDialog();

    fillCreateDialog(dialog, {
      name: ' Maria Silva ',
      documentType: 'CPF',
      document: '529.982.247-25',
      phoneNumber: '(11) 99999-8888',
      address: ' Rua das Flores, 123 ',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar cliente' }));

    await waitFor(() => {
      expect(mocks.createCustomer).toHaveBeenCalledWith(mocks.request, {
        name: 'Maria Silva',
        address: 'Rua das Flores, 123',
        document: '52998224725',
        documentType: 'CPF',
        phoneNumber: '11999998888',
      });
    });
  });

  it('valida nome e documento obrigatório quando há tipo selecionado', async () => {
    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    const dialog = await openCreateDialog();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar cliente' }));
    expect(await screen.findByText('Informe o nome do cliente')).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Nome'), { target: { value: 'Ana' } });
    fireEvent.change(within(dialog).getByLabelText('Tipo de documento'), {
      target: { value: 'CPF' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar cliente' }));

    expect(await screen.findByText('Informe o número do documento')).toBeInTheDocument();
    expect(mocks.createCustomer).not.toHaveBeenCalled();
  });

  it('mostra o documento apenas quando há tipo selecionado e troca o placeholder', async () => {
    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    const dialog = await openCreateDialog();

    expect(within(dialog).queryByLabelText('Documento')).not.toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Tipo de documento'), {
      target: { value: 'CPF' },
    });

    expect(within(dialog).getByLabelText('Documento')).toHaveAttribute(
      'placeholder',
      '000.000.000-00',
    );

    fireEvent.change(within(dialog).getByLabelText('Tipo de documento'), {
      target: { value: 'CNPJ' },
    });
    expect(within(dialog).getByLabelText('Documento')).toHaveAttribute(
      'placeholder',
      '00.000.000/0000-00',
    );

    fireEvent.change(within(dialog).getByLabelText('Tipo de documento'), {
      target: { value: '' },
    });
    expect(within(dialog).queryByLabelText('Documento')).not.toBeInTheDocument();
  });

  it('formata CPF e CNPJ ao sair do campo na criação', async () => {
    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    const dialog = await openCreateDialog();

    fireEvent.change(within(dialog).getByLabelText('Tipo de documento'), {
      target: { value: 'CPF' },
    });

    const cpfInput = within(dialog).getByLabelText('Documento');
    fireEvent.change(cpfInput, { target: { value: '52998224725' } });
    fireEvent.blur(cpfInput);

    expect(cpfInput).toHaveValue('529.982.247-25');

    fireEvent.change(within(dialog).getByLabelText('Tipo de documento'), {
      target: { value: 'CNPJ' },
    });

    const cnpjInput = within(dialog).getByLabelText('Documento');
    fireEvent.change(cnpjInput, { target: { value: '11222333000181' } });
    fireEvent.blur(cnpjInput);

    expect(cnpjInput).toHaveValue('11.222.333/0001-81');
  });

  it('formata o documento ao sair do campo na edição', async () => {
    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    fireEvent.click(getRow('Maria Silva').getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar cliente' });
    const documentInput = within(dialog).getByLabelText('Documento');

    expect(documentInput).toHaveValue('529.982.247-25');

    fireEvent.change(documentInput, { target: { value: '52998224725' } });
    fireEvent.blur(documentInput);

    expect(documentInput).toHaveValue('529.982.247-25');
  });

  it('valida o tamanho do CPF', async () => {
    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    const dialog = await openCreateDialog();

    fillCreateDialog(dialog, {
      name: 'Ana',
      documentType: 'CPF',
      document: '123',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar cliente' }));

    expect(await screen.findByText('CPF deve conter 11 dígitos')).toBeInTheDocument();
    expect(mocks.createCustomer).not.toHaveBeenCalled();
  });

  it('mostra documento já utilizado', async () => {
    mocks.createCustomer.mockRejectedValueOnce(
      new ApiError(409, 'DOCUMENT_TAKEN', 'Este documento já está em uso neste tenant'),
    );

    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    const dialog = await openCreateDialog();

    fillCreateDialog(dialog, {
      name: 'Ana',
      documentType: 'CPF',
      document: '529.982.247-25',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar cliente' }));

    expect(
      await screen.findByText('Este documento já está em uso neste tenant.'),
    ).toBeInTheDocument();
  });

  it('mostra CPF inválido retornado pela API', async () => {
    mocks.createCustomer.mockRejectedValueOnce(
      new ApiError(400, 'INVALID_DOCUMENT', 'CPF inválido'),
    );

    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    const dialog = await openCreateDialog();

    fillCreateDialog(dialog, {
      name: 'Ana',
      documentType: 'CPF',
      document: '529.982.247-24',
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar cliente' }));

    expect(await screen.findByText('CPF inválido')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Novo cliente' })).toBeInTheDocument();
  });

  it('edita apenas os campos alterados', async () => {
    const updated = {
      ...MARIA,
      name: 'Maria Souza',
      address: 'Rua Nova, 456',
      phoneNumber: '11988887777',
    };
    mocks.updateCustomer.mockResolvedValueOnce(updated);

    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    fireEvent.click(getRow('Maria Silva').getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar cliente' });

    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Maria Silva');
    expect(within(dialog).getByLabelText('Tipo de documento')).toHaveValue('CPF');
    expect(within(dialog).getByLabelText('Documento')).toHaveValue('529.982.247-25');
    expect(within(dialog).getByLabelText('Telefone')).toHaveValue('(11) 99999-8888');

    fireEvent.change(within(dialog).getByLabelText('Nome'), {
      target: { value: 'Maria Souza' },
    });
    fireEvent.change(within(dialog).getByLabelText('Endereço'), {
      target: { value: 'Rua Nova, 456' },
    });
    fireEvent.change(within(dialog).getByLabelText('Telefone'), {
      target: { value: '(11) 98888-7777' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(mocks.updateCustomer).toHaveBeenCalledWith(mocks.request, MARIA.id, {
        name: 'Maria Souza',
        address: 'Rua Nova, 456',
        phoneNumber: '11988887777',
      });
    });

    expect(await screen.findByText('Cliente atualizado com sucesso.')).toBeInTheDocument();
  });

  it('limpa documento, telefone e endereço', async () => {
    const updated = {
      ...MARIA,
      address: null,
      document: null,
      documentType: null,
      phoneNumber: null,
    };
    mocks.updateCustomer.mockResolvedValueOnce(updated);

    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    fireEvent.click(getRow('Maria Silva').getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar cliente' });

    fireEvent.change(within(dialog).getByLabelText('Tipo de documento'), {
      target: { value: '' },
    });
    fireEvent.change(within(dialog).getByLabelText('Telefone'), { target: { value: '' } });
    fireEvent.change(within(dialog).getByLabelText('Endereço'), { target: { value: '' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(mocks.updateCustomer).toHaveBeenCalledWith(mocks.request, MARIA.id, {
        address: null,
        phoneNumber: null,
        document: null,
        documentType: null,
      });
    });
  });

  it('informa quando não há alterações para salvar', async () => {
    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    fireEvent.click(getRow('Maria Silva').getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar cliente' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Nenhuma alteração para salvar.')).toBeInTheDocument();
    expect(mocks.updateCustomer).not.toHaveBeenCalled();
  });

  it('exclui um cliente com confirmação', async () => {
    mocks.deleteCustomer.mockResolvedValueOnce(undefined);

    render(<CustomersScreen />);
    await screen.findByText('Maria Silva');

    fireEvent.click(getRow('Maria Silva').getByRole('button', { name: 'Excluir' }));

    const dialog = await screen.findByRole('dialog', { name: 'Excluir cliente?' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Excluir' }));

    await waitFor(() => {
      expect(mocks.deleteCustomer).toHaveBeenCalledWith(mocks.request, MARIA.id);
    });

    expect(await screen.findByText('Cliente Maria Silva excluído.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra erro de listagem e permite tentar novamente', async () => {
    mocks.listCustomers
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Falha de rede'))
      .mockResolvedValueOnce(pageOf([MARIA, EMPRESA, JOAO]));

    render(<CustomersScreen />);

    expect(
      await screen.findByText(
        'Não foi possível conectar à API. Verifique sua conexão e tente novamente.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Maria Silva')).toBeInTheDocument();
    expect(mocks.listCustomers).toHaveBeenCalledTimes(2);
  });
});
