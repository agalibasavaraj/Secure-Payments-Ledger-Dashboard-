import { describe, it, expect } from 'vitest';
import { formatMoney, toMinorUnits, formatMoneyCompact } from '../utils/money';

describe('Money Utility', () => {
  describe('formatMoney', () => {
    it('converts minor units (paise) to Indian Rupee string correctly', () => {
      expect(formatMoney(25000)).toBe('₹250.00');
      expect(formatMoney(0)).toBe('₹0.00');
      expect(formatMoney(99)).toBe('₹0.99');
      expect(formatMoney(100)).toBe('₹1.00');
    });

    it('formats large values using the Indian numbering system', () => {
      // 1 Lakh Rupees = 1,00,000.00 = 10,000,000 minor units
      expect(formatMoney(10000000)).toBe('₹1,00,000.00');
      // 50 Thousand Rupees = 50,000.00 = 5,000,000 minor units
      expect(formatMoney(5000000)).toBe('₹50,000.00');
    });

    it('handles null, undefined and negative values safely', () => {
      expect(formatMoney(null)).toBe('₹0.00');
      expect(formatMoney(undefined)).toBe('₹0.00');
      expect(formatMoney(-5000)).toBe('-₹50.00');
    });
  });

  describe('toMinorUnits (integer precision)', () => {
    it('converts decimal rupee inputs to minor units integer without float inaccuracies', () => {
      expect(toMinorUnits('250.00')).toBe(25000);
      expect(toMinorUnits('250')).toBe(25000);
      expect(toMinorUnits(250)).toBe(25000);
      expect(toMinorUnits('0.99')).toBe(99);
      expect(toMinorUnits('0.05')).toBe(5);
    });

    it('safely handles 0.1 + 0.2 floating point rounding edge cases', () => {
      // In JS float: 0.1 + 0.2 = 0.30000000000000004
      const floatSum = 0.1 + 0.2;
      // When converted to minor units string:
      expect(toMinorUnits(floatSum.toFixed(2))).toBe(30);
      expect(toMinorUnits('0.10')).toBe(10);
      expect(toMinorUnits('0.20')).toBe(20);
      expect(toMinorUnits('0.30')).toBe(30);
    });

    it('handles commas and spaces in input', () => {
      expect(toMinorUnits('1,00,000.50')).toBe(10000050);
      expect(toMinorUnits('   500.25   ')).toBe(50025);
    });
  });

  describe('formatMoneyCompact', () => {
    it('returns human-friendly abbreviated amounts', () => {
      expect(formatMoneyCompact(5000000)).toBe('₹50k');
      expect(formatMoneyCompact(10000000)).toBe('₹1.0L');
    });
  });
});
