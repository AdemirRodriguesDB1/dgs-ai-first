import { z } from 'zod';
import { pino } from 'pino';

type ZodIssue = z.ZodIssue;

const logger = pino({ name: 'response-validator' });

export const SAFE_FALLBACK_RESPONSE = {
  answer:
    'Nao consegui validar a resposta com seguranca. Encaminhe para revisao humana.',
  source_document: 'SYSTEM-GUARDRAIL',
  confidence_score: 0
} as const;

export const StructuredResponseSchema = z
  .object({
    answer: z.string().trim().min(1),
    source_document: z.string().trim().min(1),
    confidence_score: z.number().min(0).max(1)
  })
  .strict();

export type StructuredResponse = z.infer<typeof StructuredResponseSchema>;

export type ValidationResult = {
  accepted: boolean;
  response: StructuredResponse;
  rejectionReason?:
    | 'invalid_schema'
    | 'missing_source_document'
    | 'dangerous_return_statement';
};

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function mentionsDangerousGoodsReturn(answer: string): boolean {
  const normalized = normalize(answer);
  const hasDangerousGoods = /carga(s)? perigosa(s)?/.test(normalized);
  const hasReturnTopic = /devolu(cao|coes|caoes|ver|vida|vidas)?/.test(normalized);
  return hasDangerousGoods && hasReturnTopic;
}

function hasNegativeForDangerousGoodsReturn(answer: string): boolean {
  const normalized = normalize(answer);
  const negativePatterns = [
    /nao (e )?possivel/,
    /nao pode/,
    /nao permitido/,
    /proibid/,
    /vedad/,
    /deve escalar/,
    /escalar para supervisor/
  ];

  return negativePatterns.some((pattern) => pattern.test(normalized));
}

export function validateModelResponse(rawResponse: unknown): ValidationResult {
  const parsed = StructuredResponseSchema.safeParse(rawResponse);

  if (!parsed.success) {
    logger.warn(
      {
        reason: 'invalid_schema',
        issues: parsed.error.issues.map((issue: ZodIssue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      },
      'Model response blocked by schema validation'
    );

    return {
      accepted: false,
      response: SAFE_FALLBACK_RESPONSE,
      rejectionReason: 'invalid_schema'
    };
  }

  const response = parsed.data;

  if (!response.source_document.trim()) {
    logger.warn({ reason: 'missing_source_document' }, 'Blocked response without source_document');
    return {
      accepted: false,
      response: SAFE_FALLBACK_RESPONSE,
      rejectionReason: 'missing_source_document'
    };
  }

  if (mentionsDangerousGoodsReturn(response.answer) && !hasNegativeForDangerousGoodsReturn(response.answer)) {
    logger.warn(
      { reason: 'dangerous_return_statement', sourceDocument: response.source_document },
      'Blocked unsafe statement about dangerous goods return'
    );

    return {
      accepted: false,
      response: SAFE_FALLBACK_RESPONSE,
      rejectionReason: 'dangerous_return_statement'
    };
  }

  return {
    accepted: true,
    response
  };
}
