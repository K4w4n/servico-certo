import { InvalidProtocolError } from '../errors/service-order.errors.js';

const PROTOCOL_SEQUENCE_OFFSET = 100_000;
const MAX_PROTOCOL = 999_999_999;

export class Protocol {
  private constructor(private readonly protocolValue: string) {}

  static fromSequence(sequence: number): Protocol {
    if (!Number.isInteger(sequence) || sequence < 1) {
      throw new InvalidProtocolError('Sequência de protocolo inválida');
    }

    const numericProtocol = PROTOCOL_SEQUENCE_OFFSET + sequence;

    if (numericProtocol > MAX_PROTOCOL) {
      throw new InvalidProtocolError('Limite de protocolos atingido');
    }

    return new Protocol(String(numericProtocol));
  }

  static restore(value: string): Protocol {
    if (!/^\d{6,9}$/.test(value)) {
      throw new InvalidProtocolError();
    }

    return new Protocol(value);
  }

  get value(): string {
    return this.protocolValue;
  }
}
