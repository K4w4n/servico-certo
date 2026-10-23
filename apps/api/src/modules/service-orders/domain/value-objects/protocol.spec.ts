import { describe, expect, it } from 'vitest';
import { InvalidProtocolError } from '../errors/service-order.errors.js';
import { Protocol } from './protocol.js';

describe('Protocol', () => {
  it('gera protocolos numéricos a partir da sequência', () => {
    expect(Protocol.fromSequence(1).value).toBe('100001');
    expect(Protocol.fromSequence(2).value).toBe('100002');
    expect(Protocol.fromSequence(899_999).value).toBe('999999');
  });

  it('continua numérico ao passar de seis dígitos', () => {
    expect(Protocol.fromSequence(900_000).value).toBe('1000000');
  });

  it('rejeita sequências inválidas', () => {
    expect(() => Protocol.fromSequence(0)).toThrow(InvalidProtocolError);
    expect(() => Protocol.fromSequence(-1)).toThrow(InvalidProtocolError);
    expect(() => Protocol.fromSequence(1.5)).toThrow(InvalidProtocolError);
    expect(() => Protocol.fromSequence(1_000_000_000)).toThrow(InvalidProtocolError);
  });

  it('restaura protocolos existentes', () => {
    expect(Protocol.restore('100001').value).toBe('100001');
    expect(Protocol.restore('1000000').value).toBe('1000000');
  });

  it('rejeita protocolos fora do formato', () => {
    expect(() => Protocol.restore('abc')).toThrow(InvalidProtocolError);
    expect(() => Protocol.restore('12345')).toThrow(InvalidProtocolError);
    expect(() => Protocol.restore('1234')).toThrow(InvalidProtocolError);
    expect(() => Protocol.restore('1234567890')).toThrow(InvalidProtocolError);
  });
});
