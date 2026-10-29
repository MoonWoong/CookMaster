import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';
import { NotificationSettings, DEFAULT_NOTIFICATION_SETTINGS } from '../types/notification';
import { ParsedIngredient } from '../types/fridge';
import { calculateIngredientFreshness } from '../utils/recipeLogic';

const LOCAL_STORAGE_KEY = 'fridge_notification_settings_v1';

export function getLocalNotificationSettings(userId = 'guest'): NotificationSettings {
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY}_${userId}`) || localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...parsed, userId };
    }
  } catch (e) {
    console.error('Failed to load local notification settings:', e);
  }
  return { ...DEFAULT_NOTIFICATION_SETTINGS, userId };
}

export function saveLocalNotificationSettings(settings: NotificationSettings) {
  try {
    localStorage.setItem(`${LOCAL_STORAGE_KEY}_${settings.userId}`, JSON.stringify(settings));
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save local notification settings:', e);
  }
}

export async function fetchNotificationSettings(userId = 'guest'): Promise<NotificationSettings> {
  const local = getLocalNotificationSettings(userId);
  if (!db || !userId || userId === 'guest') {
    return local;
  }

  try {
    const docRef = doc(db, 'notification_settings', userId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const data = snap.data() as NotificationSettings;
      const merged = { ...local, ...data, userId };
      saveLocalNotificationSettings(merged);
      return merged;
    }
  } catch (e) {
    console.warn('Could not fetch notification settings from Firestore, using local fallback:', e);
  }
  return local;
}

export async function persistNotificationSettings(settings: NotificationSettings): Promise<void> {
  saveLocalNotificationSettings(settings);

  if (!db || !settings.userId || settings.userId === 'guest') {
    return;
  }

  try {
    const docRef = doc(db, 'notification_settings', settings.userId);
    await setDoc(
      docRef,
      {
        id: settings.userId,
        userId: settings.userId,
        enabled: settings.enabled,
        time: settings.time,
        lastNotifiedDate: settings.lastNotifiedDate || '',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (e) {
    console.error('Failed to persist notification settings to Firestore:', e);
  }
}

export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (e) {
    console.error('Notification permission request error:', e);
    return 'denied';
  }
}

export function sendBrowserPushNotification(
  title: string,
  options: { body: string; icon?: string; tag?: string }
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission !== 'granted') {
    return false;
  }

  try {
    const notif = new Notification(title, {
      body: options.body,
      icon: options.icon || 'https://cdn-icons-png.flaticon.com/512/3565/3565418.png',
      tag: options.tag || 'fridge-expiry-alarm',
    });

    notif.onclick = () => {
      window.focus();
      notif.close();
    };

    return true;
  } catch (e) {
    console.error('Error firing browser notification:', e);
    return false;
  }
}

/**
 * Check if alarm should be triggered right now based on user's configured time and ingredients.
 */
export function evaluateScheduledAlarm(
  ingredients: ParsedIngredient[],
  settings: NotificationSettings
): {
  shouldTrigger: boolean;
  urgentItems: ParsedIngredient[];
  reason?: string;
} {
  if (!settings.enabled) {
    return { shouldTrigger: false, urgentItems: [] };
  }

  const now = new Date();
  const currentHours = String(now.getHours()).padStart(2, '0');
  const currentMinutes = String(now.getMinutes()).padStart(2, '0');
  const currentTimeString = `${currentHours}:${currentMinutes}`;
  const todayDateString = now.toISOString().slice(0, 10);

  // If already notified today, do not notify again
  if (settings.lastNotifiedDate === todayDateString) {
    return { shouldTrigger: false, urgentItems: [] };
  }

  // Compare configured time
  if (currentTimeString !== settings.time) {
    return { shouldTrigger: false, urgentItems: [] };
  }

  // Find urgent/expired ingredients (evaluates both expiry date and registered date)
  const urgentItems = ingredients.filter((item) => {
    const freshness = calculateIngredientFreshness(item);
    return freshness.status === 'expired' || freshness.status === 'warning';
  });

  if (urgentItems.length === 0) {
    return { shouldTrigger: false, urgentItems: [] };
  }

  return {
    shouldTrigger: true,
    urgentItems,
    reason: `설정하신 알림 시간(${settings.time})입니다.`,
  };
}
