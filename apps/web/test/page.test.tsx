import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  logout: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/',
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
    logout: mocks.logout,
    request: vi.fn(),
  }),
}));

import Home from '@/app/page';

describe('Home', () => {
  it('mostra a conta e o tenant autenticados', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'Olá, João' })).toBeInTheDocument();
    expect(screen.getAllByText('Oficina do João').length).toBeGreaterThan(0);
    expect(screen.getByText('joao@exemplo.com')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Clientes' })).toHaveAttribute('href', '/customers');
    expect(screen.getByRole('link', { name: 'Produtos' })).toHaveAttribute('href', '/products');
    expect(screen.getByRole('link', { name: 'Serviços' })).toHaveAttribute('href', '/services');
    expect(screen.getByRole('link', { name: 'Ordens de serviço' })).toHaveAttribute(
      'href',
      '/service-orders',
    );
    expect(screen.getByRole('link', { name: 'Usuários' })).toHaveAttribute('href', '/accounts');
  });
});
