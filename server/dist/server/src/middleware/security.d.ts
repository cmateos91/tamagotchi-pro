import { Request, Response, NextFunction } from 'express';
export declare const authLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const apiLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const battleLimiter: import("express-rate-limit").RateLimitRequestHandler;
export declare const sanitizeInput: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityLogger: (req: Request, res: Response, next: NextFunction) => void;
export declare const validateContentType: (req: Request, res: Response, next: NextFunction) => Response<any, Record<string, any>> | undefined;
export declare const preventTimingAttacks: (req: Request, res: Response, next: NextFunction) => void;
export declare const securityHeaders: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=security.d.ts.map