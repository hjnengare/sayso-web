import { useNotificationsContext } from '../providers/NotificationsProvider';

export function useNotifications() {
  return useNotificationsContext();
}
