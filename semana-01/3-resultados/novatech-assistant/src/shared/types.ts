export interface QueryRequest {
	question: string;
	conversationId?: string;
	requesterId?: string;
}

export interface QueryResponse {
	answer: string;
	source_document: string | null;
	confidence: "low" | "medium" | "high";
}

export interface HttpRequestLike {
	method?: string;
	body?: unknown;
	json?: () => Promise<unknown>;
}

export interface HttpResponseLike {
	status: number;
	headers: Record<string, string>;
	body: string;
}

export interface InvocationContextLike {
	invocationId?: string;
}
