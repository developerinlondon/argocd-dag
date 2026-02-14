const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

const cssRule = {
  test: /\.css$/,
  use: ["style-loader", "css-loader"],
};

function tsRule(configFile) {
  return {
    test: /\.tsx?$/,
    use: {
      loader: "ts-loader",
      options: configFile ? { configFile } : {},
    },
    exclude: /node_modules/,
  };
}

const sharedResolve = {
  extensions: [".tsx", ".ts", ".js", ".css"],
};

const productionConfig = {
  entry: {
    extension: "./src/index.tsx",
  },
  output: {
    filename: "extensions-argocd-dag.js",
    path: path.resolve(__dirname, "dist/resources"),
    libraryTarget: "window",
    library: ["tmp", "extensions"],
  },
  resolve: sharedResolve,
  module: { rules: [tsRule(), cssRule] },
  mode: "production",
};

const webpack = require("webpack");

const argocdBaseUrl = process.env.ARGOCD_URL || "https://argocd.jeebon.dev";
const argocdToken = process.env.ARGOCD_TOKEN || "";
const useLiveApi = Boolean(argocdToken);

const devProxy = useLiveApi
  ? [
      {
        context: ["/api"],
        target: argocdBaseUrl,
        secure: false,
        changeOrigin: true,
        headers: { Authorization: "Bearer " + argocdToken },
      },
    ]
  : undefined;

const developmentConfig = {
  entry: "./dev/dev-entry.tsx",
  output: {
    filename: "dev-bundle.js",
    path: path.resolve(__dirname, "dist-dev"),
  },
  resolve: sharedResolve,
  module: { rules: [tsRule("tsconfig.dev.json"), cssRule] },
  mode: "development",
  devtool: "eval-source-map",
  devServer: {
    static: { directory: path.resolve(__dirname, "dev") },
    port: 3000,
    hot: true,
    open: false,
    proxy: devProxy,
  },
  plugins: [
    new webpack.DefinePlugin({
      "process.env.USE_LIVE_API": JSON.stringify(useLiveApi),
    }),
    new HtmlWebpackPlugin({
      template: path.resolve(__dirname, "dev/index.html"),
      inject: "body",
    }),
  ],
};

module.exports = (env) => {
  if (env && env.development) {
    return developmentConfig;
  }
  return productionConfig;
};
