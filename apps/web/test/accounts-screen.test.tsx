import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Account, ListAccountsResponse } from '@servico-certo/contracts';
import { ApiError } from '@/shared/lib/api-client';

const CURRENT: Account = {
  id: 'acc_AAAAAAAAAAAAAAAAAAAAAA',
  name: 'João',
  email: 'joao@exemplo.com',
  status: 'ACTIVE',
};

const MARIA: Account = {
  id: 'acc_AaFrLZYfcVevBwi2on-gZQ',
  name: 'Maria Souza',
  email: 'maria@exemplo.com',
  status: 'ACTIVE',
};

const PEDRO: Account = {
  id: 'acc_BbFrLZYfcVevBwi2on-gZQ',
  name: 'Pedro',
  email: 'pedro@exemplo.com',
  status: 'BLOCKED',
};

const mocks = vi.hoisted(() => ({
  listAccounts: vi.fn(),
  createAccount: vi.fn(),
  updateAccount: vi.fn(),
  updateAccountStatus: vi.fn(),
  requestPasswordReset: vi.fn(),
  request: vi.fn(),
  syncAccount: vi.fn(),
}));

vi.mock('@/modules/identity/lib/accounts-api', () => ({
  listAccounts: mocks.listAccounts,
  createAccount: mocks.createAccount,
  updateAccount: mocks.updateAccount,
  updateAccountStatus: mocks.updateAccountStatus,
}));

vi.mock('@/modules/identity/lib/auth-api', () => ({
  requestPasswordReset: mocks.requestPasswordReset,
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
    updateAccount: mocks.syncAccount,
    request: mocks.request,
  }),
}));

import { AccountsScreen } from '@/modules/identity/components/accounts-screen';

function pageOf(accounts: Account[], offset = 0, total = accounts.length): ListAccountsResponse {
  return {
    data: accounts,
    meta: { limit: 20, offset, total },
  };
}

function getRow(email: string) {
  const cell = screen.getByText(email);
  const row = cell.closest('tr');

  if (!row) {
    throw new Error(`Linha não encontrada para ${email}`);
  }

  return within(row);
}

function openCreateDialog() {
  fireEvent.click(screen.getByRole('button', { name: 'Novo usuário' }));

  return screen.findByRole('dialog', { name: 'Novo usuário' });
}

function fillCreateDialog(
  dialog: HTMLElement,
  values: {
    name?: string;
    email?: string;
    password?: string;
    confirmation?: string;
  } = {},
) {
  fireEvent.change(within(dialog).getByLabelText('Nome'), {
    target: { value: values.name ?? ' Ana ' },
  });
  fireEvent.change(within(dialog).getByLabelText('E-mail'), {
    target: { value: values.email ?? ' ANA@Exemplo.com ' },
  });
  fireEvent.change(within(dialog).getByLabelText('Senha inicial'), {
    target: { value: values.password ?? 'senha-super-segura' },
  });
  fireEvent.change(within(dialog).getByLabelText('Confirmar senha'), {
    target: { value: values.confirmation ?? values.password ?? 'senha-super-segura' },
  });
}

describe('AccountsScreen', () => {
  beforeEach(() => {
    mocks.listAccounts.mockReset();
    mocks.createAccount.mockReset();
    mocks.updateAccount.mockReset();
    mocks.updateAccountStatus.mockReset();
    mocks.requestPasswordReset.mockReset();
    mocks.syncAccount.mockReset();
    mocks.listAccounts.mockResolvedValue(pageOf([CURRENT, MARIA, PEDRO]));
  });

  it('lista os usuários do tenant com status e marca a conta atual', async () => {
    render(<AccountsScreen />);

    expect(await screen.findByText('Maria Souza')).toBeInTheDocument();
    expect(screen.getByText('Pedro')).toBeInTheDocument();
    expect(screen.getByText('joao@exemplo.com')).toBeInTheDocument();
    expect(screen.getByText('você')).toBeInTheDocument();
    expect(screen.getAllByText('Ativo')).toHaveLength(2);
    expect(screen.getByText('Bloqueado')).toBeInTheDocument();
    expect(mocks.listAccounts).toHaveBeenCalledWith(mocks.request, { limit: 20, offset: 0 });
  });

  it('aplica filtros de nome e e-mail', async () => {
    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: ' Maria ' } });
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: ' MARIA@ ' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));

    await waitFor(() => {
      expect(mocks.listAccounts).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
        name: 'Maria',
        email: 'maria@',
      });
    });
  });

  it('limpa os filtros e volta para a primeira página', async () => {
    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Maria' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pesquisar' }));

    await waitFor(() => {
      expect(mocks.listAccounts).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
        name: 'Maria',
      });
    });

    fireEvent.click(screen.getByRole('button', { name: 'Limpar' }));

    await waitFor(() => {
      expect(mocks.listAccounts).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
      });
    });
    expect(screen.getByLabelText('Nome')).toHaveValue('');
  });

  it('navega entre as páginas', async () => {
    mocks.listAccounts.mockImplementation(
      async (_request: unknown, query: { limit: number; offset: number }) =>
        pageOf([MARIA], query.offset, 45),
    );

    render(<AccountsScreen />);

    expect(await screen.findByText('Página 1 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Próxima' }));

    await waitFor(() => {
      expect(mocks.listAccounts).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 20,
      });
    });
    expect(await screen.findByText('Página 2 de 3')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }));

    await waitFor(() => {
      expect(mocks.listAccounts).toHaveBeenLastCalledWith(mocks.request, {
        limit: 20,
        offset: 0,
      });
    });
  });

  it('valida o formulário de criação antes de chamar a API', async () => {
    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    const dialog = await openCreateDialog();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar usuário' }));

    expect(await screen.findByText('Informe o nome')).toBeInTheDocument();
    expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
    expect(screen.getByText('A senha deve ter ao menos 10 caracteres')).toBeInTheDocument();
    expect(mocks.createAccount).not.toHaveBeenCalled();
  });

  it('cria um usuário com os dados normalizados', async () => {
    const ana: Account = {
      id: 'acc_CcFrLZYfcVevBwi2on-gZQ',
      name: 'Ana',
      email: 'ana@exemplo.com',
      status: 'ACTIVE',
    };

    mocks.createAccount.mockResolvedValueOnce(ana);

    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    const dialog = await openCreateDialog();

    fillCreateDialog(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar usuário' }));

    await waitFor(() => {
      expect(mocks.createAccount).toHaveBeenCalledWith(mocks.request, {
        name: 'Ana',
        email: 'ana@exemplo.com',
        password: 'senha-super-segura',
      });
    });

    expect(await screen.findByText('Usuário criado com sucesso.')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('mostra e-mail já utilizado no formulário de criação', async () => {
    mocks.createAccount.mockRejectedValueOnce(
      new ApiError(409, 'EMAIL_TAKEN', 'Este e-mail já está em uso neste tenant'),
    );

    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    const dialog = await openCreateDialog();

    fillCreateDialog(dialog);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Criar usuário' }));

    expect(await screen.findByText('Este e-mail já está em uso neste tenant.')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'Novo usuário' })).toBeInTheDocument();
  });

  it('edita somente os campos alterados', async () => {
    const updated = { ...MARIA, name: 'Maria Silva' };
    mocks.updateAccount.mockResolvedValueOnce(updated);

    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    fireEvent.click(getRow('maria@exemplo.com').getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar usuário' });

    expect(within(dialog).getByLabelText('Nome')).toHaveValue('Maria Souza');
    expect(within(dialog).getByLabelText('E-mail')).toHaveValue('maria@exemplo.com');

    fireEvent.change(within(dialog).getByLabelText('Nome'), {
      target: { value: 'Maria Silva' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(mocks.updateAccount).toHaveBeenCalledWith(mocks.request, MARIA.id, {
        name: 'Maria Silva',
      });
    });

    expect(await screen.findByText('Usuário atualizado com sucesso.')).toBeInTheDocument();
  });

  it('sincroniza a sessão ao editar a própria conta', async () => {
    const updated = { ...CURRENT, name: 'João Silva' };
    mocks.updateAccount.mockResolvedValueOnce(updated);

    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    fireEvent.click(getRow('joao@exemplo.com').getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar usuário' });

    fireEvent.change(within(dialog).getByLabelText('Nome'), {
      target: { value: 'João Silva' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    await waitFor(() => {
      expect(mocks.syncAccount).toHaveBeenCalledWith(updated);
    });
  });

  it('informa quando não há alterações para salvar', async () => {
    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    fireEvent.click(getRow('maria@exemplo.com').getByRole('button', { name: 'Editar' }));

    const dialog = await screen.findByRole('dialog', { name: 'Editar usuário' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Salvar alterações' }));

    expect(await screen.findByText('Nenhuma alteração para salvar.')).toBeInTheDocument();
    expect(mocks.updateAccount).not.toHaveBeenCalled();
  });

  it('valida a confirmação e altera a senha de outro usuário', async () => {
    mocks.updateAccount.mockResolvedValueOnce(MARIA);

    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    fireEvent.click(getRow('maria@exemplo.com').getByRole('button', { name: 'Alterar senha' }));

    const dialog = await screen.findByRole('dialog', { name: 'Alterar senha' });

    fireEvent.change(within(dialog).getByLabelText('Nova senha'), {
      target: { value: 'nova-senha-segura' },
    });
    fireEvent.change(within(dialog).getByLabelText('Confirmar nova senha'), {
      target: { value: 'outra-senha' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Alterar senha' }));

    expect(await screen.findByText('As senhas não conferem')).toBeInTheDocument();
    expect(mocks.updateAccount).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText('Confirmar nova senha'), {
      target: { value: 'nova-senha-segura' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Alterar senha' }));

    await waitFor(() => {
      expect(mocks.updateAccount).toHaveBeenCalledWith(mocks.request, MARIA.id, {
        password: 'nova-senha-segura',
      });
    });

    expect(await screen.findByText(/Senha de Maria Souza alterada/)).toBeInTheDocument();
  });

  it('avisa que a sessão continua ativa ao alterar a própria senha', async () => {
    mocks.updateAccount.mockResolvedValueOnce(CURRENT);

    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    fireEvent.click(getRow('joao@exemplo.com').getByRole('button', { name: 'Alterar senha' }));

    const dialog = await screen.findByRole('dialog', { name: 'Alterar senha' });

    expect(
      within(dialog).getByText(/Sua sessão atual continuará ativa por alguns minutos/),
    ).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText('Nova senha'), {
      target: { value: 'nova-senha-segura' },
    });
    fireEvent.change(within(dialog).getByLabelText('Confirmar nova senha'), {
      target: { value: 'nova-senha-segura' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Alterar senha' }));

    expect(
      await screen.findByText(
        /Senha alterada\. Sua sessão atual continuará ativa por alguns minutos/,
      ),
    ).toBeInTheDocument();
  });

  it('envia o link de reset de senha para a conta', async () => {
    mocks.requestPasswordReset.mockResolvedValueOnce(undefined);

    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    fireEvent.click(getRow('maria@exemplo.com').getByRole('button', { name: 'Enviar reset' }));

    const dialog = await screen.findByRole('dialog', { name: 'Enviar reset de senha?' });

    expect(within(dialog).getByText(/maria@exemplo.com/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar link' }));

    await waitFor(() => {
      expect(mocks.requestPasswordReset).toHaveBeenCalledWith({
        tenantDomain: 'oficina-do-joao',
        email: 'maria@exemplo.com',
      });
    });

    expect(
      await screen.findByText('Link de redefinição enviado para maria@exemplo.com.'),
    ).toBeInTheDocument();
  });

  it('não envia reset para uma conta bloqueada', async () => {
    render(<AccountsScreen />);
    await screen.findByText('Pedro');

    expect(
      getRow('pedro@exemplo.com').getByRole('button', { name: 'Enviar reset' }),
    ).toBeDisabled();
  });

  it('mostra erro de limite ao enviar reset', async () => {
    mocks.requestPasswordReset.mockRejectedValueOnce(
      new ApiError(429, 'HTTP_429', 'Muitas solicitações'),
    );

    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    fireEvent.click(getRow('maria@exemplo.com').getByRole('button', { name: 'Enviar reset' }));

    const dialog = await screen.findByRole('dialog', { name: 'Enviar reset de senha?' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Enviar link' }));

    expect(
      await screen.findByText('Muitas solicitações. Aguarde alguns instantes e tente novamente.'),
    ).toBeInTheDocument();
  });

  it('bloqueia um usuário com confirmação', async () => {
    mocks.updateAccountStatus.mockResolvedValueOnce({ ...MARIA, status: 'BLOCKED' });

    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    fireEvent.click(getRow('maria@exemplo.com').getByRole('button', { name: 'Bloquear' }));

    const dialog = await screen.findByRole('dialog', { name: 'Bloquear usuário?' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Bloquear' }));

    await waitFor(() => {
      expect(mocks.updateAccountStatus).toHaveBeenCalledWith(mocks.request, MARIA.id, {
        status: 'BLOCKED',
      });
    });

    expect(
      await screen.findByText('Usuário bloqueado. O acesso foi encerrado.'),
    ).toBeInTheDocument();
    expect(getRow('maria@exemplo.com').getByText('Bloqueado')).toBeInTheDocument();
  });

  it('desbloqueia um usuário com confirmação', async () => {
    mocks.updateAccountStatus.mockResolvedValueOnce({ ...PEDRO, status: 'ACTIVE' });

    render(<AccountsScreen />);
    await screen.findByText('Pedro');

    fireEvent.click(getRow('pedro@exemplo.com').getByRole('button', { name: 'Desbloquear' }));

    const dialog = await screen.findByRole('dialog', { name: 'Desbloquear usuário?' });

    fireEvent.click(within(dialog).getByRole('button', { name: 'Desbloquear' }));

    await waitFor(() => {
      expect(mocks.updateAccountStatus).toHaveBeenCalledWith(mocks.request, PEDRO.id, {
        status: 'ACTIVE',
      });
    });

    expect(
      await screen.findByText('Usuário desbloqueado. Já pode entrar novamente.'),
    ).toBeInTheDocument();
  });

  it('impede bloquear a própria conta', async () => {
    render(<AccountsScreen />);
    await screen.findByText('Maria Souza');

    expect(getRow('joao@exemplo.com').getByRole('button', { name: 'Bloquear' })).toBeDisabled();
  });

  it('mostra erro de listagem e permite tentar novamente', async () => {
    mocks.listAccounts
      .mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Falha de rede'))
      .mockResolvedValueOnce(pageOf([CURRENT, MARIA, PEDRO]));

    render(<AccountsScreen />);

    expect(
      await screen.findByText(
        'Não foi possível conectar à API. Verifique sua conexão e tente novamente.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('Maria Souza')).toBeInTheDocument();
    expect(mocks.listAccounts).toHaveBeenCalledTimes(2);
  });
});
