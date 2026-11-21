import type { OrderStatus } from '@prisma/client';

// label and status-dot tone for each order state, shared by the buyer page and the admin list
export const STATUS_LABEL: Record<OrderStatus, [string, string]> = {
  PENDING: ['Menunggu pembayaran', ''],
  REVIEW: ['Bukti sedang diperiksa', 'wait'],
  PAID: ['Lunas', 'ok'],
  REJECTED: ['Ditolak', 'off'],
  CANCELLED: ['Dibatalkan', 'off'],
};
