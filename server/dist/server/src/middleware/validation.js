"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateCreatureName = exports.validateLoginInput = exports.validateRegisterInput = exports.validateUsername = exports.validatePassword = exports.validateEmail = void 0;
const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};
exports.validateEmail = validateEmail;
const validatePassword = (password) => {
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
};
exports.validatePassword = validatePassword;
const validateUsername = (username) => {
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    return usernameRegex.test(username);
};
exports.validateUsername = validateUsername;
const validateRegisterInput = (req, res, next) => {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
        const response = {
            success: false,
            error: 'Todos los campos son requeridos'
        };
        return res.status(400).json(response);
    }
    if (!(0, exports.validateUsername)(username)) {
        const response = {
            success: false,
            error: 'El nombre de usuario debe tener entre 3-20 caracteres y solo contener letras, números y guiones bajos'
        };
        return res.status(400).json(response);
    }
    if (!(0, exports.validateEmail)(email)) {
        const response = {
            success: false,
            error: 'Formato de email inválido'
        };
        return res.status(400).json(response);
    }
    if (!(0, exports.validatePassword)(password)) {
        const response = {
            success: false,
            error: 'La contraseña debe tener al menos 8 caracteres, incluyendo al menos una letra y un número'
        };
        return res.status(400).json(response);
    }
    next();
};
exports.validateRegisterInput = validateRegisterInput;
const validateLoginInput = (req, res, next) => {
    const { email, password } = req.body;
    if (!email || !password) {
        const response = {
            success: false,
            error: 'Email y contraseña son requeridos'
        };
        return res.status(400).json(response);
    }
    if (!(0, exports.validateEmail)(email)) {
        const response = {
            success: false,
            error: 'Formato de email inválido'
        };
        return res.status(400).json(response);
    }
    next();
};
exports.validateLoginInput = validateLoginInput;
const validateCreatureName = (req, res, next) => {
    const { name } = req.body;
    if (!name || typeof name !== 'string') {
        const response = {
            success: false,
            error: 'Nombre de criatura requerido'
        };
        return res.status(400).json(response);
    }
    if (name.length < 2 || name.length > 20) {
        const response = {
            success: false,
            error: 'El nombre debe tener entre 2-20 caracteres'
        };
        return res.status(400).json(response);
    }
    const nameRegex = /^[a-zA-Z0-9\s\-_áéíóúñüÁÉÍÓÚÑÜ]{2,20}$/;
    if (!nameRegex.test(name)) {
        const response = {
            success: false,
            error: 'El nombre contiene caracteres no válidos'
        };
        return res.status(400).json(response);
    }
    next();
};
exports.validateCreatureName = validateCreatureName;
//# sourceMappingURL=validation.js.map