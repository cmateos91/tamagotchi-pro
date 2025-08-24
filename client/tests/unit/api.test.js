// Mock del módulo API
const mockApi = {
  baseURL: 'http://localhost:3000/api',
  
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    };

    if (config.body && typeof config.body === 'object') {
      config.body = JSON.stringify(config.body);
    }

    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }

    return data;
  },

  // Métodos de autenticación
  async register(userData) {
    return this.request('/auth/register', {
      method: 'POST',
      body: userData
    });
  },

  async login(credentials) {
    return this.request('/auth/login', {
      method: 'POST',
      body: credentials
    });
  },

  async logout() {
    const token = localStorage.getItem('accessToken');
    return this.request('/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  // Métodos de criaturas
  async getCreatures() {
    const token = localStorage.getItem('accessToken');
    return this.request('/creatures', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
  },

  async createCreature(creatureData) {
    const token = localStorage.getItem('accessToken');
    return this.request('/creatures', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: creatureData
    });
  },

  async feedCreature(creatureId, foodType = 'basic') {
    const token = localStorage.getItem('accessToken');
    return this.request(`/creatures/${creatureId}/feed`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: { foodType }
    });
  }
};

describe('API Client', () => {
  beforeEach(() => {
    // Mock successful responses por defecto
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: {} })
    });
  });

  describe('Authentication', () => {
    it('should register user successfully', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      };

      const mockResponse = {
        success: true,
        data: {
          user: { id: '123', username: 'testuser', email: 'test@example.com' },
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token'
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mockApi.register(userData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/register',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json'
          }),
          body: JSON.stringify(userData)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should login user successfully', async () => {
      const credentials = {
        username: 'testuser',
        password: 'password123'
      };

      const mockResponse = {
        success: true,
        data: {
          user: { id: '123', username: 'testuser' },
          accessToken: 'mock-token',
          refreshToken: 'mock-refresh-token'
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mockApi.login(credentials);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/login',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(credentials)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle login failure', async () => {
      const credentials = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Credenciales inválidas'
        })
      });

      await expect(mockApi.login(credentials)).rejects.toThrow('Credenciales inválidas');
    });

    it('should logout with token', async () => {
      localStorage.setItem('accessToken', 'mock-token');

      const mockResponse = {
        success: true,
        message: 'Sesión cerrada exitosamente'
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mockApi.logout();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/auth/logout',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );

      expect(result).toEqual(mockResponse);
    });
  });

  describe('Creatures', () => {
    beforeEach(() => {
      localStorage.setItem('accessToken', 'mock-token');
    });

    it('should get creatures list', async () => {
      const mockCreatures = [
        {
          id: '123',
          name: 'Sparky',
          species: 'voltus',
          stage: 'baby',
          stats: { hunger: 80, happiness: 70 }
        }
      ];

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: mockCreatures
        })
      });

      const result = await mockApi.getCreatures();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/creatures',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          })
        })
      );

      expect(result.data).toEqual(mockCreatures);
    });

    it('should create new creature', async () => {
      const creatureData = {
        name: 'Sparky',
        species: 'voltus'
      };

      const mockResponse = {
        success: true,
        data: {
          id: '123',
          name: 'Sparky',
          species: 'voltus',
          stage: 'egg',
          stats: { hunger: 80, happiness: 70 }
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mockApi.createCreature(creatureData);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/creatures',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          }),
          body: JSON.stringify(creatureData)
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should feed creature', async () => {
      const creatureId = '123';
      const foodType = 'premium';

      const mockResponse = {
        success: true,
        data: {
          stats: { hunger: 95, happiness: 75 },
          experience: 105
        }
      };

      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse
      });

      const result = await mockApi.feedCreature(creatureId, foodType);

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/creatures/123/feed',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer mock-token'
          }),
          body: JSON.stringify({ foodType })
        })
      );

      expect(result).toEqual(mockResponse);
    });

    it('should handle unauthorized requests', async () => {
      localStorage.removeItem('accessToken');

      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Token no proporcionado'
        })
      });

      await expect(mockApi.getCreatures()).rejects.toThrow('Token no proporcionado');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      fetch.mockRejectedValueOnce(new Error('Network error'));

      await expect(mockApi.getCreatures()).rejects.toThrow('Network error');
    });

    it('should handle server errors', async () => {
      fetch.mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          success: false,
          error: 'Error interno del servidor'
        })
      });

      await expect(mockApi.getCreatures()).rejects.toThrow('Error interno del servidor');
    });

    it('should handle malformed JSON responses', async () => {
      fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => {
          throw new Error('Invalid JSON');
        }
      });

      await expect(mockApi.getCreatures()).rejects.toThrow('Invalid JSON');
    });
  });

  describe('Request Configuration', () => {
    it('should set correct headers', async () => {
      localStorage.setItem('accessToken', 'test-token');

      await mockApi.getCreatures();

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          })
        })
      );
    });

    it('should stringify request body', async () => {
      const userData = { username: 'test', password: 'pass' };

      await mockApi.register(userData);

      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify(userData)
        })
      );
    });

    it('should construct correct URLs', async () => {
      await mockApi.getCreatures();

      expect(fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/creatures',
        expect.any(Object)
      );
    });
  });
});

