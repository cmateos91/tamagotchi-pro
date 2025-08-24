"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const uuid_1 = require("uuid");
const database_1 = __importDefault(require("../config/database"));
const validation_1 = require("../middleware/validation");
const router = express_1.default.Router();
const generateTokens = (userId) => {
    const accessToken = jsonwebtoken_1.default.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const refreshToken = jsonwebtoken_1.default.sign({ userId }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    return { accessToken, refreshToken };
};
router.post('/register', validation_1.validateRegisterInput, async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await database_1.default.query('SELECT id FROM users WHERE email = $1 OR username = $2', [email, username]);
        if (existingUser.rows.length > 0) {
            const response = {
                success: false,
                error: 'El email o nombre de usuario ya está en uso'
            };
            return res.status(409).json(response);
        }
        const saltRounds = 12;
        const hashedPassword = await bcryptjs_1.default.hash(password, saltRounds);
        const userId = (0, uuid_1.v4)();
        const result = await database_1.default.query('INSERT INTO users (id, username, email, password_hash, created_at, updated_at) VALUES ($1, $2, $3, $4, NOW(), NOW()) RETURNING id, username, email, created_at, updated_at', [userId, username, email, hashedPassword]);
        const user = result.rows[0];
        const tokens = generateTokens(userId);
        const response = {
            success: true,
            data: { user, tokens },
            message: 'Usuario registrado exitosamente'
        };
        res.status(201).json(response);
    }
    catch (error) {
        console.error('Error en registro:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.post('/login', validation_1.validateLoginInput, async (req, res) => {
    try {
        const { email, password } = req.body;
        const result = await database_1.default.query('SELECT id, username, email, password_hash, created_at, updated_at FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            const response = {
                success: false,
                error: 'Credenciales inválidas'
            };
            return res.status(401).json(response);
        }
        const userRow = result.rows[0];
        const isValidPassword = await bcryptjs_1.default.compare(password, userRow.password_hash);
        if (!isValidPassword) {
            const response = {
                success: false,
                error: 'Credenciales inválidas'
            };
            return res.status(401).json(response);
        }
        const tokens = generateTokens(userRow.id);
        const user = {
            id: userRow.id,
            username: userRow.username,
            email: userRow.email,
            createdAt: userRow.created_at,
            updatedAt: userRow.updated_at
        };
        const response = {
            success: true,
            data: { user, tokens },
            message: 'Login exitoso'
        };
        res.json(response);
    }
    catch (error) {
        console.error('Error en login:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            const response = {
                success: false,
                error: 'Refresh token requerido'
            };
            return res.status(401).json(response);
        }
        jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
            if (err) {
                const response = {
                    success: false,
                    error: 'Refresh token inválido'
                };
                return res.status(403).json(response);
            }
            const tokens = generateTokens(decoded.userId);
            const response = {
                success: true,
                data: tokens
            };
            res.json(response);
        });
    }
    catch (error) {
        console.error('Error en refresh:', error);
        const response = {
            success: false,
            error: 'Error interno del servidor'
        };
        res.status(500).json(response);
    }
});
exports.default = router;
//# sourceMappingURL=auth.js.map