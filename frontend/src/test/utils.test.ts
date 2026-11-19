import { describe, it, expect } from 'vitest';
import { formatPrice, getInitials, getStatusColor, formatRelativeTime, cn } from '../utils';

describe('Utility Functions', () => {
  describe('cn (Tailwind class merger)', () => {
    it('merges class names properly', () => {
      expect(cn('px-2 py-1', 'bg-blue-500')).toBe('px-2 py-1 bg-blue-500');
    });

    it('resolves conflicting Tailwind classes', () => {
      expect(cn('p-2', 'p-4')).toBe('p-4');
    });

    it('handles conditionals and falsy values', () => {
      expect(cn('base', false && 'hidden', undefined, null, 'active')).toBe('base active');
    });
  });

  describe('formatPrice', () => {
    it('formats USD currency correctly', () => {
      expect(formatPrice(100)).toBe('$100.00');
      expect(formatPrice(49.99)).toBe('$49.99');
      expect(formatPrice(0)).toBe('$0.00');
    });

    it('formats large amounts with thousands commas', () => {
      expect(formatPrice(12500)).toBe('$12,500.00');
    });
  });

  describe('getInitials', () => {
    it('extracts two initials from full names', () => {
      expect(getInitials('John Doe')).toBe('JD');
      expect(getInitials('Alex Rivera Morales')).toBe('AR');
    });

    it('handles single names', () => {
      expect(getInitials('Sarah')).toBe('S');
    });

    it('capitalizes lowercase initials', () => {
      expect(getInitials('jane smith')).toBe('JS');
    });
  });

  describe('getStatusColor', () => {
    it('returns badge-green for successful and completed states', () => {
      expect(getStatusColor('released')).toBe('badge-green');
      expect(getStatusColor('confirmed')).toBe('badge-green');
      expect(getStatusColor('active')).toBe('badge-green');
      expect(getStatusColor('paid_out')).toBe('badge-green');
    });

    it('returns badge-red for disputed, cancelled, or failed states', () => {
      expect(getStatusColor('disputed')).toBe('badge-red');
      expect(getStatusColor('failed')).toBe('badge-red');
      expect(getStatusColor('refunded')).toBe('badge-red');
    });

    it('returns badge-blue for in_progress or under_review', () => {
      expect(getStatusColor('in_progress')).toBe('badge-blue');
      expect(getStatusColor('under_review')).toBe('badge-blue');
    });

    it('returns badge-yellow for pending or open', () => {
      expect(getStatusColor('pending_payment')).toBe('badge-yellow');
      expect(getStatusColor('open')).toBe('badge-yellow');
    });

    it('returns fallback badge-gray for unknown statuses', () => {
      expect(getStatusColor('unknown_status_xyz')).toBe('badge-gray');
    });
  });

  describe('formatRelativeTime', () => {
    it('returns "just now" for dates within 1 minute', () => {
      const now = new Date().toISOString();
      expect(formatRelativeTime(now)).toBe('just now');
    });

    it('returns minutes ago for dates within 1 hour', () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      expect(formatRelativeTime(fiveMinAgo)).toBe('5m ago');
    });

    it('returns hours ago for dates within 24 hours', () => {
      const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
      expect(formatRelativeTime(twoHoursAgo)).toBe('2h ago');
    });
  });
});
