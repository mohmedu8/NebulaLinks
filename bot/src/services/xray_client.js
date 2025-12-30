import axios from 'axios';
import logger from '../utils/logger.js';

export class XrayClient {
  constructor(baseURL, username, password) {
    this.baseURL = baseURL;
    this.username = username;
    this.password = password;
    this.client = axios.create({
      baseURL,
      timeout: 10000,
      validateStatus: () => true
    });
    this.sessionId = null;
    this.healthy = false;
  }

  async authenticate() {
    try {
      const response = await this.client.post('/panel/api/login', {
        username: this.username,
        password: this.password
      });

      if (response.status === 200 && response.data.success) {
        this.sessionId = response.data.sessionId;
        logger.info('3x-ui authentication successful');
        return true;
      }
      logger.error('3x-ui authentication failed');
      return false;
    } catch (error) {
      logger.error(`3x-ui authentication error: ${error.message}`);
      return false;
    }
  }

  async isHealthy() {
    try {
      const response = await this.client.get('/panel/api/server', {
        headers: { 'Cookie': `PHPSESSID=${this.sessionId}` }
      });
      this.healthy = response.status === 200;
      return this.healthy;
    } catch (error) {
      logger.error(`3x-ui health check failed: ${error.message}`);
      this.healthy = false;
      return false;
    }
  }

  async createClient(inboundId, email, uuid, expiryTimestamp, trafficLimitBytes) {
    try {
      const clientData = {
        email,
        uuid,
        expiryTime: expiryTimestamp,
        totalGB: trafficLimitBytes / (1024 ** 3),
        enable: true
      };

      const response = await this.client.post(
        `/panel/api/inbounds/${inboundId}/addClient`,
        clientData,
        { headers: { 'Cookie': `PHPSESSID=${this.sessionId}` } }
      );

      if (response.status === 200 && response.data.success) {
        logger.info(`Client created: ${email}`);
        return response.data;
      }
      logger.error(`Failed to create client: ${email}`);
      return null;
    } catch (error) {
      logger.error(`Create client error: ${error.message}`);
      return null;
    }
  }

  async updateClient(inboundId, clientId, updates) {
    try {
      const response = await this.client.post(
        `/panel/api/inbounds/${inboundId}/updateClient/${clientId}`,
        updates,
        { headers: { 'Cookie': `PHPSESSID=${this.sessionId}` } }
      );

      if (response.status === 200 && response.data.success) {
        logger.info(`Client updated: ${clientId}`);
        return response.data;
      }
      return null;
    } catch (error) {
      logger.error(`Update client error: ${error.message}`);
      return null;
    }
  }

  async deleteClient(inboundId, clientId) {
    try {
      const response = await this.client.post(
        `/panel/api/inbounds/${inboundId}/delClient/${clientId}`,
        {},
        { headers: { 'Cookie': `PHPSESSID=${this.sessionId}` } }
      );

      if (response.status === 200 && response.data.success) {
        logger.info(`Client deleted: ${clientId}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Delete client error: ${error.message}`);
      return false;
    }
  }

  async getClientStats(email) {
    try {
      const response = await this.client.get(
        `/panel/api/inbounds/getClientStats/${email}`,
        { headers: { 'Cookie': `PHPSESSID=${this.sessionId}` } }
      );

      if (response.status === 200) {
        return response.data;
      }
      return null;
    } catch (error) {
      logger.error(`Get client stats error: ${error.message}`);
      return null;
    }
  }

  async resetClientTraffic(inboundId, email) {
    try {
      const response = await this.client.post(
        `/panel/api/inbounds/${inboundId}/resetClientTraffic/${email}`,
        {},
        { headers: { 'Cookie': `PHPSESSID=${this.sessionId}` } }
      );

      if (response.status === 200 && response.data.success) {
        logger.info(`Client traffic reset: ${email}`);
        return true;
      }
      return false;
    } catch (error) {
      logger.error(`Reset traffic error: ${error.message}`);
      return false;
    }
  }

  async disableClient(inboundId, clientId) {
    return this.updateClient(inboundId, clientId, { enable: false });
  }

  async enableClient(inboundId, clientId) {
    return this.updateClient(inboundId, clientId, { enable: true });
  }

  generateVLESSLink(uuid, serverAddress, serverPort, tlsEnabled = true) {
    const security = tlsEnabled ? 'tls' : 'none';
    return `vless://${uuid}@${serverAddress}:${serverPort}?security=${security}&type=tcp`;
  }
}

export default XrayClient;
