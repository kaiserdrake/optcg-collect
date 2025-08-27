// Input validation middleware and utilities

export const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password) => {
    // At least 8 characters, contains letter and number
    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d@$!%*#?&]{8,}$/;
    return passwordRegex.test(password);
};

export const validateUsername = (username) => {
    // Alphanumeric and underscore, 3-30 characters
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    return usernameRegex.test(username);
};

export const sanitizeString = (str, maxLength = 255) => {
    if (typeof str !== 'string') return null;
    return str.trim().substring(0, maxLength);
};

export const validateLoginInput = (req, res, next) => {
    const { usernameOrEmail, password } = req.body;

    if (!usernameOrEmail || typeof usernameOrEmail !== 'string') {
        return res.status(400).json({
            message: "Username or email is required and must be a string.",
            code: 'INVALID_USERNAME_EMAIL'
        });
    }

    if (!password || typeof password !== 'string') {
        return res.status(400).json({
            message: "Password is required and must be a string.",
            code: 'INVALID_PASSWORD'
        });
    }

    if (usernameOrEmail.length > 255 || password.length > 255) {
        return res.status(400).json({
            message: "Input too long.",
            code: 'INPUT_TOO_LONG'
        });
    }

    next();
};

export const validateUserCreation = (req, res, next) => {
    const { email, name, role } = req.body;

    if (!email || !validateEmail(email)) {
        return res.status(400).json({
            message: "Valid email is required.",
            code: 'INVALID_EMAIL'
        });
    }

    if (!name || !validateUsername(name)) {
        return res.status(400).json({
            message: "Username must be 3-30 characters and contain only letters, numbers, and underscores.",
            code: 'INVALID_USERNAME'
        });
    }

    if (!role || !['Admin', 'Normal User'].includes(role)) {
        return res.status(400).json({
            message: "Role must be either 'Admin' or 'Normal User'.",
            code: 'INVALID_ROLE'
        });
    }

    next();
};

export const validatePasswordChange = (req, res, next) => {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || typeof currentPassword !== 'string') {
        return res.status(400).json({
            message: "Current password is required.",
            code: 'MISSING_CURRENT_PASSWORD'
        });
    }

    if (!newPassword || !validatePassword(newPassword)) {
        return res.status(400).json({
            message: "New password must be at least 8 characters long and contain at least one letter and one number.",
            code: 'INVALID_NEW_PASSWORD'
        });
    }

    if (currentPassword === newPassword) {
        return res.status(400).json({
            message: "New password must be different from current password.",
            code: 'PASSWORD_UNCHANGED'
        });
    }

    next();
};

export const validateCollectionUpdate = (req, res, next) => {
    const { card_id, type, action } = req.body;

    if (!card_id || typeof card_id !== 'string') {
        return res.status(400).json({
            message: "card_id is required and must be a string.",
            code: 'INVALID_CARD_ID'
        });
    }

    if (!type || !['owned', 'proxy'].includes(type)) {
        return res.status(400).json({
            message: "type must be either 'owned' or 'proxy'.",
            code: 'INVALID_TYPE'
        });
    }

    if (!action || !['increment', 'decrement'].includes(action)) {
        return res.status(400).json({
            message: "action must be either 'increment' or 'decrement'.",
            code: 'INVALID_ACTION'
        });
    }

    // Sanitize card_id to prevent potential issues
    if (card_id.length > 255) {
        return res.status(400).json({
            message: "card_id is too long.",
            code: 'CARD_ID_TOO_LONG'
        });
    }

    next();
};

export const validateSearchQuery = (req, res, next) => {
    const { keyword, ownedOnly, showProxies } = req.query;

    if (!keyword || typeof keyword !== 'string') {
        return res.status(400).json({
            message: "Search keyword is required and must be a string.",
            code: 'INVALID_KEYWORD'
        });
    }

    const sanitizedKeyword = keyword.trim();
    if (sanitizedKeyword.length === 0) {
        return res.status(400).json({
            message: "Search keyword cannot be empty.",
            code: 'EMPTY_KEYWORD'
        });
    }

    if (sanitizedKeyword.length > 500) {
        return res.status(400).json({
            message: "Search keyword is too long.",
            code: 'KEYWORD_TOO_LONG'
        });
    }

    // Updated validation for advanced syntax - now including exact:
    // Check for malformed exact: syntax (unclosed quotes)
    const exactQuoteRegex = /exact:"[^"]*$/;
    if (exactQuoteRegex.test(sanitizedKeyword)) {
        return res.status(400).json({
            message: "Unclosed quotes in exact: syntax. Please close all quotes.",
            code: 'MALFORMED_EXACT_SYNTAX'
        });
    }

    // Check for empty exact: values
    const emptyExactRegex = /exact:(""|''|(?!\S))/;
    if (emptyExactRegex.test(sanitizedKeyword)) {
        return res.status(400).json({
            message: "Empty exact: search terms are not allowed.",
            code: 'EMPTY_EXACT_TERM'
        });
    }

    // Validate that advanced syntax doesn't contain dangerous characters
    const advancedSyntaxRegex = /(id|pack|color|exact):("[^"]*"|[^\s]*)/gi;
    let match;
    while ((match = advancedSyntaxRegex.exec(sanitizedKeyword)) !== null) {
        const value = match[2];
        // Check for potential SQL injection patterns
        if (/[';--]/g.test(value)) {
            return res.status(400).json({
                message: "Invalid characters in search syntax.",
                code: 'INVALID_SYNTAX_CHARACTERS'
            });
        }
    }

    // Validate boolean query parameters
    if (ownedOnly && !['true', 'false'].includes(ownedOnly)) {
        return res.status(400).json({
            message: "ownedOnly must be 'true' or 'false'.",
            code: 'INVALID_OWNED_ONLY'
        });
    }

    if (showProxies && !['true', 'false'].includes(showProxies)) {
        return res.status(400).json({
            message: "showProxies must be 'true' or 'false'.",
            code: 'INVALID_SHOW_PROXIES'
        });
    }

    // Set sanitized keyword back to query
    req.query.keyword = sanitizedKeyword;
    next();
};
