import { useState, useCallback } from "react";
import axios from "axios";
import { ResourceTree } from "../types/argocd";

export interface UseResourceTreeResult {
  tree: ResourceTree | null;
  loading: boolean;
  error: string | null;
  fetch: (appName: string, appNamespace: string) => void;
}

export function useResourceTree(): UseResourceTreeResult {
  const [tree, setTree] = useState<ResourceTree | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTree = useCallback(
    async (appName: string, appNamespace: string) => {
      setLoading(true);
      setError(null);
      try {
        const response = await axios.get<ResourceTree>(
          `/api/v1/applications/${appName}/resource-tree`,
          { params: { appNamespace } }
        );
        setTree(response.data);
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to fetch resource tree";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return { tree, loading, error, fetch: fetchTree };
}
