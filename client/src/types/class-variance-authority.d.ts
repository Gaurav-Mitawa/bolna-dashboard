declare module 'class-variance-authority' {
  export interface CVAConfig {
    [key: string]: {
      [key: string]: string | Record<string, string>;
    };
  }

  export interface CVAVariants {
    [key: string]: string | Record<string, string>;
  }

  export function cva(
    base?: string | string[],
    config?: CVAConfig
  ): (props?: Record<string, any>) => string;

  export const cx: (...args: any[]) => string;
}
