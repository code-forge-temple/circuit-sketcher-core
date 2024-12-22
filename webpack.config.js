const path = require("path");
const webpack = require("webpack");

const postcssLoader = {
  loader: "postcss-loader",
  options: {
    postcssOptions: {
      plugins: [
        require("postcss-url")({
          url: "inline",
          maxSize: Infinity,
        }),
      ],
    },
  },
};

module.exports = {
  entry: "./src/main.ts",
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: ["style-loader", "css-loader", postcssLoader],
        exclude: /node_modules/,
      },
      {
        test: /\.scss$/,
        use: ["style-loader", "css-loader", "sass-loader", postcssLoader],
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js"],
  },
  externals: {
    react: "react",
    "react-dom": "react-dom",
  },
  output: {
    filename: "main.js",
    path: path.resolve(__dirname, "dist"),
    libraryTarget: "commonjs",
  },
  devtool: "source-map",
  mode: "production",
  plugins: [
    new webpack.BannerPlugin({
      banner: `/*! Also see LICENSE file in the root of the project. */`,
      raw: true,
    }),
  ],
  optimization: {
    concatenateModules: false,
  },
};
