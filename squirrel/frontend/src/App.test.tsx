import { describe, expect, it } from 'vitest';

import { appRoutes, auxiliaryRoutes } from './routes/routeConfig';
import ForgeDesignerPage from './pages/ForgeDesignerPage';

describe('App route configuration', () => {
  it('exposes the Copilot workspace under the /copilot path', () => {
    const copilotRoute = auxiliaryRoutes.find((route) => route.path === '/copilot');
    const aiRoute = appRoutes.find((route) => route.path === '/ai');
    expect(copilotRoute).toBeDefined();
    expect(aiRoute).toBeDefined();
    expect(copilotRoute?.element).toBeDefined();
    expect((copilotRoute?.element as JSX.Element).type).toBe((aiRoute?.element as JSX.Element).type);
  });

  it('registers the Forge Designer view in the primary navigation', () => {
    const forgeRoute = appRoutes.find((route) => route.path === '/forge');
    expect(forgeRoute).toBeDefined();
    expect((forgeRoute?.element as JSX.Element).type).toBe(ForgeDesignerPage);
    expect(forgeRoute?.group).toBe('Build');
  });
});
