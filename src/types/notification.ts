export interface NotificationSettings {
  id?: string;
  userId: string;
  enabled: boolean;
  time: string; // "HH:mm" (e.g., "09:00")
  lastNotifiedDate?: string; // "YYYY-MM-DD"
  updatedAt?: string;
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  userId: 'guest',
  enabled: true,
  time: '09:00',
  lastNotifiedDate: '',
};
