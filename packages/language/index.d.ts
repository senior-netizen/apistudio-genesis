export interface Brand {
  productName: string;
  productShortName: string;
  orgName: string;
  tagline: string;
  apiDescription: string;
  authIssuer: string;
  surfaceLabels: Record<string, string>;
  title: (suffix?: string) => string;
  userAgent: (surface?: string) => string;
  sentence: () => string;
}

export declare const brand: Brand;

export type BrandSurface = keyof Brand['surfaceLabels'] | string;
