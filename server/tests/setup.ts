import dotenv from 'dotenv';

// Cargar variables de entorno para testing
dotenv.config({ path: '.env.test' });

// Configurar timeout global para tests
jest.setTimeout(10000);

// Mock de console para tests más limpios
global.console = {
  ...console,
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Configuración global para tests
beforeAll(async () => {
  // Configuración inicial si es necesaria
});

afterAll(async () => {
  // Limpieza global
});

beforeEach(() => {
  // Limpiar mocks antes de cada test
  jest.clearAllMocks();
});

afterEach(() => {
  // Limpieza después de cada test
});

