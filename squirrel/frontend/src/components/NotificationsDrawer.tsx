import { useEffect, useState } from 'react';
import { api } from '../services/api';

type Notification = {
  id: string;
  title: string;
  body: string;
  channel: 'ai' | 'payments' | 'collaboration' | 'alerts';
  createdAt: string;
};

export interface NotificationsDrawerProps {
  initialItems?: Notification[];
  open?: boolean;
}

export function NotificationsDrawer({ initialItems = [], open = false }: NotificationsDrawerProps) {
  const [items, setItems] = useState(initialItems);
  const [isOpen, setIsOpen] = useState(open);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/notifications');
        const records = Array.isArray(response.data) ? response.data : response.data?.items ?? [];
        const normalized: Notification[] = records.map((record: any, index: number) => ({
          id: String(record.id ?? index),
          title: record.title ?? record.subject ?? 'Notification',
          body: record.body ?? record.message ?? '',
          channel: (record.channel ?? 'alerts') as Notification['channel'],
          createdAt: record.createdAt ?? record.updatedAt ?? new Date().toISOString(),
        }));
        setItems(normalized);
      } catch (err) {
        setError('Unable to load notifications');
      } finally {
        setLoading(false);
      }
    };

    if (items.length === 0) {
      void loadNotifications();
    }
  }, [items.length]);

  return (
    <aside className={`notifications-drawer ${isOpen ? 'is-open' : ''}`}>
      <header>
        <h3>Notifications</h3>
        <button type="button" onClick={() => setIsOpen((state) => !state)}>
          {isOpen ? 'Close' : 'Open'}
        </button>
      </header>
      {isOpen && (
        <>
          {loading && <p className="text-sm text-muted">Loading notifications…</p>}
          {error && <p className="text-sm text-destructive">{error}</p>}
          {!loading && !error && items.length === 0 && <p className="text-sm text-muted">You’re all caught up.</p>}
          {!loading && !error && items.length > 0 && (
            <ul>
              {items.map((item) => (
                <li key={item.id} className={`notifications-drawer__item notifications-drawer__item--${item.channel}`}>
                  <h4>{item.title}</h4>
                  <p>{item.body}</p>
                  <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </aside>
  );
}

export default NotificationsDrawer;
