'use client';

import { Check, ChevronDown, X } from 'lucide-react';
import { useId, useMemo, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import { cn } from '@/shared/lib/cn';

export type SearchableSelectOption = {
  value: string;
  label: string;
};

type SearchableSelectProps = {
  id: string;
  value: string;
  options: readonly SearchableSelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  emptyMessage?: string;
  ariaLabel?: string;
  ariaInvalid?: boolean;
  ariaDescribedBy?: string;
};

function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function SearchableSelect({
  id,
  value,
  options,
  onChange,
  placeholder = 'Selecione',
  disabled = false,
  clearable = true,
  emptyMessage = 'Nenhum resultado encontrado.',
  ariaLabel,
  ariaInvalid = false,
  ariaDescribedBy,
}: SearchableSelectProps) {
  const generatedId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const selectedOption = options.find((option) => option.value === value);
  const normalizedQuery = normalizeSearch(query);
  const filteredOptions = useMemo(
    () =>
      normalizedQuery === ''
        ? options
        : options.filter((option) => normalizeSearch(option.label).includes(normalizedQuery)),
    [normalizedQuery, options],
  );
  const listboxId = `${id}-${generatedId}-listbox`;
  const displayValue = isOpen ? query : (selectedOption?.label ?? '');
  const safeActiveIndex =
    filteredOptions.length === 0 ? -1 : Math.min(activeIndex, filteredOptions.length - 1);

  function optionId(index: number): string {
    return `${listboxId}-option-${index}`;
  }

  function openList() {
    if (disabled) {
      return;
    }

    setIsOpen(true);
    setQuery('');
    setActiveIndex(options.length > 0 ? 0 : -1);
  }

  function closeList() {
    setIsOpen(false);
    setActiveIndex(-1);
    setQuery('');
  }

  function selectOption(option: SearchableSelectOption) {
    onChange(option.value);
    setQuery(option.label);
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function clearSelection() {
    onChange('');
    setQuery('');
    setIsOpen(false);
    setActiveIndex(-1);
  }

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setQuery(event.target.value);
    setIsOpen(true);
    setActiveIndex(0);
  }

  function handleFocus() {
    openList();
  }

  function handleBlur() {
    closeList();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (disabled) {
      return;
    }

    if (event.key === 'ArrowDown') {
      event.preventDefault();

      if (!isOpen) {
        openList();
        return;
      }

      setActiveIndex((current) =>
        filteredOptions.length === 0
          ? -1
          : current < 0
            ? 0
            : Math.min(current + 1, filteredOptions.length - 1),
      );
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();

      if (!isOpen) {
        openList();
        return;
      }

      setActiveIndex((current) =>
        filteredOptions.length === 0 ? -1 : current <= 0 ? 0 : current - 1,
      );
      return;
    }

    if (event.key === 'Enter' && isOpen) {
      const option = filteredOptions[safeActiveIndex];

      if (option) {
        event.preventDefault();
        selectOption(option);
      }

      return;
    }

    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      closeList();
      return;
    }

    if (event.key === 'Tab') {
      closeList();
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={
          isOpen && safeActiveIndex >= 0 ? optionId(safeActiveIndex) : undefined
        }
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        className={cn(
          'flex h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-1 pr-9 text-base shadow-xs transition-[color,box-shadow] outline-none placeholder:text-muted-foreground disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm',
          'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50',
          'aria-invalid:border-destructive aria-invalid:ring-destructive/20',
        )}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />

      {clearable && value !== '' && !disabled ? (
        <button
          type="button"
          aria-label="Limpar seleção"
          className="absolute top-1/2 right-2 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"
          onMouseDown={(event) => event.preventDefault()}
          onClick={clearSelection}
        >
          <X aria-hidden="true" className="size-4" />
        </button>
      ) : (
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        />
      )}

      {isOpen ? (
        <ul
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {filteredOptions.length === 0 ? (
            <li role="presentation" className="px-3 py-2 text-sm text-muted-foreground">
              {emptyMessage}
            </li>
          ) : null}

          {filteredOptions.map((option, index) => {
            const isSelected = option.value === value;
            const isActive = index === safeActiveIndex;

            return (
              <li
                key={option.value}
                id={optionId(index)}
                role="option"
                aria-selected={isSelected}
                className={cn(
                  'flex cursor-pointer items-center justify-between gap-2 rounded-sm px-3 py-2 text-sm',
                  isActive && 'bg-accent text-accent-foreground',
                )}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => selectOption(option)}
              >
                <span>{option.label}</span>
                {isSelected ? <Check aria-hidden="true" className="size-4 shrink-0" /> : null}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
