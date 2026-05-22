import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { api } from './api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) return null;

  const existing = await Notifications.getPermissionsAsync() as unknown as { granted: boolean; canAskAgain: boolean };

  if (!existing.granted && !existing.canAskAgain) return null;

  if (!existing.granted) {
    const requested = await Notifications.requestPermissionsAsync() as unknown as { granted: boolean };
    if (!requested.granted) return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: '기본 알림',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
    });
  }

  const token = await Notifications.getExpoPushTokenAsync({
    projectId: '64d6e6b8-5b04-47e5-a9e2-17e43e6e976d',
  });

  return token.data;
}

export async function syncPushToken() {
  try {
    const token = await registerForPushNotifications();
    if (!token) return;
    await api.post('/api/devices/token', { pushToken: token });
  } catch {
    // 실패해도 앱 기동에 영향 없음
  }
}
