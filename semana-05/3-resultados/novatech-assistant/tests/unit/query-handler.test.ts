import { describe, expect, it } from "vitest";

import { handleQueryRequest } from "../../src/functions/query/handler";

describe("queryHandler", () => {
  it("should return 405 when method is not POST", async () => {
    const response = await handleQueryRequest({ method: "GET" });

    expect(response.status).toBe(405);
    expect(JSON.parse(response.body)).toEqual({
      error: "METHOD_NOT_ALLOWED",
      message: "Use POST /api/query.",
    });
  });

  it("should return 400 when question is missing", async () => {
    const response = await handleQueryRequest({
      method: "POST",
      json: async () => ({ requesterId: "agent-01" }),
    });

    expect(response.status).toBe(400);
    expect(JSON.parse(response.body)).toEqual({
      error: "VALIDATION_ERROR",
      message: "Invalid query request payload",
      details: ["question: Required"],
    });
  });

  it("should return 202 when payload is valid", async () => {
    const response = await handleQueryRequest({
      method: "POST",
      json: async () => ({ question: "Qual o SLA do cliente Gold?" }),
    });

    expect(response.status).toBe(202);
    expect(JSON.parse(response.body)).toEqual({
      answer: "Query endpoint scaffold validated the input. Retrieval and completion tasks are pending.",
      source_document: null,
      confidence: "low",
    });
  });
});