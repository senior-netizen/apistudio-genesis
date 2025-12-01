export interface DefaultPlanDefinition {
  name: string;
  limits: Record<string, unknown>;
  monthlyPrice: string;
  defaultCredits: number;
}

export const DEFAULT_PLAN_DEFINITIONS: DefaultPlanDefinition[] = [
  {
    name: 'FREE',
    limits: { monthlyCredits: 1000, aiCalls: 200, collections: 3 },
    monthlyPrice: '0',
    defaultCredits: 1000,
  },
  {
    name: 'PRO',
    limits: { monthlyCredits: 10000, aiCalls: 2000, collections: 25, priority: true },
    monthlyPrice: '49',
    defaultCredits: 10000,
  },
  {
    name: 'ENTERPRISE',
    limits: { monthlyCredits: 100000, aiCalls: 'unmetered', collections: 'unlimited', dedicated: true },
    monthlyPrice: '0',
    defaultCredits: 100000,
  },
];

export function getDefaultCreditsForPlan(name: string) {
  return DEFAULT_PLAN_DEFINITIONS.find((plan) => plan.name === name)?.defaultCredits ?? 0;
}
