import { describe, expect, it } from 'vitest';
import { formatCountdown, formatDuration, formatOffset } from './format';

describe('format', () => {
  it('formats countdowns, rounding up while positive', () => {
    expect(formatCountdown(300_000)).toBe('5:00');
    expect(formatCountdown(299_001)).toBe('5:00');
    expect(formatCountdown(299_000)).toBe('4:59');
    expect(formatCountdown(500)).toBe('0:01');
  });

  it('formats negative countdowns', () => {
    expect(formatCountdown(0)).toBe('\u22120:00');
    expect(formatCountdown(-42_500)).toBe('\u22120:42');
    expect(formatCountdown(-125_000)).toBe('\u22122:05');
  });

  it('formats durations and hours', () => {
    expect(formatDuration(61_999)).toBe('1:01');
    expect(formatDuration(3_725_000)).toBe('1:02:05');
    expect(formatDuration(-5)).toBe('0:00');
  });

  it('formats signed offsets', () => {
    expect(formatOffset(150_000)).toBe('+2:30');
    expect(formatOffset(-65_000)).toBe('\u22121:05');
    expect(formatOffset(0)).toBe('+0:00');
  });
});
