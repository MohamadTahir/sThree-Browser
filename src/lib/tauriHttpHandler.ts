import { HttpRequest, HttpResponse } from "@smithy/protocol-http";
import { buildQueryString } from "@smithy/querystring-builder";

/**
 * AWS SDK HTTP handler that sends requests through the Tauri HTTP plugin
 * (Rust side) instead of the webview's fetch. Requests then go straight from
 * the desktop app to the S3 endpoint without needing a bucket CORS policy.
 * Mirrors @smithy/fetch-http-handler, minus the browser-only options.
 */
export class TauriHttpHandler {
  async handle(
    request: HttpRequest,
    // The SDK passes its own AbortSignal-like type; the DOM one is what it is at runtime.
    { abortSignal }: { abortSignal?: unknown } = {},
  ): Promise<{ response: HttpResponse }> {
    const { fetch } = await import("@tauri-apps/plugin-http");

    let path = request.path;
    const queryString = buildQueryString(request.query || {});
    if (queryString) {
      path += `?${queryString}`;
    }
    const port = request.port ? `:${request.port}` : "";
    const url = `${request.protocol}//${request.hostname}${port}${path}`;

    const method = request.method;
    const body =
      method === "GET" || method === "HEAD" ? undefined : request.body;

    const response = await fetch(url, {
      method,
      headers: request.headers,
      body,
      signal: abortSignal as AbortSignal | undefined,
    });

    const headers: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      headers[key] = value;
    });

    return {
      response: new HttpResponse({
        statusCode: response.status,
        reason: response.statusText,
        headers,
        body: response.body ?? (await response.blob()),
      }),
    };
  }

  updateHttpClientConfig(): void {}

  httpHandlerConfigs(): Record<string, never> {
    return {};
  }

  destroy(): void {}
}
