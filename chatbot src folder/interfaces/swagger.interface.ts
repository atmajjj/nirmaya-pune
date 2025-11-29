/**
 * Interface representing an OpenAPI/Swagger path operation
 */
export interface SwaggerPath {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  parameters?: unknown[];
  requestBody?: unknown;
  responses: Record<string, unknown>;
  security?: Array<Record<string, string[]>>;
}

/**
 * Interface representing the complete OpenAPI/Swagger document structure
 */
export interface SwaggerDocument {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact?: {
      name?: string;
      email?: string;
    };
    license?: {
      name: string;
    };
  };
  servers?: Array<{
    url: string;
    description: string;
  }>;
  paths: Record<string, Record<string, SwaggerPath>>;
  components?: {
    schemas?: Record<string, unknown>;
    responses?: Record<string, unknown>;
    parameters?: Record<string, unknown>;
    securitySchemes?: Record<string, unknown>;
    [key: string]: Record<string, unknown> | undefined;
  };
  tags?: Array<{
    name: string;
    description?: string;
  }>;
}

/**
 * Interface for Swagger UI request interceptor
 */
export interface SwaggerRequestType {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: unknown;
  query?: Record<string, string>;
}

/**
 * Interface for Swagger UI response interceptor
 */
export interface SwaggerResponseType {
  url: string;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  text: string;
  ok: boolean;
}
