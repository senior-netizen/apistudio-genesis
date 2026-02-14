import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import NotificationsDrawer from '../components/NotificationsDrawer';

const describeWithDom = typeof document === 'undefined' ? describe.skip : describe;

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const { api } = await import('../services/api');

describeWithDom('NotificationsDrawer', () => {
  afterEach(() => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('renders backend notifications', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [{ id: 'n1', title: 'Hello', body: 'World', channel: 'alerts', createdAt: new Date().toISOString() }],
    });
    render(<NotificationsDrawer open />);
    await waitFor(() => expect(screen.getByText('Hello')).toBeInTheDocument());
  });

  it('shows caught up message when empty', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({ data: [] });
    render(<NotificationsDrawer open />);
    await waitFor(() => expect(screen.getByText(/caught up/i)).toBeInTheDocument());
  });
});
