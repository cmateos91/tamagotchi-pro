import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { validateRegisterInput, validateLoginInput } from '../middleware/validation';
import { AuthResponse, ApiResponse, LoginRequest, RegisterRequest, User, AuthTokens } from '../../../shared/types';

const router = express.Router();

const generateTokens = (userId: string): AuthTokens => {
  const accessToken = jwt.sign(
    { userId },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );
  
  const refreshToken = jwt.sign(
    { userId },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
};

// Registro de usuario
router.post('/register', validateRegisterInput, async (req, res) => {
  try {
    const { username, email, password }: RegisterRequest = req.body;

    // Verificar si el usuario ya existe
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      const response: ApiResponse = {
        success: false,
        error: 'El email o nombre de usuario ya está en uso'
      };
      return res.status(409).json(response);
    }

    // Hash de la contraseña
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Crear usuario
    const userId = uuidv4();
    const result = await pool.query(
      'INSERT INTO users (id, username, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, username, email, created_at, updated_at',
      [userId, username, email, hashedPassword]
    );

    const user: User = result.rows[0];
    const tokens = generateTokens(userId);

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: { user, tokens },
      message: 'Usuario registrado exitosamente'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Error en registro:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Login de usuario
router.post('/login', validateLoginInput, async (req, res) => {
  try {
    const { email, password }: LoginRequest = req.body;

    // Buscar usuario
    const result = await pool.query(
      'SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      const response: ApiResponse = {
        success: false,
        error: 'Credenciales inválidas'
      };
      return res.status(401).json(response);
    }

    const userRow = result.rows[0];

    // Verificar contraseña
    const isValidPassword = await bcrypt.compare(password, userRow.password_hash);
    if (!isValidPassword) {
      const response: ApiResponse = {
        success: false,
        error: 'Credenciales inválidas'
      };
      return res.status(401).json(response);
    }

    // Crear tokens
    const tokens = generateTokens(userRow.id);

    const user: User = {
      id: userRow.id,
      username: userRow.username,
      email: userRow.email,
      createdAt: userRow.created_at,
      updatedAt: userRow.updated_at
    };

    const response: ApiResponse<AuthResponse> = {
      success: true,
      data: { user, tokens },
      message: 'Login exitoso'
    };

    res.json(response);
  } catch (error) {
    console.error('Error en login:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

// Refresh token
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      const response: ApiResponse = {
        success: false,
        error: 'Refresh token requerido'
      };
      return res.status(401).json(response);
    }

    jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET!, (err: any, decoded: any) => {
      if (err) {
        const response: ApiResponse = {
          success: false,
          error: 'Refresh token inválido'
        };
        return res.status(403).json(response);
      }

      const tokens = generateTokens(decoded.userId);
      const response: ApiResponse<AuthTokens> = {
        success: true,
        data: tokens
      };

      res.json(response);
    });
  } catch (error) {
    console.error('Error en refresh:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Error interno del servidor'
    };
    res.status(500).json(response);
  }
});

export default router;

