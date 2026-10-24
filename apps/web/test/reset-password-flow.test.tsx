import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/lib/api-client';

const TOKEN = 'A'.repeat(43);

const mocks = vi.hoisted(() => ({
  token: { value: 'A'.repeat(43) as string | null },
  validate: vi.fn(),
  reset: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: (key: string) => (key === 'token' ? mocks.token.value : null),
  }),
}));

vi.mock('@/modules/identity/lib/auth-api', () => ({
  validatePasswordResetToken: mocks.validate,
  resetPassword: mocks.reset,
}));

import { ResetPasswordFlow } from '@/modules/identity/components/reset-password-flow';

const CONTEXT = {
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
  expiresAt: '2026-10-23T23:59:00.000Z',
};

function submitForm() {
  const form = screen.getByRole('button', { name: 'Redefinir senha' }).closest('form');

  expect(form).not.toBeNull();
  fireEvent.submit(form as HTMLFormElement);
}

function fillPasswords(password: string, confirmation = password) {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), {
    target: { value: confirmation },
  });
}

describe('ResetPasswordFlow', () => {
  beforeEach(() => {
    mocks.token.value = TOKEN;
    mocks.validate.mockReset();
    mocks.reset.mockReset();
    mocks.validate.mockResolvedValue(CONTEXT);
    mocks.reset.mockResolvedValue(undefined);
  });

  it('valida o token e exibe o contexto da conta', async () => {
    render(<ResetPasswordFlow />);

    expect(await screen.findByText('joao@exemplo.com')).toBeInTheDocument();
    expect(mocks.validate).toHaveBeenCalledWith(TOKEN);
    expect(screen.getByText('Oficina do João')).toBeInTheDocument();
    expect(screen.getByText(/Link válido até/)).toBeInTheDocument();
    expect(screen.getByLabelText('Nova senha')).toBeInTheDocument();
    expect(screen.getByLabelText('Confirmar nova senha')).toBeInTheDocument();
  });

  it('mostra link inválido quando o token está ausente', async () => {
    mocks.token.value = null;
    render(<ResetPasswordFlow />);

    expect(
      await screen.findByRole('heading', { name: 'Link inválido ou expirado' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Solicitar novo link' })).toHaveAttribute(
      'href',
      '/forgot-password',
    );
    expect(mocks.validate).not.toHaveBeenCalled();
  });

  it('mostra link inválido quando o token tem formato inválido', async () => {
    mocks.token.value = 'token-curto';
    render(<ResetPasswordFlow />);

    expect(
      await screen.findByRole('heading', { name: 'Link inválido ou expirado' }),
    ).toBeInTheDocument();
    expect(mocks.validate).not.toHaveBeenCalled();
  });

  it('rejeita senhas que não conferem', async () => {
    render(<ResetPasswordFlow />);

    await screen.findByLabelText('Nova senha');
    fillPasswords('nova-senha-segura', 'outra-senha');
    submitForm();

    expect(await screen.findByText('As senhas não conferem')).toBeInTheDocument();
    expect(mocks.reset).not.toHaveBeenCalled();
  });

  it('valida o tamanho mínimo da senha', async () => {
    render(<ResetPasswordFlow />);

    await screen.findByLabelText('Nova senha');
    fillPasswords('curta', 'curta');
    submitForm();

    expect(await screen.findByText('A senha deve ter ao menos 10 caracteres')).toBeInTheDocument();
    expect(mocks.reset).not.toHaveBeenCalled();
  });

  it('redefine a senha e mostra o estado de sucesso', async () => {
    render(<ResetPasswordFlow />);

    await screen.findByLabelText('Nova senha');
    fillPasswords('nova-senha-segura');
    submitForm();

    await waitFor(() => {
      expect(mocks.reset).toHaveBeenCalledWith({
        token: TOKEN,
        password: 'nova-senha-segura',
      });
    });

    expect(await screen.findByRole('heading', { name: 'Senha redefinida' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ir para o login' })).toHaveAttribute('href', '/login');
  });

  it('trata token expirado durante a confirmação', async () => {
    mocks.reset.mockRejectedValueOnce(
      new ApiError(400, 'INVALID_RESET_TOKEN', 'Token de reset inválido ou expirado'),
    );
    render(<ResetPasswordFlow />);

    await screen.findByLabelText('Nova senha');
    fillPasswords('nova-senha-segura');
    submitForm();

    expect(
      await screen.findByRole('heading', { name: 'Link inválido ou expirado' }),
    ).toBeInTheDocument();
    expect(screen.getByText(/expirou ou já foi utilizado/)).toBeInTheDocument();
  });

  it('permite tentar novamente quando a validação falha por rede', async () => {
    mocks.validate.mockRejectedValueOnce(new ApiError(0, 'NETWORK_ERROR', 'Falha de rede'));
    render(<ResetPasswordFlow />);

    expect(
      await screen.findByRole('heading', { name: 'Não foi possível validar o link' }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));

    expect(await screen.findByText('joao@exemplo.com')).toBeInTheDocument();
    expect(mocks.validate).toHaveBeenCalledTimes(2);
  });
});
