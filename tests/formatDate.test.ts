import { describe, expect, it } from 'vitest';
import { formatDate } from '../src/utils/formatDate';

describe('formatDate', () => {
  it('formats a date for Chinese readers', () => {
    expect(formatDate(new Date('2026-07-13T12:00:00Z'))).toBe('2026年7月13日');
  });

  it('rejects invalid dates', () => {
    expect(() => formatDate(new Date('invalid'))).toThrow('Invalid date');
  });
});
