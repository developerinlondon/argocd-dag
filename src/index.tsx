import * as React from "react";
import { PlatformOverview } from "./components/PlatformOverview";

((w: Window & { extensionsAPI?: {
  registerSystemLevelExtension: (
    component: () => React.ReactElement,
    title: string,
    path: string,
    icon: string
  ) => void;
} }) => {
  w.extensionsAPI?.registerSystemLevelExtension(
    PlatformOverview,
    "Platform Overview",
    "/platform-overview",
    "fa-project-diagram"
  );
})(window);
