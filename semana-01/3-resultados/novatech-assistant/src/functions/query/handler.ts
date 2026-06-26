import { app, type HttpRequest, type HttpResponseInit, type InvocationContext } from "@azure/functions";

import { buildAcceptedQueryResponse, buildJsonResponse } from "./response-builder";
import { parseQueryRequest, parseQueryResponse } from "./validator";
import { RequestValidationError } from "../../shared/errors";
import { logger } from "../../shared/logger";
import type { HttpRequestLike, HttpResponseLike, InvocationContextLike } from "../../shared/types";

async function readRequestPayload(request: HttpRequestLike): Promise<unknown> {
  if (typeof request.json === "function") {
    return request.json();
  }

  return request.body;
}

export async function handleQueryRequest(
  request: HttpRequestLike,
  context?: InvocationContextLike,
): Promise<HttpResponseLike> {
  if (request.method?.toUpperCase() !== "POST") {
    return buildJsonResponse(405, {
      error: "METHOD_NOT_ALLOWED",
      message: "Use POST /api/query.",
    });
  }

  try {
    const payload = await readRequestPayload(request);
    const query = parseQueryRequest(payload);

    logger.info(
      {
        invocationId: context?.invocationId,
        questionLength: query.question.length,
        hasConversationId: Boolean(query.conversationId),
      },
      "query endpoint request accepted",
    );

    const response = parseQueryResponse(buildAcceptedQueryResponse());
    return buildJsonResponse(202, response);
  } catch (error) {
    if (error instanceof RequestValidationError) {
      logger.warn(
        {
          invocationId: context?.invocationId,
          details: error.details,
        },
        "query endpoint validation failed",
      );

      return buildJsonResponse(400, {
        error: "VALIDATION_ERROR",
        message: error.message,
        details: error.details,
      });
    }

    logger.error(
      {
        invocationId: context?.invocationId,
        error,
      },
      "query endpoint failed unexpectedly",
    );

    return buildJsonResponse(500, {
      error: "INTERNAL_ERROR",
      message: "Unexpected error while preparing the query pipeline.",
    });
  }
}

export async function queryHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  return handleQueryRequest(request, context);
}

app.http("query", {
  methods: ["POST"],
  authLevel: "anonymous",
  route: "query",
  handler: queryHandler,
});
