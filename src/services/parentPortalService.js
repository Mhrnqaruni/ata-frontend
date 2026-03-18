import apiClient from './api';
import { config } from '../config';

export const parentPortalService = {
  async issueBridgeToken() {
    const response = await apiClient.post('/api/parent/noobbook/bridge-token');
    return response.data;
  },

  buildLaunchUrl(bridgeToken) {
    const baseUrl = config.parentPortalUrl?.trim();
    if (!baseUrl) {
      throw new Error('VITE_PARENT_PORTAL_URL is not configured. Set it to a deployed parent portal URL or a relative path like /parent-portal, then restart the ATA frontend dev server.');
    }
    if (!bridgeToken) {
      throw new Error('Bridge token is required.');
    }

    const launchUrl = new URL(baseUrl, window.location.origin);
    launchUrl.searchParams.set('bridge_token', bridgeToken);
    return launchUrl.toString();
  },
};
