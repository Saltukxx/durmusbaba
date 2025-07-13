const logger = require('./logger');

/**
 * Centralized Error Handler for Consistent Bot Responses
 * Ensures all errors are handled uniformly with proper multilingual messages
 */

class ChatbotError extends Error {
    constructor(message, code = 'GENERAL_ERROR', language = 'en') {
        super(message);
        this.name = 'ChatbotError';
        this.code = code;
        this.language = language;
        this.timestamp = new Date().toISOString();
    }

    getLocalizedMessage() {
        return getErrorMessage(this.code, this.language);
    }
}

// Error message templates in multiple languages
const ERROR_MESSAGES = {
    GENERAL_ERROR: {
        en: "I'm sorry, I encountered an unexpected error. Please try again.",
        tr: "Üzgünüm, beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.",
        de: "Entschuldigung, es ist ein unerwarteter Fehler aufgetreten. Bitte versuchen Sie es erneut."
    },
    INVALID_INPUT: {
        en: "❌ Please provide a valid input. Type 'help' for assistance.",
        tr: "❌ Lütfen geçerli bir giriş yapın. Yardım için 'help' yazın.",
        de: "❌ Bitte geben Sie eine gültige Eingabe ein. Geben Sie 'help' für Hilfe ein."
    },
    SESSION_ERROR: {
        en: "❌ Session error occurred. Please start over with 'restart'.",
        tr: "❌ Oturum hatası oluştu. Lütfen 'restart' ile yeniden başlayın.",
        de: "❌ Sitzungsfehler aufgetreten. Bitte starten Sie mit 'restart' neu."
    },
    API_ERROR: {
        en: "❌ Service temporarily unavailable. Please try again later.",
        tr: "❌ Servis geçici olarak kullanılamıyor. Lütfen daha sonra tekrar deneyin.",
        de: "❌ Service vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut."
    },
    CALCULATION_ERROR: {
        en: "❌ Error performing calculation. Please check your inputs and try again.",
        tr: "❌ Hesaplama hatası. Lütfen girişlerinizi kontrol edin ve tekrar deneyin.",
        de: "❌ Fehler bei der Berechnung. Bitte überprüfen Sie Ihre Eingaben und versuchen Sie es erneut."
    },
    FLOW_CONFLICT: {
        en: "❌ Another process is active. Please complete it first or type 'cancel'.",
        tr: "❌ Başka bir işlem aktif. Lütfen önce onu tamamlayın veya 'iptal' yazın.",
        de: "❌ Ein anderer Prozess ist aktiv. Bitte beenden Sie ihn zuerst oder geben Sie 'abbrechen' ein."
    }
};

/**
 * Get localized error message
 * @param {string} errorCode - Error code
 * @param {string} language - Language code
 * @returns {string} - Localized error message
 */
function getErrorMessage(errorCode, language = 'en') {
    const errorTemplate = ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.GENERAL_ERROR;
    return errorTemplate[language] || errorTemplate.en;
}

/**
 * Handle and log errors consistently
 * @param {Error|ChatbotError} error - Error object
 * @param {Object} session - User session
 * @param {string} context - Context where error occurred
 * @returns {string} - Appropriate error message for user
 */
function handleError(error, session = null, context = 'general') {
    const language = session?.preferences?.language || 'en';
    
    // Log the error with context
    logger.error(`Error in ${context}:`, {
        message: error.message,
        code: error.code || 'UNKNOWN',
        userId: session?.userId || 'unknown',
        stack: error.stack
    });

    // If it's already a ChatbotError, return its localized message
    if (error instanceof ChatbotError) {
        return error.getLocalizedMessage();
    }

    // Map common error types to appropriate codes
    let errorCode = 'GENERAL_ERROR';
    
    if (error.message.includes('timeout') || error.message.includes('network')) {
        errorCode = 'API_ERROR';
    } else if (error.message.includes('validation') || error.message.includes('invalid')) {
        errorCode = 'INVALID_INPUT';
    } else if (error.message.includes('session') || error.message.includes('state')) {
        errorCode = 'SESSION_ERROR';
    } else if (error.message.includes('calculation') || error.message.includes('compute')) {
        errorCode = 'CALCULATION_ERROR';
    }

    return getErrorMessage(errorCode, language);
}

/**
 * Create a safe wrapper for async functions
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context for error logging
 * @returns {Function} - Wrapped function with error handling
 */
function safeAsync(fn, context = 'operation') {
    return async (...args) => {
        try {
            return await fn(...args);
        } catch (error) {
            const session = args.find(arg => arg && arg.userId) || null;
            const errorMessage = handleError(error, session, context);
            throw new ChatbotError(errorMessage, 'SAFE_WRAPPER_ERROR', session?.preferences?.language || 'en');
        }
    };
}

/**
 * Validate session state and throw appropriate error if invalid
 * @param {Object} session - User session
 * @param {string} requiredFlow - Required active flow (optional)
 */
function validateSession(session, requiredFlow = null) {
    if (!session || !session.userId) {
        throw new ChatbotError('Invalid session', 'SESSION_ERROR');
    }

    if (requiredFlow && session.activeFlow !== requiredFlow) {
        throw new ChatbotError('Flow conflict detected', 'FLOW_CONFLICT');
    }
}

/**
 * Create flow conflict error when user tries to start new flow while another is active
 * @param {Object} session - User session
 * @param {string} newFlowType - Type of flow user is trying to start
 * @returns {ChatbotError} - Flow conflict error
 */
function createFlowConflictError(session, newFlowType) {
    const language = session?.preferences?.language || 'en';
    return new ChatbotError('Flow conflict', 'FLOW_CONFLICT', language);
}

module.exports = {
    ChatbotError,
    handleError,
    getErrorMessage,
    safeAsync,
    validateSession,
    createFlowConflictError
};