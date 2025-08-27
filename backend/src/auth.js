import jwt from 'jsonwebtoken';

// Validate JWT secret on startup
if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
    console.error('ERROR: JWT_SECRET must be set and at least 32 characters long');
    process.exit(1);
}

export const isAuthenticated = (req, res, next) => {
    const token = req.cookies.token;

    if (!token) {
        return res.status(401).json({
            message: 'Access denied. No token provided.',
            code: 'NO_TOKEN'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Validate token payload
        if (!decoded.id || !decoded.email || !decoded.role) {
            return res.status(401).json({
                message: 'Invalid token payload.',
                code: 'INVALID_TOKEN_PAYLOAD'
            });
        }

        req.user = decoded;
        next();
    } catch (ex) {
        console.error('Token verification error:', ex.message);

        // Clear invalid cookie
        res.clearCookie('token');

        let message = 'Invalid token.';
        let code = 'INVALID_TOKEN';

        if (ex.name === 'TokenExpiredError') {
            message = 'Token has expired.';
            code = 'TOKEN_EXPIRED';
        } else if (ex.name === 'JsonWebTokenError') {
            message = 'Malformed token.';
            code = 'MALFORMED_TOKEN';
        }

        res.status(401).json({ message, code });
    }
};

export const isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'Admin') {
        next();
    } else {
        res.status(403).json({
            message: 'Forbidden: Requires admin privileges.',
            code: 'INSUFFICIENT_PRIVILEGES'
        });
    }
};

// Optional: Rate limiting middleware for auth endpoints
export const createAuthRateLimit = () => {
    const attempts = new Map();
    const maxAttempts = 5;
    const windowMs = 15 * 60 * 1000; // 15 minutes

    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        // Clean old attempts
        for (const [key, data] of attempts.entries()) {
            if (now - data.firstAttempt > windowMs) {
                attempts.delete(key);
            }
        }

        const userAttempts = attempts.get(ip) || { count: 0, firstAttempt: now };

        if (userAttempts.count >= maxAttempts) {
            return res.status(429).json({
                message: 'Too many login attempts. Please try again later.',
                code: 'RATE_LIMITED'
            });
        }

        // Increment on failed login (call this in login route)
        req.incrementLoginAttempts = () => {
            userAttempts.count++;
            attempts.set(ip, userAttempts);
        };

        // Reset on successful login
        req.resetLoginAttempts = () => {
            attempts.delete(ip);
        };

        next();
    };
};
