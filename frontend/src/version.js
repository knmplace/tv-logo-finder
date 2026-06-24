export const APP_VERSION = '1.0.2';
export const APP_NAME = 'TV Logo Finder';
export const BUILD_CHANNEL = import.meta.env.VITE_BUILD_CHANNEL || 'stable';
export const IS_BETA = BUILD_CHANNEL === 'beta';
export const BUILD_VERSION = import.meta.env.VITE_BUILD_VERSION || '';
export const DISPLAY_VERSION = BUILD_VERSION || (IS_BETA ? `${APP_VERSION}-beta` : APP_VERSION);
