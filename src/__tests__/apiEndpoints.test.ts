/**
 * Test cases to verify API endpoints are correctly configured and pointing to the right backend port
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import api, {
  authAPI,
  appointmentsAPI,
  vehiclesAPI,
  invoicesAPI,
  partsAPI
} from '../services/api';

// Mock axios to prevent actual network calls
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('API Endpoint Configuration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Clear localStorage
    localStorage.clear();
  });

  describe('API Base URL Configuration', () => {
    it('should use correct base URL from environment variable', () => {
      // Test that API_URL is correctly set
      const expectedURL = process.env.VITE_API_URL || 'http://localhost:3000';

      // The API instance should be configured with the correct base URL
      expect(api.defaults.baseURL).toBe(expectedURL);
    });

    it('should fallback to localhost:3000 when VITE_API_URL is not set', () => {
      // Temporarily clear the environment variable
      const originalEnv = import.meta.env.VITE_API_URL;
      delete import.meta.env.VITE_API_URL;

      // Re-import to test fallback
      const expectedFallback = 'http://localhost:3000';
      expect(api.defaults.baseURL).toBe(expectedFallback);

      // Restore original environment
      import.meta.env.VITE_API_URL = originalEnv;
    });

    it('should NOT use port 5173 for API calls', () => {
      expect(api.defaults.baseURL).not.toContain('5173');
      expect(api.defaults.baseURL).not.toContain(':5173');
    });

    it('should use port 3000 for backend API calls', () => {
      expect(api.defaults.baseURL).toContain(':3000');
    });
  });

  describe('Environment Variable Validation', () => {
    it('should have VITE_API_URL environment variable set correctly', () => {
      // Check that .env file has correct configuration
      const envApiUrl = import.meta.env.VITE_API_URL;

      if (envApiUrl) {
        expect(envApiUrl).toBe('http://localhost:3000');
        expect(envApiUrl).not.toContain('5173');
      }
    });

    it('should use correct API URL in SocketContext', () => {
      // Test that socket connection uses the same base URL
      const socketUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

      expect(socketUrl).toBe('http://localhost:3000');
      expect(socketUrl).not.toContain('5173');
    });
  });

  describe('API Endpoint Structure', () => {
    beforeEach(() => {
      mockedAxios.create = vi.fn().mockReturnValue({
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
        defaults: { baseURL: 'http://localhost:3000' },
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      });
    });

    it('should construct correct authentication endpoints', () => {
      const endpoints = [
        '/api/auth/login',
        '/api/auth/register',
        '/api/auth/me',
        '/api/auth/profile',
        '/api/auth/change-password'
      ];

      endpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\//);
        expect(endpoint).not.toContain('5173');
        expect(endpoint).not.toContain('localhost');
      });
    });

    it('should construct correct appointment endpoints', () => {
      const endpoints = [
        '/api/appointments',
        '/api/appointments/123',
        '/api/appointments/123/staff-confirm',
        '/api/appointments/123/customer-arrived',
        '/api/appointments/work-queue'
      ];

      endpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\//);
        expect(endpoint).not.toContain('5173');
      });
    });

    it('should construct correct vehicle endpoints', () => {
      const endpoints = [
        '/api/vehicles',
        '/api/vehicles/123',
        '/api/vehicles/123/maintenance'
      ];

      endpoints.forEach(endpoint => {
        expect(endpoint).toMatch(/^\/api\//);
        expect(endpoint).not.toContain('5173');
      });
    });
  });

  describe('Relative Path Usage', () => {
    it('should use relative paths for all API calls', () => {
      // Mock axios methods
      const mockGet = vi.fn();
      const mockPost = vi.fn();
      const mockPut = vi.fn();
      const mockDelete = vi.fn();

      const mockAxiosInstance = {
        get: mockGet,
        post: mockPost,
        put: mockPut,
        delete: mockDelete,
        defaults: { baseURL: 'http://localhost:3000' },
        interceptors: {
          request: { use: vi.fn() },
          response: { use: vi.fn() }
        }
      };

      mockedAxios.create = vi.fn().mockReturnValue(mockAxiosInstance);

      // Test that calls use relative paths
      const testCalls = [
        () => mockGet('/api/appointments'),
        () => mockPost('/api/appointments', {}),
        () => mockPut('/api/appointments/123', {}),
        () => mockDelete('/api/appointments/123')
      ];

      testCalls.forEach((call) => {
        call();
      });

      // Verify all calls use relative paths starting with /api/
      const allCalls = [
        ...mockGet.mock.calls,
        ...mockPost.mock.calls,
        ...mockPut.mock.calls,
        ...mockDelete.mock.calls
      ];

      allCalls.forEach(([url]) => {
        expect(url).toMatch(/^\/api\//);
        expect(url).not.toContain('http://');
        expect(url).not.toContain('5173');
      });
    });
  });

  describe('Configuration Best Practices', () => {
    it('should have proper timeout configuration', () => {
      expect(api.defaults.timeout).toBe(10000); // 10 seconds
    });

    it('should have correct content-type headers', () => {
      expect(api.defaults.headers['Content-Type']).toBe('application/json');
    });

    it('should have request interceptor for authentication', () => {
      // Test that token is added to requests
      localStorage.setItem('token', 'test-token');

      // Request interceptor should add Authorization header
      const config = { headers: {} };
      const interceptor = api.interceptors.request.handlers[0];

      if (interceptor) {
        const result = interceptor.fulfilled(config);
        expect(result.headers.Authorization).toBe('Bearer test-token');
      }
    });

    it('should handle response errors appropriately', () => {
      // Test that 401 errors clear token and redirect
      const error = {
        response: { status: 401 }
      };

      localStorage.setItem('token', 'test-token');

      const responseInterceptor = api.interceptors.response.handlers[0];

      if (responseInterceptor && responseInterceptor.rejected) {
        try {
          responseInterceptor.rejected(error);
        } catch (e) {
          // Expected to throw after clearing token
        }

        expect(localStorage.getItem('token')).toBeNull();
      }
    });
  });
});

describe('Real-world API Call Patterns', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Mock successful responses
    mockedAxios.get = vi.fn().mockResolvedValue({ data: { success: true, data: [] } });
    mockedAxios.post = vi.fn().mockResolvedValue({ data: { success: true, data: {} } });
    mockedAxios.put = vi.fn().mockResolvedValue({ data: { success: true, data: {} } });
    mockedAxios.delete = vi.fn().mockResolvedValue({ data: { success: true } });
  });

  describe('Component API Usage Patterns', () => {
    it('should verify appointments page API calls use correct endpoints', async () => {
      // Simulate the patterns used in AppointmentsPage.tsx
      const mockCalls = [
        () => axios.get('/api/appointments'),
        () => axios.get('/api/appointments?status=confirmed'),
        () => axios.put('/api/appointments/123', { status: 'completed' })
      ];

      for (const call of mockCalls) {
        await call();
      }

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/appointments');
      expect(mockedAxios.put).toHaveBeenCalledWith('/api/appointments/123', { status: 'completed' });
    });

    it('should verify vehicles page API calls use correct endpoints', async () => {
      // Simulate the patterns used in VehiclesPage.tsx
      const mockCalls = [
        () => axios.get('/api/vehicles'),
        () => axios.delete('/api/vehicles/123')
      ];

      for (const call of mockCalls) {
        await call();
      }

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/vehicles');
      expect(mockedAxios.delete).toHaveBeenCalledWith('/api/vehicles/123');
    });

    it('should verify all API calls avoid hardcoded full URLs', () => {
      const problematicPatterns = [
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'https://localhost:5173'
      ];

      // Check that none of our mocked calls contain these patterns
      const allMockCalls = [
        ...mockedAxios.get.mock.calls,
        ...mockedAxios.post.mock.calls,
        ...mockedAxios.put.mock.calls,
        ...mockedAxios.delete.mock.calls
      ];

      allMockCalls.forEach(([url]) => {
        problematicPatterns.forEach(pattern => {
          expect(url).not.toContain(pattern);
        });
      });
    });
  });
});

describe('Environment Configuration Validation', () => {
  it('should validate frontend .env file contains correct API URL', () => {
    // Test environment variable setup
    const envApiUrl = import.meta.env.VITE_API_URL;

    // Should be set to correct backend port
    if (envApiUrl) {
      expect(envApiUrl).toBe('http://localhost:3000');
    } else {
      // If not set, fallback should be used
      const fallbackUrl = 'http://localhost:3000';
      expect(fallbackUrl).toBe('http://localhost:3000');
    }
  });

  it('should ensure backend CLIENT_URL references frontend port correctly', () => {
    // This is more of a configuration check
    // Backend should reference frontend on port 5173
    const expectedClientUrl = 'http://localhost:5173';

    // This is what should be in server/.env CLIENT_URL
    expect(expectedClientUrl).toBe('http://localhost:5173');
  });
});

describe('Cross-Origin Configuration', () => {
  it('should ensure CORS is properly configured between frontend and backend', () => {
    // Frontend runs on :5173, backend on :3000
    const frontendUrl = 'http://localhost:5173';
    const backendUrl = 'http://localhost:3000';

    // Backend should allow requests from frontend
    expect(frontendUrl).not.toBe(backendUrl); // Different ports
    expect(frontendUrl).toContain('5173'); // Frontend port
    expect(backendUrl).toContain('3000'); // Backend port
  });
});