import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SearchableSelect, type SearchableSelectOption } from '@/shared/ui/searchable-select';

const OPTIONS: SearchableSelectOption[] = [
  { value: 'oleo', label: 'Troca de óleo' },
  { value: 'alinhamento', label: 'Alinhamento' },
];

type ControlledSelectProps = {
  onValueChange?: (value: string) => void;
};

function ControlledSelect({ onValueChange = () => {} }: ControlledSelectProps) {
  const [value, setValue] = useState('');

  return (
    <SearchableSelect
      id="service"
      ariaLabel="Serviço"
      value={value}
      options={OPTIONS}
      onChange={(nextValue) => {
        setValue(nextValue);
        onValueChange(nextValue);
      }}
      placeholder="Selecione o serviço"
    />
  );
}

describe('SearchableSelect', () => {
  it('filtra opções sem diferenciar maiúsculas e acentos', () => {
    render(<ControlledSelect />);

    const input = screen.getByLabelText('Serviço');

    fireEvent.focus(input);
    expect(screen.getByRole('option', { name: 'Troca de óleo' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Alinhamento' })).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'OLEO' } });

    expect(screen.getByRole('option', { name: 'Troca de óleo' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Alinhamento' })).not.toBeInTheDocument();
  });

  it('seleciona uma opção pesquisada e exibe o rótulo escolhido', () => {
    const onValueChange = vi.fn();

    render(<ControlledSelect onValueChange={onValueChange} />);

    const input = screen.getByLabelText('Serviço');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'alinh' } });
    fireEvent.click(screen.getByRole('option', { name: 'Alinhamento' }));

    expect(onValueChange).toHaveBeenCalledWith('alinhamento');
    expect(input).toHaveValue('Alinhamento');
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('seleciona a opção ativa pelo teclado', () => {
    const onValueChange = vi.fn();

    render(<ControlledSelect onValueChange={onValueChange} />);

    const input = screen.getByLabelText('Serviço');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'alinh' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onValueChange).toHaveBeenCalledWith('alinhamento');
    expect(input).toHaveValue('Alinhamento');
  });

  it('limpa a seleção', () => {
    const onValueChange = vi.fn();

    render(<ControlledSelect onValueChange={onValueChange} />);

    const input = screen.getByLabelText('Serviço');

    fireEvent.focus(input);
    fireEvent.click(screen.getByRole('option', { name: 'Troca de óleo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Limpar seleção' }));

    expect(onValueChange).toHaveBeenLastCalledWith('');
    expect(input).toHaveValue('');
    expect(screen.getByPlaceholderText('Selecione o serviço')).toBe(input);
  });

  it('mostra mensagem quando não há resultados', () => {
    render(<ControlledSelect />);

    const input = screen.getByLabelText('Serviço');

    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: 'inexistente' } });

    expect(screen.getByText('Nenhum resultado encontrado.')).toBeInTheDocument();
  });
});
