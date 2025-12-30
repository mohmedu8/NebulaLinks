import logger from './logger.js';

export function formatCurrency(amount) {
  return `${amount.toFixed(2)} EGP`;
}

export function formatDate(timestamp) {
  return new Date(timestamp * 1000).toISOString();
}

export function formatBytes(bytes) {
  const gb = bytes / (1024 ** 3);
  return `${gb.toFixed(2)}GB`;
}

export function getApprovalRate(approved, total) {
  if (total === 0) return 0;
  return Math.round((approved / total) * 100);
}

export async function withErrorHandling(fn, context = 'Operation') {
  try {
    return await fn();
  } catch (error) {
    logger.error(`${context} error: ${error.message}`);
    throw error;
  }
}

export function validateDiscordId(id) {
  return /^\d{17,19}$/.test(id);
}

export function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
