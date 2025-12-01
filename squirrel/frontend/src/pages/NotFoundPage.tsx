import { Button, Card } from '@sdl/ui';
import { useNavigate } from 'react-router-dom';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <Card className="border border-red-500/40 bg-red-500/10 p-8 text-center text-red-900 dark:text-red-200">
      <h1 className="text-2xl font-semibold">Route not found</h1>
      <p className="mt-2 text-sm">
        The page you are looking for does not exist. Use the primary navigation to continue exploring the studio.
      </p>
      <div className="mt-4 flex justify-center gap-3">
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Go to dashboard
        </Button>
        <Button variant="subtle" onClick={() => navigate('/projects')}>
          View projects
        </Button>
      </div>
    </Card>
  );
}
