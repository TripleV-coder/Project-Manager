const mockAcquireTokenByClientCredential = jest.fn();

jest.mock('@azure/msal-node', () => ({
  ConfidentialClientApplication: jest.fn().mockImplementation(() => ({
    acquireTokenByClientCredential: mockAcquireTokenByClientCredential,
  })),
}));

jest.mock('@/models/SharePointConfig', () => ({
  default: { findById: jest.fn() },
}));

jest.mock('@/lib/mongodb', () => ({
  default: jest.fn().mockResolvedValue(undefined),
}));

const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('SharePointService', () => {
  const originalEnv = process.env;
  let sharepointService;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules();
    process.env = { ...originalEnv };
    mockAcquireTokenByClientCredential.mockResolvedValue({ accessToken: 'mock-token' });
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  const setupEnvConfig = () => {
    process.env.SHAREPOINT_TENANT_ID = 'tenant-123';
    process.env.SHAREPOINT_CLIENT_ID = 'client-123';
    process.env.SHAREPOINT_CLIENT_SECRET = 'secret-123';
    process.env.SHAREPOINT_SITE_ID = 'site-123';
    process.env.SHAREPOINT_ENABLED = 'true';
  };

  const loadService = () => {
    return require('../sharepointService');
  };

  const mockGraphResponse = (data, status = 200) => {
    mockFetch.mockResolvedValueOnce({
      ok: status >= 200 && status < 300,
      status,
      json: jest.fn().mockResolvedValue(data),
    });
  };

  describe('isSharePointConfigured', () => {
    it('should return false when not configured', async () => {
      delete process.env.SHAREPOINT_TENANT_ID;
      delete process.env.SHAREPOINT_CLIENT_ID;
      sharepointService = loadService();

      const result = await sharepointService.isSharePointConfigured();

      expect(result).toBe(false);
    });

    it('should return true when env vars are set', async () => {
      setupEnvConfig();
      sharepointService = loadService();

      const result = await sharepointService.isSharePointConfigured();

      expect(result).toBe(true);
    });
  });

  describe('loadConfigFromDB', () => {
    it('should return null when DB config is not found', async () => {
      const SharePointConfig = require('@/models/SharePointConfig').default;
      SharePointConfig.findById.mockReturnValue({
        select: jest.fn().mockResolvedValue(null),
      });
      sharepointService = loadService();

      const result = await sharepointService.loadConfigFromDB(true);

      expect(result).toBeNull();
    });
  });

  describe('testConnectionWithConfig', () => {
    it('should return success with site info', async () => {
      setupEnvConfig();
      sharepointService = loadService();

      mockGraphResponse({
        id: 'site-123',
        displayName: 'Test Site',
        webUrl: 'https://example.sharepoint.com',
      });

      const result = await sharepointService.testConnectionWithConfig({
        tenant_id: 'tenant-123',
        client_id: 'client-123',
        client_secret: 'secret-123',
        site_id: 'site-123',
      });

      expect(result.success).toBe(true);
      expect(result.site.name).toBe('Test Site');
    });

    it('should return error on failure', async () => {
      setupEnvConfig();
      sharepointService = loadService();

      mockGraphResponse({ error: { message: 'Unauthorized' } }, 401);

      const result = await sharepointService.testConnectionWithConfig({
        tenant_id: 'tenant-123',
        client_id: 'client-123',
        client_secret: 'bad-secret',
        site_id: 'site-123',
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('testConnection', () => {
    it('should return error when not configured', async () => {
      delete process.env.SHAREPOINT_TENANT_ID;
      delete process.env.SHAREPOINT_CLIENT_ID;
      sharepointService = loadService();

      const result = await sharepointService.testConnection();

      expect(result.success).toBe(false);
      expect(result.error).toContain('non configuré');
    });
  });

  describe('getSiteInfo', () => {
    it('should return site information', async () => {
      setupEnvConfig();
      sharepointService = loadService();

      mockGraphResponse({ id: 'site-123', displayName: 'My Site' });

      const result = await sharepointService.getSiteInfo();

      expect(result.displayName).toBe('My Site');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/sites/site-123'),
        expect.any(Object)
      );
    });
  });

  describe('listDrives', () => {
    it('should return list of drives', async () => {
      setupEnvConfig();
      sharepointService = loadService();

      mockGraphResponse({ value: [{ id: 'd-1', name: 'Documents' }] });

      const result = await sharepointService.listDrives();

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Documents');
    });
  });

  describe('invalidateConfigCache', () => {
    it('should clear the config cache', () => {
      setupEnvConfig();
      sharepointService = loadService();

      expect(() => sharepointService.invalidateConfigCache()).not.toThrow();
    });
  });
});
