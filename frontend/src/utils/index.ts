import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(cents: number, currency = 'usd'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(cents);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH}h ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD < 30) return `${diffD}d ago`;
  return formatDate(dateStr);
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    active: 'badge-green', draft: 'badge-gray', paused: 'badge-yellow', archived: 'badge-red',
    in_progress: 'badge-blue', delivered: 'badge-purple', confirmed: 'badge-green',
    released: 'badge-green', paid_out: 'badge-green', disputed: 'badge-red',
    cancelled: 'badge-gray', refunded: 'badge-red', pending_payment: 'badge-yellow',
    authorized: 'badge-blue', failed: 'badge-red',
    open: 'badge-yellow', under_review: 'badge-blue',
    resolved_refund: 'badge-green', resolved_release: 'badge-green', resolved_partial: 'badge-green',
  };
  return colors[status] || 'badge-gray';
}

export function getInitials(name: string): string {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/**
 * Normalizes an uploaded or remote media URL.
 * Converts relative paths like /uploads/avatars/... into absolute URLs pointing to the backend.
 */
export function getMediaUrl(path?: string | null): string {
  if (!path) return '';
  if (
    path.startsWith('http://') ||
    path.startsWith('https://') ||
    path.startsWith('data:') ||
    path.startsWith('blob:')
  ) {
    return path;
  }
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl && apiUrl.startsWith('http')) {
    const backendOrigin = apiUrl.replace(/\/api\/v1\/?$/, '').replace(/\/api\/?$/, '');
    return `${backendOrigin}${path.startsWith('/') ? '' : '/'}${path}`;
  }
  return path;
}
