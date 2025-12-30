import logger from '../utils/logger.js';

export class HealthMonitor {
  constructor(xrayClient, checkIntervalSeconds = 60) {
    this.xrayClient = xrayClient;
    this.checkInterval = checkIntervalSeconds * 1000;
    this.consecutiveFailures = 0;
    this.maxFailures = 3;
    this.isHealthy = false;
    this.onHealthStatusChange = null;
  }

  async start() {
    logger.info('Health monitor started');
    this.checkHealth();
    this.intervalId = setInterval(() => this.checkHealth(), this.checkInterval);
  }

  async checkHealth() {
    try {
      const healthy = await this.xrayClient.isHealthy();

      if (healthy) {
        this.consecutiveFailures = 0;
        if (!this.isHealthy) {
          this.isHealthy = true;
          logger.info('3x-ui panel is healthy');
          if (this.onHealthStatusChange) {
            this.onHealthStatusChange(true);
          }
        }
      } else {
        this.consecutiveFailures++;
        logger.warn(`3x-ui health check failed (${this.consecutiveFailures}/${this.maxFailures})`);

        if (this.consecutiveFailures >= this.maxFailures && this.isHealthy) {
          this.isHealthy = false;
          logger.error('3x-ui panel marked as unhealthy');
          if (this.onHealthStatusChange) {
            this.onHealthStatusChange(false);
          }
        }
      }
    } catch (error) {
      logger.error(`Health check error: ${error.message}`);
      this.consecutiveFailures++;
    }
  }

  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      logger.info('Health monitor stopped');
    }
  }

  getStatus() {
    return this.isHealthy;
  }
}

export default HealthMonitor;
