import { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { Application, ApplicationList } from "../types/argocd";
import { CATEGORY_LABEL_KEY } from "../config/layers";

const REFRESH_INTERVAL_MS = 10_000;

export interface UseApplicationsResult {
  layers: Record<string, Application[]>;
  loading: boolean;
  error: string | null;
}

export function useApplications(): UseApplicationsResult {
  const [layers, setLayers] = useState<Record<string, Application[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchApplications = useCallback(async () => {
    try {
      const response = await axios.get<ApplicationList>(
        "/api/v1/applications"
      );
      const apps = response.data.items || [];
      const grouped: Record<string, Application[]> = {};

      for (const app of apps) {
        const category =
          app.metadata.labels?.[CATEGORY_LABEL_KEY] ?? "uncategorized";
        if (!grouped[category]) {
          grouped[category] = [];
        }
        grouped[category].push(app);
      }

      setLayers(grouped);
      setError(null);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch applications";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApplications();
    const interval = setInterval(fetchApplications, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchApplications]);

  return { layers, loading, error };
}
