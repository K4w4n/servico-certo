import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/lib/api-client';

const mocks = vi.hoisted(() => ({
  requestPasswordReset: vi.fn(),
}));

vi.mock('@/modules/identity/lib/auth-api', () => ({
  requestPasswordReset: mocks.requestPasswordReset,
}));

import { ForgotPasswordForm } from '@/modules/identity/components/forgot-password-form';

function submitForm() {
  const form = screen.getByRole('button', { name: 'Enviar link de redefinição' }).closest('form');

  expect(form).not.toBeNull();
  fireEvent.submit(form as HTMLFormElement);
}

function fillValidData() {
  fireEvent.change(screen.getByLabelText('Domínio'), {
    target: { value: ' Oficina-Do-Joao ' },
  });
  fireEvent.change(screen.getByLabelText('E-mail'), {
    target: { value: ' Joao@Exemplo.com ' },
  });
}

describe('ForgotPasswordForm', () => {
  beforeEach(() => {
    mocks.requestPasswordReset.mockReset();
  });

  it('renderiza domínio e e-mail', () => {
    render(<ForgotPasswordForm />);

    expect(screen.getByLabelText('Domínio')).toBeInTheDocument();
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Enviar link de redefinição' })).toBeInTheDocument();
  });

  it('valida os campos obrigatórios antes de chamar a API', async () => {
    render(<ForgotPasswordForm />);

    submitForm();

    expect(await screen.findByText('O domínio deve ter ao menos 3 caracteres')).toBeInTheDocument();
    expect(screen.getByText('E-mail inválido')).toBeInTheDocument();
    expect(mocks.requestPasswordReset).not.toHaveBeenCalled();
  });

  it('envia os dados normalizados e mostra a mensagem genérica', async () => {
    mocks.requestPasswordReset.mockResolvedValueOnce(undefined);
    render(<ForgotPasswordForm />);

    fillValidData();
    submitForm();

    await waitFor(() => {
      expect(mocks.requestPasswordReset).toHaveBeenCalledWith({
        tenantDomain: 'oficina-do-joao',
        email: 'joao@exemplo.com',
      });
    });

    expect(
      await screen.findByRole('heading', { name: 'Verifique seu e-mail' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Se os dados estiverem corretos, enviaremos um link de redefinição/),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Voltar para o login' })).toHaveAttribute(
      'href',
      '/login',
    );
  });

  it('mostra mensagem amigável quando o limite de solicitações é atingido', async () => {
    mocks.requestPasswordReset.mockRejectedValueOnce(
      new ApiError(429, 'HTTP_429', 'ThrottlerException: Too Many Requests'),
    );
    render(<ForgotPasswordForm />);

    fillValidData();
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Muitas solicitações. Aguarde alguns minutos e tente novamente.',
    );
  });

  it('mostra mensagem quando a API está indisponível', async () => {
    mocks.requestPasswordReset.mockRejectedValueOnce(
      new ApiError(0, 'NETWORK_ERROR', 'Falha de rede'),
    );
    render(<ForgotPasswordForm />);

    fillValidData();
    submitForm();

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Não foi possível conectar à API. Verifique sua conexão e tente novamente.',
    );
  });
});
