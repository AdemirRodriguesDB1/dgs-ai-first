import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { CosmosClient, Container } from '@azure/cosmos';
import { createHash } from 'node:crypto';
import { pino } from 'pino';
import { z } from 'zod';

type ZodIssue = z.ZodIssue;

const logger = pino({ name: 'feedback-handler' });

const FeedbackInputSchema = z
  .object({
    queryId: z.string().trim().min(1),
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
    attendantEmail: z.string().email().optional()
  })
  .strict();

type FeedbackInput = z.infer<typeof FeedbackInputSchema>;

type FeedbackDocument = {
  queryId: string;
  rating: number;
  comment?: string;
  attendantIdHash?: string;
  createdAt: string;
};

let cachedContainer: Container | null = null;

function hashEmail(email?: string): string | undefined {
  if (!email) {
    return undefined;
  }

  return createHash('sha256').update(email.toLowerCase()).digest('hex');
}

function toFeedbackDocument(input: FeedbackInput): FeedbackDocument {
  return {
    queryId: input.queryId,
    rating: input.rating,
    comment: input.comment,
    attendantIdHash: hashEmail(input.attendantEmail),
    createdAt: new Date().toISOString()
  };
}

function getFeedbackContainer(): Container {
  if (cachedContainer) {
    return cachedContainer;
  }

  const connectionString = process.env.COSMOS_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error('COSMOS_CONNECTION_STRING is not configured');
  }

  const client = new CosmosClient(connectionString);
  const database = client.database('novatech');
  cachedContainer = database.container('feedbacks');
  return cachedContainer;
}

export async function feedbackHandler(
  request: HttpRequest,
  _context: InvocationContext
): Promise<HttpResponseInit> {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    logger.warn({ route: 'feedback' }, 'Invalid JSON body on feedback request');
    return {
      status: 400,
      jsonBody: {
        error: 'invalid_json',
        message: 'Request body must be valid JSON.'
      }
    };
  }

  const parsed = FeedbackInputSchema.safeParse(body);
  if (!parsed.success) {
    logger.warn(
      {
        route: 'feedback',
        issues: parsed.error.issues.map((issue: ZodIssue) => ({
          path: issue.path.join('.'),
          message: issue.message
        }))
      },
      'Feedback input validation failed'
    );

    return {
      status: 400,
      jsonBody: {
        error: 'validation_error',
        message: 'Invalid payload for feedback endpoint.'
      }
    };
  }

  const feedbackDocument = toFeedbackDocument(parsed.data);

  try {
    const container = getFeedbackContainer();
    await container.items.create(feedbackDocument);

    logger.info(
      {
        route: 'feedback',
        queryId: feedbackDocument.queryId,
        rating: feedbackDocument.rating
      },
      'Feedback stored successfully'
    );

    return {
      status: 201,
      jsonBody: { status: 'ok' }
    };
  } catch (error) {
    logger.error(
      {
        route: 'feedback',
        queryId: feedbackDocument.queryId,
        err: error
      },
      'Failed to persist feedback'
    );

    return {
      status: 500,
      jsonBody: {
        error: 'persistence_error',
        message: 'Unable to persist feedback right now.'
      }
    };
  }
}

app.http('feedback', {
  methods: ['POST'],
  authLevel: 'function',
  handler: feedbackHandler
});
