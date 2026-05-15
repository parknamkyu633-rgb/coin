import Anthropic from '@anthropic-ai/sdk';

export interface CoinResult {
  name: string;
  country: string;
  year: string;
  material: string;
  weight: string;
  diameter: string;
  rarity: 'common' | 'uncommon' | 'rare' | 'very_rare';
  estimatedValue: { min: number; max: number; currency: string };
  variants: string[];
  historicalNote: string;
  confidence: number;
}

export async function identifyCoin(
  frontImageB64: string,
  backImageB64?: string
): Promise<CoinResult> {
  const client = new Anthropic();
  const imageContents: Anthropic.ImageBlockParam[] = [
    {
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: frontImageB64 },
    },
  ];

  if (backImageB64) {
    imageContents.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/jpeg', data: backImageB64 },
    });
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: `당신은 세계 동전 및 지폐 전문 감정사입니다.
이미지를 분석하여 반드시 아래 JSON 형식으로만 응답하세요.
변종(소형/대형 날짜, 프루프 등)이 식별되면 variants 배열에 포함하세요.
식별 불가 시에도 JSON 형식을 유지하고 confidence를 0으로 설정하세요.`,
    messages: [
      {
        role: 'user',
        content: [
          ...imageContents,
          {
            type: 'text',
            text: `이 동전/지폐를 분석하고 다음 JSON으로만 응답하세요:
{
  "name": "정식 명칭",
  "country": "발행 국가",
  "year": "발행 연도",
  "material": "재질",
  "weight": "무게(g)",
  "diameter": "지름(mm)",
  "rarity": "common",
  "estimatedValue": { "min": 0, "max": 0, "currency": "KRW" },
  "variants": [],
  "historicalNote": "역사적 의의 2문장 이내",
  "confidence": 0.95
}`,
          },
        ],
      },
    ],
  });

  const text =
    response.content[0].type === 'text' ? response.content[0].text : '{}';
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI 응답에서 JSON을 찾을 수 없습니다.');

  const parsed = JSON.parse(jsonMatch[0]);

  // variants가 객체 배열로 올 수 있으므로 문자열 배열로 정규화
  if (Array.isArray(parsed.variants)) {
    parsed.variants = parsed.variants.map((v: unknown) =>
      typeof v === 'string' ? v : (v as any).type ?? (v as any).name ?? JSON.stringify(v)
    );
  } else {
    parsed.variants = [];
  }

  // estimatedValue 숫자 보장
  if (parsed.estimatedValue) {
    parsed.estimatedValue.min = Number(parsed.estimatedValue.min ?? 0);
    parsed.estimatedValue.max = Number(parsed.estimatedValue.max ?? 0);
  } else {
    parsed.estimatedValue = { min: 0, max: 0, currency: 'KRW' };
  }

  parsed.confidence = Number(parsed.confidence ?? 0);
  parsed.weight = String(parsed.weight ?? '');
  parsed.diameter = String(parsed.diameter ?? '');

  return parsed as CoinResult;
}
