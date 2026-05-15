// zustand 스토어는 renderHook 없이 직접 getState/setState로 테스트
import { useScanStore } from '../store/scanStore';

const MOCK_RESULT = {
  name: '대한민국 500원',
  country: '대한민국',
  year: '1982',
  material: '동-아연',
  weight: '7.7',
  diameter: '26.5',
  rarity: 'common' as const,
  estimatedValue: { min: 500, max: 1000, currency: 'KRW' },
  variants: [],
  historicalNote: '1982년 발행.',
  confidence: 0.95,
};

function getStore() {
  return useScanStore.getState();
}

describe('useScanStore', () => {
  beforeEach(() => {
    useScanStore.getState().reset();
  });

  it('초기 상태는 모두 null', () => {
    const store = getStore();
    expect(store.frontUri).toBeNull();
    expect(store.backUri).toBeNull();
    expect(store.result).toBeNull();
    expect(store.scanId).toBeNull();
  });

  it('setFront로 앞면 URI를 저장한다', () => {
    getStore().setFront('file:///front.jpg');
    expect(getStore().frontUri).toBe('file:///front.jpg');
    expect(getStore().backUri).toBeNull();
  });

  it('setBack으로 뒷면 URI를 저장한다', () => {
    getStore().setBack('file:///back.jpg');
    expect(getStore().backUri).toBe('file:///back.jpg');
    expect(getStore().frontUri).toBeNull();
  });

  it('setResult로 scanId와 결과를 저장한다', () => {
    getStore().setResult('scan-uuid-1', MOCK_RESULT);
    const store = getStore();
    expect(store.scanId).toBe('scan-uuid-1');
    expect(store.result?.name).toBe('대한민국 500원');
    expect(store.result?.confidence).toBe(0.95);
  });

  it('reset으로 모든 상태가 null로 초기화된다', () => {
    getStore().setFront('file:///front.jpg');
    getStore().setBack('file:///back.jpg');
    getStore().setResult('scan-uuid-1', MOCK_RESULT);

    getStore().reset();

    const store = getStore();
    expect(store.frontUri).toBeNull();
    expect(store.backUri).toBeNull();
    expect(store.result).toBeNull();
    expect(store.scanId).toBeNull();
  });

  it('앞면 변경 시 뒷면은 유지된다', () => {
    getStore().setBack('file:///back.jpg');
    getStore().setFront('file:///front2.jpg');

    const store = getStore();
    expect(store.frontUri).toBe('file:///front2.jpg');
    expect(store.backUri).toBe('file:///back.jpg');
  });
});
