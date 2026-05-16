import { defineRouting } from 'next-intl/routing';

import { defaultLocale } from './default-locale';
import { locales } from './locales';

// Define the routing configuration for next-intl
export const routing = defineRouting({
  // All supported locales
  locales,

  // Default locale (no prefix in URL)
  defaultLocale,

  // Keep a stable locale prefix in development and production.
  // This prevents single-locale middleware from issuing a self-redirect at `/`.
  localePrefix: 'always',

  // Enable automatic locale detection based on browser headers and cookies
  localeDetection: true,
});

// Export locale types for TypeScript
export type Locale = (typeof routing.locales)[number];
