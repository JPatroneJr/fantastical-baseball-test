import { cn } from '@kit/ui/utils';

/**
 * Keep font variables local so production builds do not depend on fetching
 * Google Fonts during `next build`.
 */
const sans = {
  variable: 'font-sans',
};

const heading = {
  variable: 'font-heading',
};

export { sans, heading };

/**
 * @name getFontsClassName
 * @description Get the class name for the root layout.
 * @param theme
 */
export function getFontsClassName(theme?: string) {
  const dark = theme === 'dark';
  const light = !dark;
  const font = [sans.variable, heading.variable];

  return cn(...font, {
    dark,
    light,
  });
}
