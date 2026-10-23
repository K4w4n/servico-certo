import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/lib/api-client';

const mocks = vi.hoisted(() => ({
  register: vi.fn(),
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
    login: vi.fn(),
    register: mocks.register,
    logout: vi.fn(),
    request: vi.fn(),
  }),
}));

import { RegisterForm } from '@/modules/identity/components/register-form';

function submitForm() {
  const form = screen.getByRole('button', { name: 'Criar conta' }).closest('form');

  expect(form).not.toBeNull();
  fireEvent.submit(form as HTMLFormElement);
}

function fillValidData() {
  fireEvent.change(screen.getByLabelText('Nome do negócio'), {
    target: { value: ' Oficina do João ' },
  });
  fireEvent.change(screen.getByLabelText('Domínio'), {
    target: { value: ' Oficina-Do-Joao ' },
  });
  fireEvent.change(screen.getByLabelText('Seu nome'), {
    target: { value: ' João ' },
  });
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: ' Joao@Exemplo.com ' },
  });
  fireEvent.change(screen.getByLabelText('Senha'), {
    target: { value: 'senha-super-segura' },
  });
  fireEvent.change(screen.getByLabelText('Confirmar senha'), {
    target: { value: 'senha-super-segura' },
  });
}

describe('RegisterForm', () => {
  beforeEach(() => {
    mocks.register.mockReset();
    mocks.replace.mockReset();
  });

  it('renderiza os campos do negócio e da conta', () => {
    render(<RegisterForm />);

    expect(screen.getByLabelText('Nome do negócio')).toBeInTheDocument();
    expect(screen.getByLabelText('Domínio')).toBeInTheDocument();
    expect(screen.getByLabelText('Seu nome')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByLabelText('Senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar senha')).toBeInTheDocument();
  });

  it('valida os campos obrigatórios antes de chamar a API', async () => {
    render(<RegisterForm />);

    submitForm();

    expect(await screen.findByText('Informe o nome do negócio')).toBeInTheDocument();
    expect(screen.getByText('O domínio deve ter ao menos 3 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Informe seu nome')).toBeInTheDocument();
    expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
    expect(screen.getByText('A senha deve ter ao menos 10 caracteres')).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it('rejeita senhas que não conferem', async () => {
    render(<RegisterForm />);

    fillValidData();
    fireEvent.change(screen.getByLabelText('Confirmar senha'), {
      target: { value: 'outra-senha' },
    });
    submitForm();

    expect(await screen.findByText('As senhas não conferem')).toBeInTheDocument();
    expect(mocks.register).not.toHaveBeenCalled();
  });

  it('cria o tenant com os dados normalizados e redireciona para a home', async () => {
    mocks.register.mockResolvedValueOnce(undefined);
    render(<RegisterForm />);

    fillValidData();
    submitForm();

    await waitFor(() => {
      expect(mocks.register).toHaveBeenCalledWith({
        tenant: {
          name: 'Oficina do João',
          domain: 'oficina-do-joao',
        },
        account: {
          name: 'João',
          email: 'joao@exemplo.com',
          password: 'senha-super-segura',
        },
      });
    });
    expect(mocks.replace).toHaveBeenCalledWith('/');
  });

  it('mostra erro de domínio já utilizado', async () => {
    mocks.register.mockRejectedValueOnce(
      new ApiError(409, 'TENANT_DOMAIN_TAKEN', 'Este domínio já está em uso'),
    );
    render(<RegisterForm />);

    fillValidData();
    submitForm();

    expect(await screen.findByText('Este domínio já está em uso.')).toBeInTheDocument();
  });

  it('mostra mensagem quando a API está indisponível', async () => {
    mocks.register.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Falha de rede'));
    render(<RegisterForm />);

    fillValidData();
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar à API. Verifique sua conexão e tente novamente.',
    );
  });
});
