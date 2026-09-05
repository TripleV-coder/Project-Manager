jest.mock('next/server', () => {
  return {
    NextResponse: {
      json: (body, init = {}) => {
        const status = init.status || 200;
        return {
          status,
          ok: status >= 200 && status < 300,
          json: async () => body,
          headers: { get: () => null, set: jest.fn(), append: jest.fn() },
        };
      },
    },
  };
});

jest.mock('@/lib/requestAuth', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/lib/auditService', () => ({
  logActivity: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/services/sharepointService', () => ({
  invalidateConfigCache: jest.fn(),
  testConnectionWithConfig: jest.fn(),
  isSharePointConfigured: jest.fn(),
  syncAllProjects: jest.fn(),
}));

jest.mock('@/models/SharePointConfig', () => ({
  __esModule: true,
  default: {
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    updateConnectionStatus: jest.fn().mockResolvedValue({}),
    updateSyncStats: jest.fn().mockResolvedValue({}),
  },
}));

import { authenticateRequest } from '@/lib/requestAuth';
import SharePointConfig from '@/models/SharePointConfig';
import {
  invalidateConfigCache,
  testConnectionWithConfig,
  isSharePointConfigured,
  syncAllProjects,
} from '@/lib/services/sharepointService';
import { GET as getConfig, PUT as putConfig } from '@/app/api/sharepoint/config/route';
import { POST as postTest } from '@/app/api/sharepoint/test/route';
import { POST as postSync } from '@/app/api/sharepoint/sync/route';

const admin = {
  _id: 'admin-1',
  role_id: { permissions: { adminConfig: true } },
};

function jsonRequest(url, { method = 'GET', body } = {}) {
  const request = new Request(url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (body) {
    request.json = async () => body;
  }
  return request;
}

const storedConfig = {
  enabled: true,
  tenant_id: 'tenant',
  site_id: 'site',
  client_id: 'client',
  client_secret: 'stored-secret',
  sync_enabled: true,
  sync_interval: 15,
  connection_status: { connected: true, site_name: 'PM' },
  sync_stats: { last_sync: null, files_synced: 2, files_failed: 0 },
};

describe('SharePoint API routes', () => {
  beforeEach(() => {
    authenticateRequest.mockResolvedValue(admin);
    SharePointConfig.getConfig.mockResolvedValue(storedConfig);
    SharePointConfig.updateConfig.mockResolvedValue(storedConfig);
  });

  test('GET /api/sharepoint/config never returns the client secret', async () => {
    const response = await getConfig(new Request('http://localhost/api/sharepoint/config'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.config.client_secret).toBe('');
    expect(payload.has_secret).toBe(true);
    expect(JSON.stringify(payload)).not.toContain('stored-secret');
  });

  test('PUT /api/sharepoint/config persists nested UI payload without requiring a new secret', async () => {
    const response = await putConfig(
      jsonRequest('http://localhost/api/sharepoint/config', {
        method: 'PUT',
        body: {
          enabled: true,
          config: {
            tenant_id: 'tenant',
            site_id: 'site',
            client_id: 'client',
            client_secret: '',
            auto_sync: true,
            sync_interval: 30,
          },
        },
      })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(SharePointConfig.updateConfig).toHaveBeenCalledWith(
      expect.not.objectContaining({ client_secret: expect.anything() }),
      'admin-1'
    );
    expect(SharePointConfig.updateConfig.mock.calls[0][0]).toMatchObject({
      enabled: true,
      tenant_id: 'tenant',
      site_id: 'site',
      sync_interval: 30,
    });
    expect(invalidateConfigCache).toHaveBeenCalled();
    expect(payload.has_secret).toBe(true);
  });

  test('POST /api/sharepoint/test reuses the stored secret when the form is empty', async () => {
    testConnectionWithConfig.mockResolvedValue({
      success: true,
      site: { name: 'PM', webUrl: 'https://contoso.sharepoint.com' },
    });

    const response = await postTest(
      jsonRequest('http://localhost/api/sharepoint/test', {
        method: 'POST',
        body: {
          tenant_id: 'tenant',
          site_id: 'site',
          client_id: 'client',
          client_secret: '',
        },
      })
    );

    expect(response.status).toBe(200);
    expect(testConnectionWithConfig).toHaveBeenCalledWith({
      tenant_id: 'tenant',
      client_id: 'client',
      client_secret: 'stored-secret',
      site_id: 'site',
    });
  });

  test('POST /api/sharepoint/sync returns 422 when SharePoint is not configured', async () => {
    isSharePointConfigured.mockResolvedValue(false);

    const response = await postSync(
      new Request('http://localhost/api/sharepoint/sync', { method: 'POST' })
    );
    const payload = await response.json();

    expect(response.status).toBe(422);
    expect(payload.success).toBe(false);
    expect(syncAllProjects).not.toHaveBeenCalled();
  });

  test('POST /api/sharepoint/sync runs Graph sync when configured', async () => {
    isSharePointConfigured.mockResolvedValue(true);
    syncAllProjects.mockResolvedValue({
      projects_synced: 1,
      files_synced: 3,
      files_failed: 0,
      errors: [],
    });

    const response = await postSync(
      new Request('http://localhost/api/sharepoint/sync', { method: 'POST' })
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.files_synced).toBe(3);
    expect(SharePointConfig.updateSyncStats).toHaveBeenCalled();
  });
});
