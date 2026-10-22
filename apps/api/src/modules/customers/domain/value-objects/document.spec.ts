import { describe, expect, it } from 'vitest';
import { InvalidDocumentError } from '../errors/customer.errors.js';
import { Document } from './document.js';

describe('Document', () => {
  it('aceita CPF válido formatado e normaliza', () => {
    const document = Document.create('529.982.247-25', 'CPF');

    expect(document.value).toBe('52998224725');
    expect(document.type).toBe('CPF');
  });

  it('aceita CPF válido sem formatação', () => {
    const document = Document.create('11144477735', 'CPF');

    expect(document.value).toBe('11144477735');
  });

  it('rejeita CPF com dígito verificador inválido', () => {
    expect(() => Document.create('52998224724', 'CPF')).toThrow(InvalidDocumentError);
  });

  it('rejeita CPF com dígitos repetidos', () => {
    expect(() => Document.create('11111111111', 'CPF')).toThrow(InvalidDocumentError);
  });

  it('aceita CNPJ numérico formatado', () => {
    const document = Document.create('11.222.333/0001-81', 'CNPJ');

    expect(document.value).toBe('11222333000181');
    expect(document.type).toBe('CNPJ');
  });

  it('aceita CNPJ alfanumérico e normaliza para uppercase', () => {
    const document = Document.create('12.abc.345/01de-35', 'CNPJ');

    expect(document.value).toBe('12ABC34501DE35');
    expect(document.type).toBe('CNPJ');
  });

  it('rejeita CNPJ com dígito verificador inválido', () => {
    expect(() => Document.create('11222333000182', 'CNPJ')).toThrow(InvalidDocumentError);
  });

  it('rejeita CNPJ alfanumérico inválido', () => {
    expect(() => Document.create('12ABC34501DE36', 'CNPJ')).toThrow(InvalidDocumentError);
  });

  it('rejeita CPF enviado como CNPJ', () => {
    expect(() => Document.create('52998224725', 'CNPJ')).toThrow(InvalidDocumentError);
  });

  it('rejeita CNPJ enviado como CPF', () => {
    expect(() => Document.create('11222333000181', 'CPF')).toThrow(InvalidDocumentError);
  });
});
