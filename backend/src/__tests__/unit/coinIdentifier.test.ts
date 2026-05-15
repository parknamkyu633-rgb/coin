import { identifyCoin } from '../../ml/coinIdentifier';

const mockCreate = jest.fn();

jest.mock('@anthropic-ai/sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  })),
}));

describe('coinIdentifier', () => {
  beforeEach(() => mockCreate.mockReset());

  it('정상적인 JSON 응답을 파싱한다', async () => {
    const mockResult = {
      name: '대한민국 500원',
      country: '대한민국',
      year: '1982',
      material: '동-아연',
      weight: '7.7',
      diameter: '26.5',
      rarity: 'common',
      estimatedValue: { min: 500, max: 1000, currency: 'KRW' },
      variants: [],
      historicalNote: '1982년 첫 발행된 500원 동전입니다.',
      confidence: 0.95,
    };

    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(mockResult) }],
    });

    const result = await identifyCoin('base64frontdata');

    expect(result.name).toBe('대한민국 500원');
    expect(result.country).toBe('대한민국');
    expect(result.confidence).toBe(0.95);
    expect(result.rarity).toBe('common');
  });

  it('응답이 JSON 외 텍스트를 포함해도 파싱한다', async () => {
    const mockResult = {
      name: '미국 1달러',
      country: '미국',
      year: '1971',
      material: '구리-니켈',
      weight: '8.1',
      diameter: '26.5',
      rarity: 'uncommon',
      estimatedValue: { min: 1500, max: 5000, currency: 'KRW' },
      variants: ['이글 리버스'],
      historicalNote: '1971년 닉슨 쇼크 이후 발행된 달러입니다.',
      confidence: 0.88,
    };

    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: `분석 결과입니다:\n${JSON.stringify(mockResult)}\n이상입니다.` }],
    });

    const result = await identifyCoin('base64frontdata', 'base64backdata');

    expect(result.name).toBe('미국 1달러');
    expect(result.variants).toEqual(['이글 리버스']);
  });

  it('응답에 JSON이 없으면 에러를 던진다', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '이미지를 식별할 수 없습니다.' }],
    });

    await expect(identifyCoin('base64frontdata')).rejects.toThrow(
      'AI 응답에서 JSON을 찾을 수 없습니다.'
    );
  });

  it('앞면만 있으면 이미지 블록 1개를 전송한다', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{}' }],
    });

    try {
      await identifyCoin('onlyfrontimage');
    } catch {}

    const callArgs = mockCreate.mock.calls[0][0];
    const imageBlocks = callArgs.messages[0].content.filter(
      (c: any) => c.type === 'image'
    );
    expect(imageBlocks).toHaveLength(1);
  });

  it('뒷면도 있으면 이미지 블록 2개를 전송한다', async () => {
    mockCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{}' }],
    });

    try {
      await identifyCoin('frontdata', 'backdata');
    } catch {}

    const callArgs = mockCreate.mock.calls[0][0];
    const imageBlocks = callArgs.messages[0].content.filter(
      (c: any) => c.type === 'image'
    );
    expect(imageBlocks).toHaveLength(2);
  });
});
