import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from '@/app/page';

describe('Home', () => {
  it('renderiza o nome do projeto', () => {
    render(<Home />);

    expect(screen.getByRole('heading', { name: 'Serviço Certo' })).toBeInTheDocument();
  });
});
