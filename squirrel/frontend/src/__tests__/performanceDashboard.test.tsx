import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PerformanceDashboard from '../components/PerformanceDashboard';

vi.mock('../services/api', () => ({
  api: {
    get: vi.fn(),
  },
}));

const { api } = await import('../services/api');

describe('PerformanceDashboard', () => {
  afterEach(() => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockReset();
  });

  it('renders empty state when no metrics are returned', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: [] });
    render(<PerformanceDashboard />);
    await waitFor(() => expect(screen.getByText(/No traffic recorded yet/)).toBeInTheDocument());
  });

  it('shows error message when backend fails', async () => {
    (api.get as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('boom'));
    render(<PerformanceDashboard />);
    await waitFor(() => expect(screen.getByText(/Unable to load performance metrics/)).toBeInTheDocument());
  });
});
