import { v4 as uuidv4 } from 'uuid';

export function generateUUID() {
  return uuidv4();
}

export function generateOrderId() {
  const date = new Date().toISOString().split('T')[0];
  const random = Math.random().toString(36).substr(2, 9).toUpperCase();
  return `ORD-${date}-${random}`;
}

export function maskUUID(uuid) {
  if (!uuid || uuid.length < 8) return uuid;
  return uuid.substring(0, 4) + '-' + uuid.substring(uuid.length - 4);
}

export function calculateExpiryTimestamp(durationDays) {
  return Math.floor(Date.now() / 1000) + (durationDays * 24 * 60 * 60);
}

export function formatBytes(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

export function formatDate(date) {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function getTrafficPercentage(used, limit) {
  if (limit === 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

export function getTrafficStatus(percentage) {
  if (percentage >= 100) return '🔴 Exceeded';
  if (percentage >= 90) return '🟠 Critical';
  if (percentage >= 70) return '🟡 High';
  return '🟢 Normal';
}
