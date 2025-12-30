import express from 'express';
import xuiService from '../services/xuiService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

router.post('/vpn/create', async (req, res) => {
  try {
    const { userId, duration, traffic, serverId, inboundId, email, uuid } = req.body;

    if (!userId || !duration || !traffic || !serverId || !inboundId || !email || !uuid) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const expiryTime = Math.floor(Date.now() / 1000) + (duration * 24 * 60 * 60);

    const result = await xuiService.createClient(inboundId, {
      email,
      uuid,
      trafficLimit: traffic,
      expiryTime
    });

    if (result.success) {
      logger.info('VPN account created', { userId, email, serverId });
      return res.json({
        success: true,
        uuid,
        expiry: expiryTime,
        trafficLimit: traffic
      });
    }

    res.status(400).json({ success: false, error: result.error });
  } catch (error) {
    logger.error('Error creating VPN account', { message: error.message });
    res.status(500).json({ error: 'Failed to create VPN account' });
  }
});

router.post('/vpn/extend', async (req, res) => {
  try {
    const { uuid, additionalDays, inboundId, clientId } = req.body;

    if (!uuid || !additionalDays || !inboundId || !clientId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const newExpiryTime = Math.floor(Date.now() / 1000) + (additionalDays * 24 * 60 * 60);

    const result = await xuiService.updateClientExpiry(inboundId, clientId, newExpiryTime);

    if (result.success) {
      logger.info('VPN account extended', { uuid, additionalDays });
      return res.json({ success: true, newExpiry: newExpiryTime });
    }

    res.status(400).json({ success: false, error: result.error });
  } catch (error) {
    logger.error('Error extending VPN account', { message: error.message });
    res.status(500).json({ error: 'Failed to extend VPN account' });
  }
});

router.post('/vpn/add-traffic', async (req, res) => {
  try {
    const { uuid, additionalGB, inboundId, clientId } = req.body;

    if (!uuid || !additionalGB || !inboundId || !clientId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await xuiService.addClientTraffic(inboundId, clientId, additionalGB);

    if (result.success) {
      logger.info('Traffic added to VPN account', { uuid, additionalGB });
      return res.json({ success: true });
    }

    res.status(400).json({ success: false, error: result.error });
  } catch (error) {
    logger.error('Error adding traffic', { message: error.message });
    res.status(500).json({ error: 'Failed to add traffic' });
  }
});

router.post('/vpn/disable', async (req, res) => {
  try {
    const { uuid, inboundId, clientId } = req.body;

    if (!uuid || !inboundId || !clientId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await xuiService.disableClient(inboundId, clientId);

    if (result.success) {
      logger.info('VPN account disabled', { uuid });
      return res.json({ success: true });
    }

    res.status(400).json({ success: false, error: result.error });
  } catch (error) {
    logger.error('Error disabling VPN account', { message: error.message });
    res.status(500).json({ error: 'Failed to disable VPN account' });
  }
});

router.post('/vpn/delete', async (req, res) => {
  try {
    const { uuid, inboundId, clientId } = req.body;

    if (!uuid || !inboundId || !clientId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await xuiService.deleteClient(inboundId, clientId);

    if (result.success) {
      logger.info('VPN account deleted', { uuid });
      return res.json({ success: true });
    }

    res.status(400).json({ success: false, error: result.error });
  } catch (error) {
    logger.error('Error deleting VPN account', { message: error.message });
    res.status(500).json({ error: 'Failed to delete VPN account' });
  }
});

router.get('/vpn/stats/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const { inboundId } = req.query;

    if (!email || !inboundId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await xuiService.getClientStats(inboundId, email);

    if (result.success) {
      return res.json({ success: true, data: result.data });
    }

    res.status(400).json({ success: false, error: result.error });
  } catch (error) {
    logger.error('Error getting VPN stats', { message: error.message });
    res.status(500).json({ error: 'Failed to get VPN stats' });
  }
});

router.get('/health', async (req, res) => {
  try {
    const panelStatus = await xuiService.request('GET', '/panel/api/system/status');
    const isHealthy = panelStatus.status === 200;

    res.json({
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      panelConnected: isHealthy
    });
  } catch (error) {
    logger.error('Health check failed', { message: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      panelConnected: false
    });
  }
});

export default router;
