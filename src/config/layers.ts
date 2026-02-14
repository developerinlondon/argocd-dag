export interface LayerConfig {
  order: number;
  dependsOn: string[];
  label: string;
  description?: string;
}

export const CATEGORY_LABEL_KEY = "jeebon.ai/category";

export const DEFAULT_LAYERS: Record<string, LayerConfig> = {
  pipeline: { order: -1, dependsOn: [], label: "Pipeline" },
  foundation: { order: 0, dependsOn: ["pipeline"], label: "Foundation" },
  operators: { order: 1, dependsOn: ["foundation"], label: "Operators" },
  monitoring: { order: 1, dependsOn: ["foundation"], label: "Monitoring" },
  secrets: { order: 2, dependsOn: ["operators"], label: "Secrets" },
  database: { order: 3, dependsOn: ["secrets"], label: "Database" },
  auth: { order: 4, dependsOn: ["database"], label: "Auth" },
  workflows: { order: 5, dependsOn: ["database"], label: "Workflows" },
  content: {
    order: 6,
    dependsOn: ["auth", "workflows"],
    label: "Content",
  },
};
