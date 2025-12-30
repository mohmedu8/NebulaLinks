import axios from 'axios';
import crypto from 'crypto';
import { logger } from '../utils/logger.js';

class APIClient {
  constructor() {
    this.baseURL = process.env.API_GATEWAY_URL;
    this.apiKey = process.env.API_SECRET_KEY;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      httpsAgent: { rejectUnauthorized: false } // For self-signed certs
    });
  }

  generateSignature(method, path, timestamp, body = '') {
    const canonicalString = `${method}${path}${timestamp}${body}`;
    return crypto
      .createHmac('sha256', this.apiKey)
      .update(canonicalString)
      .digest('hex');
  }

  async request(method, path, data = null) {
    try {
      const timestamp = Date.now();
      const body = data ? JSON.stringify(data) : '';
      const signature = this.generateSignature(method, path, timestamp, body);

      const config = {
        method,
        url: path,
        headers: {
          'X-API-KEY': this.apiKey,
          'X-TIMESTAMP': timestamp.toString(),
          'X-SIGNATURE': signature,
          'Content-Type': 'application/json'
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await this.client(config);
      return response.data;
    } catch (error) {
      logger.error('API request failed', { method, path, message: error.message });
      throw error;
    }
  }

  async createVPNAccount(userId, duration, traffic, serverId, inboundId, email, uuid) {
    return this.request('POST', '/api/vpn/create', {
      userId,
      duration,
      traffic,
      serverId,
      inboundId,
      email,
      uuid
    });
  }

  async extendAccount(uuid, additionalDays, inboundId, clientId) {
    return this.request('POST', '/api/vpn/extend', {
      uuid,
      additionalDays,
      inboundId,
      clientId
    });
  }

  async addTraffic(uuid, additionalGB, inboundId, clientId) {
    return this.request('POST', '/api/vpn/add-traffic', {
      uuid,
      additionalGB,
      inboundId,
      clientId
    });
  }

  async disableAccount(uuid, inboundId, clientId) {
    return this.request('POST', '/api/vpn/disable', {
      uuid,
      inboundId,
      clientId
    });
  }

  async deleteAccount(uuid, inboundId, clientId) {
    return this.request('POST', '/api/vpn/delete', {
      uuid,
      inboundId,
      clientId
    });
  }

  async getAccountStats(email, inboundId) {
    return this.request('GET', `/api/vpn/stats/${email}?inboundId=${inboundId}`);
  }

  async healthCheck() {
    return this.request('GET', '/api/health');
  }
}

export default new APIClient();
