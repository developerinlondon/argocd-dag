import { useState, useEffect, useRef, useCallback } from "react";
import { Application } from "../types/argocd";
import { CATEGORY_LABEL_KEY } from "../config/layers";

const SSE_URL = "/api/v1/stream/applications";
const RECONNECT_BASE_MS = 1_000;
const RECONNECT_MAX_MS = 30_000;

export interface UseApplicationsResult {
  layers: Record<string, Application[]>;
  loading: boolean;
  error: string | null;
  connected: boolean;
}

function groupByCategory(
  apps: Map<string, Application>,
): Record<string, Application[]> {
  const grouped: Record<string, Application[]> = {};
  for (const app of apps.values()) {
    const category =
      app.metadata.labels?.[CATEGORY_LABEL_KEY] ?? "uncategorized";
    if (!grouped[category]) {
      grouped[category] = [];
    }
    grouped[category].push(app);
  }
  return grouped;
}

interface SSEEvent {
  result: {
    type: "ADDED" | "MODIFIED" | "DELETED";
    application: Application;
  };
}

function parseSSELines(
  buffer: string,
  chunk: string,
): { events: SSEEvent[]; remainder: string } {
  const text = buffer + chunk;
  const events: SSEEvent[] = [];
  const lines = text.split("\n");

  const remainder = lines.pop() ?? "";

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || !trimmed.startsWith("data:")) continue;

    const jsonStr = trimmed.slice(5).trim();
    if (!jsonStr) continue;

    try {
      const parsed: SSEEvent = JSON.parse(jsonStr);
      if (parsed.result?.application?.metadata?.name) {
        events.push(parsed);
      }
    } catch {
      continue;
    }
  }

  return { events, remainder };
}

export function useApplications(): UseApplicationsResult {
  const [layers, setLayers] = useState<Record<string, Application[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);

  const appsRef = useRef<Map<string, Application>>(new Map());
  const abortRef = useRef<AbortController | null>(null);
  const reconnectAttemptRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const updateLayers = useCallback(() => {
    if (!mountedRef.current) return;
    setLayers(groupByCategory(appsRef.current));
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    const connect = async () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const response = await fetch(SSE_URL, {
          signal: controller.signal,
          headers: { Accept: "text/event-stream" },
        });

        if (!response.ok) {
          throw new Error(`SSE connection failed: ${response.status}`);
        }

        if (!response.body) {
          throw new Error("SSE response has no body");
        }

        if (!mountedRef.current) return;
        setConnected(true);
        setError(null);
        setLoading(false);
        reconnectAttemptRef.current = 0;

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (!mountedRef.current) break;

          const chunk = decoder.decode(value, { stream: true });
          const { events, remainder } = parseSSELines(sseBuffer, chunk);
          sseBuffer = remainder;

          let changed = false;
          for (const event of events) {
            const { type, application } = event.result;
            const name = application.metadata.name;

            if (type === "DELETED") {
              if (appsRef.current.has(name)) {
                appsRef.current.delete(name);
                changed = true;
              }
            } else {
              appsRef.current.set(name, application);
              changed = true;
            }
          }

          if (changed) {
            updateLayers();
          }
        }

        if (mountedRef.current) {
          setConnected(false);
          scheduleReconnect();
        }
      } catch (err: unknown) {
        if (!mountedRef.current) return;
        if (controller.signal.aborted) return;

        const message =
          err instanceof Error ? err.message : "SSE connection failed";
        setError(message);
        setConnected(false);
        setLoading(false);
        scheduleReconnect();
      }
    };

    const scheduleReconnect = () => {
      if (!mountedRef.current) return;

      const attempt = reconnectAttemptRef.current;
      const delay = Math.min(
        RECONNECT_BASE_MS * Math.pow(2, attempt),
        RECONNECT_MAX_MS,
      );
      reconnectAttemptRef.current = attempt + 1;

      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) {
          connect();
        }
      }, delay);
    };

    connect();

    return () => {
      mountedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
        abortRef.current = null;
      }
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [updateLayers]);

  return { layers, loading, error, connected };
}
