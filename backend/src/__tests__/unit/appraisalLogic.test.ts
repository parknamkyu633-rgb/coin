// 결제 금액 검증 로직 단위 테스트
// 라우트에서 추출한 순수 함수로 테스트

const TIERS = {
  basic: { price: 5000, label: '기본 감정' },
  premium: { price: 15000, label: '정밀 감정' },
} as const;

type Tier = keyof typeof TIERS;

function validatePaymentAmount(tier: Tier, paidAmount: number): boolean {
  return TIERS[tier].price === paidAmount;
}

function isValidTier(tier: string): tier is Tier {
  return tier === 'basic' || tier === 'premium';
}

describe('감정 결제 검증 로직', () => {
  describe('validatePaymentAmount', () => {
    it('기본 감정 5000원이 일치하면 true', () => {
      expect(validatePaymentAmount('basic', 5000)).toBe(true);
    });

    it('정밀 감정 15000원이 일치하면 true', () => {
      expect(validatePaymentAmount('premium', 15000)).toBe(true);
    });

    it('기본 감정에 잘못된 금액은 false', () => {
      expect(validatePaymentAmount('basic', 15000)).toBe(false);
      expect(validatePaymentAmount('basic', 0)).toBe(false);
      expect(validatePaymentAmount('basic', 4999)).toBe(false);
    });

    it('정밀 감정에 잘못된 금액은 false', () => {
      expect(validatePaymentAmount('premium', 5000)).toBe(false);
    });
  });

  describe('isValidTier', () => {
    it('basic, premium은 유효한 등급', () => {
      expect(isValidTier('basic')).toBe(true);
      expect(isValidTier('premium')).toBe(true);
    });

    it('다른 문자열은 유효하지 않음', () => {
      expect(isValidTier('gold')).toBe(false);
      expect(isValidTier('')).toBe(false);
      expect(isValidTier('BASIC')).toBe(false);
    });
  });

  describe('TIERS 상수', () => {
    it('basic 가격은 5000원', () => {
      expect(TIERS.basic.price).toBe(5000);
    });

    it('premium 가격은 15000원', () => {
      expect(TIERS.premium.price).toBe(15000);
    });
  });
});
