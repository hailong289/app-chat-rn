import { API_URL, APP_ENV, API_URL_PRODUCTION } from "@/env.json";
import useAuthStore from "../store/useAuth";

type StreamEnvelope = {
  event?: "start" | "chunk" | "progress" | "done" | "error";
  requestId?: string;
  route?: string;
  chunk?: string;
  metadata?: unknown;
  error?: string;
};

function isEnvelope(payload: unknown): payload is StreamEnvelope {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return (
    "event" in p ||
    "chunk" in p ||
    "metadata" in p ||
    "error" in p ||
    "requestId" in p ||
    "route" in p
  );
}

type ConsumeOptions = {
  method?: "GET" | "POST";
  body?: any;
  onChunk?: (chunk: string) => void;
};

function buildUrl(path: string): string {
  const base = APP_ENV === "production" ? API_URL_PRODUCTION : API_URL;
  return `${base}/api${path}`;
}

function buildHeaders(body?: any): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
  };

  if (!(body instanceof FormData) && body !== undefined && typeof body !== "string") {
    headers["Content-Type"] = "application/json";
  } else if (typeof body === "string") {
    headers["Content-Type"] = "application/json";
  }

  const accessToken = useAuthStore.getState().tokens?.accessToken;
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

function readEventChunk(rawEvent: string): { event?: string; data?: string } {
  const lines = rawEvent.split("\n");
  let eventName: string | undefined;
  const dataLines: string[] = [];
  let seenData = false;

  for (const line of lines) {
    if (line.startsWith("event:")) {
      eventName = line.slice(6).trim();
      continue;
    }
    if (line.startsWith("data:")) {
      const rawData = line.slice(5);
      dataLines.push(rawData.startsWith(" ") ? rawData.slice(1) : rawData);
      seenData = true;
      continue;
    }
    if (seenData) dataLines.push(line);
  }

  return { event: eventName, data: dataLines.join("\n") };
}

export async function consumeAiSse(
  path: string,
  options?: ConsumeOptions,
): Promise<{ metadata?: unknown; chunks: string[] }> {
  const method = options?.method ?? "POST";
  const body = options?.body;
  const requestBody = body instanceof FormData
    ? body
    : (body && typeof body === "object" ? JSON.stringify(body) : body);

  const response = await fetch(buildUrl(path), {
    method,
    headers: buildHeaders(body),
    body: requestBody,
  });

  if (!response.ok || !response.body) {
    throw new Error(`SSE request failed: ${response.status} ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let metadata: unknown;
  const chunks: string[] = [];

  const processBufferedEvents = (flushAll = false) => {
    const events = buffer.split("\n\n");
    buffer = flushAll ? "" : events.pop() ?? "";
    const toProcess = flushAll ? events.filter(Boolean) : events;

    for (const rawEvent of toProcess) {
      const { event, data } = readEventChunk(rawEvent);
      if (!data) continue;

      let parsed: StreamEnvelope | null = null;
      let parsedAny: unknown;
      try {
        parsedAny = JSON.parse(data);
        if (isEnvelope(parsedAny)) {
          parsed = parsedAny;
        } else {
          metadata = parsedAny;
          chunks.push(typeof parsedAny === "string" ? parsedAny : JSON.stringify(parsedAny));
          continue;
        }
      } catch {
        if (event === "error") {
          throw new Error(data || "SSE stream returned error");
        }
        chunks.push(data);
        options?.onChunk?.(data);
        continue;
      }

      if (!parsed) continue;

      if (parsed.event === "error" || event === "error") {
        throw new Error(parsed.error || "SSE stream returned error");
      }

      if (parsed.metadata !== undefined) {
        metadata = parsed.metadata;
      }

      if (parsed.chunk) {
        chunks.push(parsed.chunk);
        options?.onChunk?.(parsed.chunk);
      }
    }
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      buffer += decoder.decode();
      processBufferedEvents(true);
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    processBufferedEvents(false);
  }

  return { metadata, chunks };
}
