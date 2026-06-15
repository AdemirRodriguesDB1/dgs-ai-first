import type { HttpResponseLike, QueryResponse } from "../../shared/types";

export function buildJsonResponse(status: number, payload: unknown): HttpResponseLike {
	return {
		status,
		headers: {
			"content-type": "application/json; charset=utf-8",
		},
		body: JSON.stringify(payload),
	};
}

export function buildAcceptedQueryResponse(): QueryResponse {
	return {
		answer: "Query endpoint scaffold validated the input. Retrieval and completion tasks are pending.",
		source_document: null,
		confidence: "low",
	};
}
