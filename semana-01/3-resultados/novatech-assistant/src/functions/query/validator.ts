import { z } from "zod";

import type { QueryRequest, QueryResponse } from "../../shared/types";
import { RequestValidationError } from "../../shared/errors";

export const queryRequestSchema = z.object({
	question: z.string().trim().min(1, "question must not be empty"),
	conversationId: z.string().trim().min(1).optional(),
	requesterId: z.string().trim().min(1).optional(),
});

export const queryResponseSchema = z.object({
	answer: z.string().min(1),
	source_document: z.string().nullable(),
	confidence: z.enum(["low", "medium", "high"]),
});

export function parseQueryRequest(payload: unknown): QueryRequest {
	const result = queryRequestSchema.safeParse(payload);

	if (!result.success) {
		throw new RequestValidationError(
			"Invalid query request payload",
			result.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`),
		);
	}

	return result.data;
}

export function parseQueryResponse(payload: unknown): QueryResponse {
	return queryResponseSchema.parse(payload);
}
