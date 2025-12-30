import axios from 'axios';
import { logger } from '../utils/logger.js';

const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

class XUIService {
  constructor() {
    this.baseURL = process.env.PANEL_URL;
    this.username = process.env.PANEL_USERNAME;
    this.password = process.env.PANEL_PASSWORD;
    this.sessionId = null;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      validateStatus: () => true
    });
  }

  async login() {
    try {
      const response = await this.client.post('/login', {
        username: this.username,
        password: this.password
      });

      if (response.status === 200 && response.data.success) {
        this.sessionId = response.data.sessionId;
        logger.info('3x-ui login successful');
        return true;
      }
      logger.error('3x-ui login failed', { status: response.status });
      return false;
    } catch (error) {
      logger.error('3x-ui login error', { message: error.message });
      return false;
    }
  }

  async request(method, path, data = null, retryCount = 0) {
    try {
      const config = {
        method,
        url: path,
        headers: this.sessionId ? { 'Cookie': `PHPSESSID=${this.sessionId}` } : {}
      };

      if (data) {
        config.data = data;
      }

      const response = await this.client(config);

      if (response.status === 401) {
        if (retryCount === 0) {
          await this.login();
          return this.request(method, path, data, retryCount + 1);
        }
      }

      return response;
    } catch (error) {
      if (retryCount < MAX_RETRIES) {
        const delay = RETRY_DELAYS[retryCount];
        logger.warn(`Request failed, retrying in ${delay}ms`, { path, retryCount });
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.request(method, path, data, retryCount + 1);
      }
      throw error;
    }
  }

  async createClient(inboundId, options) {
    const { email, uuid, trafficLimit, expiryTime } = options;
    
    try {
      const response = await this.request('POST', `/panel/api/inbounds/${inboundId}/addClient`, {
        clients: JSON.stringify([{
          id: uuid,
          email,
          limitIp: 0,
          totalGB: trafficLimit * 1024 * 1024 * 1024,
          expiryTime: expiryTime * 1000,
          enable: true,
          tgId: '',
          subId: ''
        }])
      });

      if (response.status === 200 && response.data.success) {
        logger.info('Client created successfully', { email, inboundId });
        return { success: true, data: response.data };
      }

      logger.error('Failed to create client', { status: response.status, email });
      return { success: false, error: response.data };
    } catch (error) {
      logger.error('Error creating client', { message: error.message, email });
      throw error;
    }
  }

  async updateClientExpiry(inboundId, clientId, newExpiryTime) {
    try {
      const response = await this.request('POST', `/panel/api/inbounds/${inboundId}/updateClient/${clientId}`, {
        expiryTime: newExpiryTime * 1000
      });

      if (response.status === 200 && response.data.success) {
        logger.info('Client expiry updated', { clientId, inboundId });
        return { success: true };
      }

      return { success: false, error: response.data };
    } catch (error) {
      logger.error('Error updating client expiry', { message: error.message, clientId });
      throw error;
    }
  }

  async addClientTraffic(inboundId, clientId, additionalGB) {
    try {
      const additionalBytes = additionalGB * 1024 * 1024 * 1024;
      const response = await this.request('POST', `/panel/api/inbounds/${inboundId}/updateClient/${clientId}`, {
        totalGB: additionalBytes
      });

      if (response.status === 200 && response.data.success) {
        logger.info('Client traffic added', { clientId, additionalGB });
        return { success: true };
      }

      return { success: false, error: response.data };
    } catch (error) {
      logger.error('Error adding client traffic', { message: error.message, clientId });
      throw error;
    }
  }

  async disableClient(inboundId, clientId) {
    try {
      const response = await this.request('POST', `/panel/api/inbounds/${inboundId}/updateClient/${clientId}`, {
        enable: false
      });

      if (response.status === 200 && response.data.success) {
        logger.info('Client disabled', { clientId, inboundId });
        return { success: true };
      }

      return { success: false, error: response.data };
    } catch (error) {
      logger.error('Error disabling client', { message: error.message, clientId });
      throw error;
    }
  }

  async deleteClient(inboundId, clientId) {
    try {
      const response = await this.request('POST', `/panel/api/inbounds/${inboundId}/delClient/${clientId}`);

      if (response.status === 200 && response.data.success) {
        logger.info('Client deleted', { clientId, inboundId });
        return { success: true };
      }

      return { success: false, error: response.data };
    } catch (error) {
      logger.error('Error deleting client', { message: error.message, clientId });
      throw error;
    }
  }

  async getClientStats(inboundId, email) {
    try {
      const response = await this.request('GET', `/panel/api/inbounds/getClientTraffics/${email}`);

      if (response.status === 200 && response.data.success) {
        logger.info('Client stats retrieved', { email });
        return { success: true, data: response.data };
      }

      return { success: false, error: response.data };
    } catch (error) {
      logger.error('Error getting client stats', { message: error.message, email });
      throw error;
    }
  }

  async resetClientTraffic(inboundId, email) {
    try {
      const response = await this.request('POST', `/panel/api/inbounds/${inboundId}/resetClientTraffic/${email}`);

      if (response.status === 200 && response.data.success) {
        logger.info('Client traffic reset', { email });
        return { success: true };
      }

      return { success: false, error: response.data };
    } catch (error) {
      logger.error('Error resetting client traffic', { message: error.message, email });
      throw error;
    }
  }
}

export default new XUIService();
