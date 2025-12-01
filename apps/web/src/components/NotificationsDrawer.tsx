import { useEffect, useState } from 'react';
import { fetchNotifications, fetchTeamActivity, markNotificationRead, type NotificationRecord } from '../lib/api/notifications';
import { API_BASE_URL } from '../lib/config/api';

export interface NotificationsDrawerProps {
  initialItems?: NotificationRecord[];
  open?: boolean;
}

export function NotificationsDrawer({ initialItems = [], open = false }: NotificationsDrawerProps) {
  const [items, setItems] = useState<NotificationRecord[]>(initialItems);
  const [isOpen, setIsOpen] = useState(open);
  const [activity, setActivity] = useState<string[]>([]);

  useEffect(() => {
    const load = async () => {
      try {
        const [fetched, teamActivity] = await Promise.all([fetchNotifications(), fetchTeamActivity()]);
        setItems(fetched ?? []);
        setActivity(teamActivity?.map((entry) => `${entry.actor ?? 'System'}: ${entry.message}`) ?? []);
      } catch (error) {
        console.warn('[notifications] unable to load', error);
        setItems([]);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const base = API_BASE_URL?.replace(/\/$/, '') ?? '';
    const url = base ? `${base}/notifications/stream` : '/notifications/stream';
    const source = typeof EventSource !== 'undefined' ? new EventSource(url) : null;
    if (!source) return;
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as NotificationRecord;
        setItems((existing) => [payload, ...existing]);
      } catch (error) {
        console.warn('[notifications] failed to parse stream payload', error);
      }
    };
    return () => {
      source.close();
    };
  }, []);

  const handleMarkRead = async (id: string) => {
    setItems((existing) => existing.map((item) => (item.id === id ? { ...item, read: true } : item)));
    try {
      await markNotificationRead(id);
    } catch (error) {
      console.warn('[notifications] failed to mark read', error);
    }
  };

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
          <ul>
            {items.length === 0 ? (
              <li className="notifications-drawer__item">No notifications yet.</li>
            ) : (
              items.map((item) => (
                <li
                  key={item.id}
                  className={`notifications-drawer__item notifications-drawer__item--${item.channel} ${item.read ? 'is-read' : ''}`}
                  onClick={() => handleMarkRead(item.id)}
                >
                  <h4>{item.title}</h4>
                  <p>{item.body}</p>
                  <time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time>
                </li>
              ))
            )}
          </ul>
          {activity.length > 0 && (
            <div className="notifications-drawer__activity">
              <h4>Team activity</h4>
              <ul>
                {activity.map((entry) => (
                  <li key={entry}>{entry}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </aside>
  );
}

export default NotificationsDrawer;
