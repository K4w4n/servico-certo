import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/lib/api-client';

const mocks = vi.hoisted(() => ({
  login: vi.fn(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
}));

vi.mock('@/modules/identity/providers/auth-provider', () => ({
  useAuth: () => ({
    status: 'unauthenticated',
    account: null,
    tenant: null,
    login: mocks.login,
    logout: vi.fn(),
    request: vi.fn(),
  }),
}));

import { LoginForm } from '@/modules/identity/components/login-form';

function submitForm() {
  const form = screen.getByRole('button', { name: 'Entrar' }).closest('form');

  expect(form).not.toBeNull();
  fireEvent.submit(form as HTMLFormElement);
}

function fillValidCredentials() {
  fireEvent.change(screen.getByLabelText('Domínio'), {
    target: { value: ' Oficina-Do-Joao ' },
  });
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: ' Joao@Exemplo.com ' },
  });
  fireEvent.change(screen.getByLabelText('Senha'), {
    target: { value: 'senha-secreta' },
  });
}

describe('LoginForm', () => {
  beforeEach(() => {
    mocks.login.mockReset();
    mocks.replace.mockReset();
  });

  it('renderiza domínio, e-mail e senha', () => {
    render(<LoginForm />);

    expect(screen.getByLabelText('Domínio')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeInTheDocument();
  });

  it('valida os campos obrigatórios antes de chamar a API', async () => {
    render(<LoginForm />);

    submitForm();

    expect(await screen.findByText('O domínio deve ter ao menos 3 caracteres')).toBeInTheDocument();
    expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
    expect(screen.getByText('Informe a senha')).toBeInTheDocument();
    expect(mocks.login).not.toHaveBeenCalled();
  });

  it('envia os dados normalizados e redireciona para a home', async () => {
    mocks.login.mockResolvedValueOnce(undefined);
    render(<LoginForm />);

    fillValidCredentials();
    submitForm();

    await waitFor(() => {
      expect(mocks.login).toHaveBeenCalledWith({
        tenantDomain: 'oficina-do-joao',
        email: 'joao@exemplo.com',
        password: 'senha-secreta',
      });
    });
    expect(mocks.replace).toHaveBeenCalledWith('/');
  });

  it('mostra mensagem amigável para credenciais inválidas', async () => {
    mocks.login.mockRejectedValueOnce(
      new ApiError(401, 'INVALID_CREDENTIALS', 'Credenciais inválidas'),
    );
    render(<LoginForm />);

    fillValidCredentials();
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Domínio, e-mail ou senha inválidos.',
    );
  });

  it('mostra mensagem de erro quando a API está indisponível', async () => {
    mocks.login.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Falha de rede'));
    render(<LoginForm />);

    fillValidCredentials();
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar à API. Verifique sua conexão e tente novamente.',
    );
  });
});
