import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../../../shared/types';

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
  // Mínimo 8 caracteres, al menos una letra y un número
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
  return passwordRegex.test(password);
};

export const validateUsername = (username: string): boolean => {
  // 3-20 caracteres, solo letras, números y guiones bajos
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
};

export const validateRegisterInput = (req: Request, res: Response, next: NextFunction) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    const response: ApiResponse = {
      success: false,
      error: 'Todos los campos son requeridos'
    };
    return res.status(400).json(response);
  }

  if (!validateUsername(username)) {
    const response: ApiResponse = {
      success: false,
      error: 'El nombre de usuario debe tener entre 3-20 caracteres y solo contener letras, números y guiones bajos'
    };
    return res.status(400).json(response);
  }

  if (!validateEmail(email)) {
    const response: ApiResponse = {
      success: false,
      error: 'Formato de email inválido'
    };
    return res.status(400).json(response);
  }

  if (!validatePassword(password)) {
    const response: ApiResponse = {
      success: false,
      error: 'La contraseña debe tener al menos 8 caracteres, incluyendo al menos una letra y un número'
    };
    return res.status(400).json(response);
  }

  next();
};

export const validateLoginInput = (req: Request, res: Response, next: NextFunction) => {
  const { email, password } = req.body;

  if (!email || !password) {
    const response: ApiResponse = {
      success: false,
      error: 'Email y contraseña son requeridos'
    };
    return res.status(400).json(response);
  }

  if (!validateEmail(email)) {
    const response: ApiResponse = {
      success: false,
      error: 'Formato de email inválido'
    };
    return res.status(400).json(response);
  }

  next();
};

export const validateCreatureName = (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.body;

  if (!name || typeof name !== 'string') {
    const response: ApiResponse = {
      success: false,
      error: 'Nombre de criatura requerido'
    };
    return res.status(400).json(response);
  }

  if (name.length < 2 || name.length > 20) {
    const response: ApiResponse = {
      success: false,
      error: 'El nombre debe tener entre 2-20 caracteres'
    };
    return res.status(400).json(response);
  }

  // Permitir letras, números, espacios y algunos caracteres especiales
  const nameRegex = /^[a-zA-Z0-9\s\-_áéíóúñüÁÉÍÓÚÑÜ]{2,20}$/;
  if (!nameRegex.test(name)) {
    const response: ApiResponse = {
      success: false,
      error: 'El nombre contiene caracteres no válidos'
    };
    return res.status(400).json(response);
  }

  next();
};

