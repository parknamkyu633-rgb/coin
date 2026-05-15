import * as SecureStore from 'expo-secure-store';
import { randomUUID } from 'expo-crypto';

const KEY = 'heritcoin_device_id';

export async function getOrCreateDeviceId(): Promise<string> {
  let id = await SecureStore.getItemAsync(KEY);
  if (!id) {
    id = randomUUID();
    await SecureStore.setItemAsync(KEY, id);
  }
  return id;
}
