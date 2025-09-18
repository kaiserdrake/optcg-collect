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

    // Updated validation for advanced syntax - now including exact: and category:
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
            code: 'EMPTY_EXACT_VALUE'
        });
    }

    // Check for empty category: values
    const emptyCategoryRegex = /category:(""|''|(?!\S))/;
    if (emptyCategoryRegex.test(sanitizedKeyword)) {
        return res.status(400).json({
            message: "Empty category: search terms are not allowed.",
            code: 'EMPTY_CATEGORY_VALUE'
        });
    }

    // Validate category: values - should be valid card categories
    const categoryRegex = /category:("([^"]+)"|(\S+))/g;
    let categoryMatch;
    const validCategories = ['LEADER', 'CHARACTER', 'EVENT', 'STAGE', 'DON'];

    while ((categoryMatch = categoryRegex.exec(sanitizedKeyword)) !== null) {
        const categoryValue = (categoryMatch[2] || categoryMatch[3]).trim().toUpperCase();
        if (!validCategories.includes(categoryValue)) {
            return res.status(400).json({
                message: `Invalid card category "${categoryValue}". Valid categories are: ${validCategories.join(', ')}`,
                code: 'INVALID_CATEGORY_VALUE'
            });
        }
    }

    // Validate other advanced search keywords
    const keywordRegex = /(\w+):("([^"]+)"|(\S+))/g;
    const validKeywords = ['id', 'pack', 'color', 'exact', 'location', 'category'];
    let keywordMatch;

    while ((keywordMatch = keywordRegex.exec(sanitizedKeyword)) !== null) {
        const keyword = keywordMatch[1].toLowerCase();
        if (!validKeywords.includes(keyword)) {
            return res.status(400).json({
                message: `Unknown search keyword "${keyword}". Valid keywords are: ${validKeywords.join(', ')}`,
                code: 'INVALID_SEARCH_KEYWORD'
            });
        }
    }

    next();
};

export const validateSearchKeyword = (req, res, next) => {
    const { keyword } = req.query;

    if (typeof keyword !== 'string') {
        return res.status(400).json({
            message: "Search keyword must be a string.",
            code: 'INVALID_KEYWORD_TYPE'
        });
    }

    const sanitizedKeyword = keyword.trim();

    // Check for malformed exact: syntax (unclosed quotes)
    const exactMatches = sanitizedKeyword.match(/exact:"[^"]*$/);
    if (exactMatches) {
        return res.status(400).json({
            message: "Malformed exact: search syntax. Please close all quotes.",
            code: 'MALFORMED_EXACT_SYNTAX'
        });
    }

    // Check for empty exact: values
    const emptyExactRegex = /exact:(""|''|(?!\S))/;
    if (emptyExactRegex.test(sanitizedKeyword)) {
        return res.status(400).json({
            message: "Empty exact: search terms are not allowed.",
            code: 'EMPTY_EXACT_VALUE'
        });
    }


    // Check for empty category: values
    const emptyCategoryRegex = /category:(""|''|(?!\S))/;
    if (emptyCategoryRegex.test(sanitizedKeyword)) {
        return res.status(400).json({
            message: "Empty category: search terms are not allowed.",
            code: 'EMPTY_CATEGORY_VALUE'
        });
    }

    // Check for empty cost: values
    const emptyCostRegex = /cost:(""|''|(?!\S))/;
    if (emptyCostRegex.test(sanitizedKeyword)) {
        return res.status(400).json({
            message: "Empty cost: search terms are not allowed.",
            code: 'EMPTY_COST_VALUE'
        });
    }

    // Check for empty tag: values
    const emptyTagRegex = /tag:(""|''|(?!\S))/;
    if (emptyTagRegex.test(sanitizedKeyword)) {
        return res.status(400).json({
            message: "Empty tag: search terms are not allowed.",
            code: 'EMPTY_TAG_VALUE'
        });
    }

    // Validate category: values - should be valid card categories
    const categoryRegex = /category:("([^"]+)"|(\S+))/g;
    let categoryMatch;
    const validCategories = ['LEADER', 'CHARACTER', 'EVENT', 'STAGE', 'DON'];

    while ((categoryMatch = categoryRegex.exec(sanitizedKeyword)) !== null) {
        const categoryValue = (categoryMatch[2] || categoryMatch[3]).trim().toUpperCase();
        if (!validCategories.includes(categoryValue)) {
            return res.status(400).json({
                message: `Invalid card category "${categoryValue}". Valid categories are: ${validCategories.join(', ')}`,
                code: 'INVALID_CATEGORY_VALUE'
            });
        }
    }

    // Validate cost: values - should be valid cost patterns
    const costRegex = /cost:("([^"]+)"|(\S+))/g;
    let costMatch;

    while ((costMatch = costRegex.exec(sanitizedKeyword)) !== null) {
        const costValue = (costMatch[2] || costMatch[3]).trim();

        // Valid patterns: number (5), range (3-5), less than (<5), greater than (>5)
        const validCostPattern = /^(\d+|<\d+|>\d+|\d+-\d+)$/;

        if (!validCostPattern.test(costValue)) {
            return res.status(400).json({
                message: `Invalid cost format "${costValue}". Valid formats: exact number (5), range (3-5), less than (<5), greater than (>5)`,
                code: 'INVALID_COST_FORMAT'
            });
        }

        // Additional validation for ranges
        if (costValue.includes('-')) {
            const [min, max] = costValue.split('-').map(v => parseInt(v.trim()));
            if (isNaN(min) || isNaN(max) || min > max) {
                return res.status(400).json({
                    message: `Invalid cost range "${costValue}". Range should be in format "min-max" where min <= max`,
                    code: 'INVALID_COST_RANGE'
                });
            }
        }
    }

    // Validate tag: values - should be valid tag types
    const tagRegex = /tag:("([^"]+)"|(\S+))/g;
    let tagMatch;
    const validTags = ['favorite', 'want', 'banned', 'restricted'];

    while ((tagMatch = tagRegex.exec(sanitizedKeyword)) !== null) {
        const tagValue = (tagMatch[2] || tagMatch[3]).trim().toLowerCase();
        if (!validTags.includes(tagValue)) {
            return res.status(400).json({
                message: `Invalid tag type "${tagValue}". Valid tags are: ${validTags.join(', ')}`,
                code: 'INVALID_TAG_VALUE'
            });
        }
    }

    // Validate other advanced search keywords
    const keywordRegex = /(\w+):("([^"]+)"|(\S+))/g;
    const validKeywords = ['id', 'pack', 'color', 'exact', 'location', 'category', 'cost', 'tag'];
    let keywordMatch;

    while ((keywordMatch = keywordRegex.exec(sanitizedKeyword)) !== null) {
        const keyword = keywordMatch[1].toLowerCase();
        if (!validKeywords.includes(keyword)) {
            return res.status(400).json({
                message: `Unknown search keyword "${keyword}". Valid keywords are: ${validKeywords.join(', ')}`,
                code: 'INVALID_SEARCH_KEYWORD'
            });
        }
    }

    next();
};
