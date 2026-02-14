import * as React from "react";
import { createRoot } from "react-dom/client";
import { installMockApi } from "./mock-api";

declare const process: { env: { USE_LIVE_API?: boolean } };

if (!process.env.USE_LIVE_API) {
  installMockApi();
}

type ExtensionComponent = () => React.ReactElement;

interface MockExtensionsAPI {
  component: ExtensionComponent | null;
  title: string | null;
  registerSystemLevelExtension: (
    component: ExtensionComponent,
    title: string,
    path: string,
    icon: string
  ) => void;
}

const mockAPI: MockExtensionsAPI = {
  component: null,
  title: null,
  registerSystemLevelExtension(component, title) {
    mockAPI.component = component;
    mockAPI.title = title;
  },
};

(window as Window & { extensionsAPI?: MockExtensionsAPI }).extensionsAPI = mockAPI;

import("../src/index").then(() => {
  const root = document.getElementById("root");
  if (!root) return;

  if (!mockAPI.component) {
    root.innerHTML =
      '<div style="color:#fca5a5;padding:40px;text-align:center;">' +
      "Extension did not register a component</div>";
    return;
  }

  const Component = mockAPI.component;
  createRoot(root).render(React.createElement(Component));
});
