/**
 * Main API exports with feature flag support.
 * Allows gradual migration from v1 to v2 APIs.
 */

// Feature flag for API version
const USE_V2_API = import.meta.env.VITE_USE_V2_API === 'true' || 
                   localStorage.getItem('use_v2_api') === 'true';

// Export v2 as default for now (can be toggled via feature flag)
export * from './v2';

// Also export both versions explicitly
export * as apiV1 from './v2'; // v1 not yet created, using v2 for both
export * as apiV2 from './v2';

// Re-export shared utilities
export * from './shared/baseClient';

// Export flag for runtime checks
export const isUsingV2Api = USE_V2_API;

