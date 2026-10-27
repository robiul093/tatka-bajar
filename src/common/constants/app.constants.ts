export const APP_CONSTANTS = {
  // Pagination
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,

  // File Upload
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_IMAGE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  ALLOWED_VIDEO_TYPES: ['video/mp4', 'video/webm'],
  ALLOWED_DOCUMENT_TYPES: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],

  // Authentication
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
  MAX_LOGIN_ATTEMPTS: 5,
  ACCOUNT_LOCK_DURATION_MINUTES: 30,
  JWT_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',

  // Rate Limiting
  RATE_LIMIT_WINDOW: 60, // seconds
  RATE_LIMIT_MAX: 100, // requests

  // Caching
  CACHE_TTL_SHORT: 300, // 5 minutes
  CACHE_TTL_MEDIUM: 3600, // 1 hour
  CACHE_TTL_LONG: 86400, // 24 hours
};

/**
 * Cache Keys
 */
export const CACHE_KEYS = {
  USER: (id: string) => `user:${id}`,
  PROFILE: (id: string) => `profile:${id}`,
};

/**
 * Queue Names
 */
export const QUEUE_NAMES = {
  EMAIL: 'email',
  NOTIFICATION: 'notification',
};

/**
 * Event Names
 */
export const EVENTS = {
  USER_REGISTERED: 'user.registered',
  USER_VERIFIED: 'user.verified',
  PASSWORD_RESET: 'password.reset',
};
