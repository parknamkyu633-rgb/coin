import { getOrCreateDeviceId } from '../services/device';

// expo-secure-store mock
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
}));

// expo-crypto mock
jest.mock('expo-crypto', () => ({
  randomUUID: jest.fn(() => 'generated-uuid-1234'),
}));

import * as SecureStore from 'expo-secure-store';
import * as Crypto from 'expo-crypto';

describe('getOrCreateDeviceId', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('저장된 ID가 없으면 새 UUID를 생성하고 저장한다', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(null);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValueOnce(undefined);

    const id = await getOrCreateDeviceId();

    expect(id).toBe('generated-uuid-1234');
    expect(SecureStore.setItemAsync).toHaveBeenCalledWith(
      'heritcoin_device_id',
      'generated-uuid-1234'
    );
  });

  it('이미 저장된 ID가 있으면 그대로 반환한다', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(
      'existing-uuid-5678'
    );

    const id = await getOrCreateDeviceId();

    expect(id).toBe('existing-uuid-5678');
    expect(Crypto.randomUUID).not.toHaveBeenCalled();
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();
  });

  it('같은 키(heritcoin_device_id)로 조회한다', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValueOnce(
      'existing-uuid'
    );

    await getOrCreateDeviceId();

    expect(SecureStore.getItemAsync).toHaveBeenCalledWith('heritcoin_device_id');
  });

  it('두 번 호출 시 SecureStore를 두 번 조회한다', async () => {
    (SecureStore.getItemAsync as jest.Mock)
      .mockResolvedValueOnce('uuid-first')
      .mockResolvedValueOnce('uuid-first');

    const id1 = await getOrCreateDeviceId();
    const id2 = await getOrCreateDeviceId();

    expect(id1).toBe(id2);
    expect(SecureStore.getItemAsync).toHaveBeenCalledTimes(2);
  });
});
