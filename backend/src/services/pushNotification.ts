import { Expo, ExpoPushMessage } from 'expo-server-sdk';

const expo = new Expo();

export async function sendPushNotification(
  pushToken: string,
  title: string,
  body: string,
  data?: Record<string, unknown>
) {
  if (!Expo.isExpoPushToken(pushToken)) return;

  const message: ExpoPushMessage = {
    to: pushToken,
    sound: 'default',
    title,
    body,
    data,
  };

  const [chunk] = expo.chunkPushNotifications([message]);
  if (!chunk) return;

  const receipts = await expo.sendPushNotificationsAsync(chunk);
  const receipt = receipts[0];
  if (receipt?.status === 'error') {
    console.error('Push notification error:', receipt.message);
  }
}
