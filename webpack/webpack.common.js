const path = require('path');
const webpack = require('webpack');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

require('dotenv').config();

const srcDir = path.resolve('src');

module.exports = {
  entry: {
    background: path.join(srcDir, 'background.ts'),
    popup: path.join(srcDir, 'popup/index.tsx'),
  },
  output: {
    path: path.join(__dirname, '../dist'),
    filename: 'js/[name].js',
    clean: true,
  },
  watchOptions: {
    poll: true,
    ignored: /node_modules/,
  },
  optimization: {
    sideEffects: false,
    concatenateModules: true,
    runtimeChunk: false,
    moduleIds: 'deterministic',
    usedExports: true,
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
          },
          mangle: true,
        },
      }),
      new CssMinimizerPlugin({
        minimizerOptions: {
          // postcss-calc can't parse CSS relative-color syntax (e.g.
          // oklch(from var(--x) l calc(c * 0.4) h)) used in ui/bubble.tsx —
          // it misreads channel keywords like `c`/`l`/`alpha` as invalid
          // calc tokens. Disable calc reduction to avoid the lexical errors.
          preset: ['default', { calc: false }],
        },
      }),
    ],
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        react: {
          test: /[\\/]node_modules[\\/](react|react-dom|scheduler)[\\/]/,
          name: 'react',
          priority: 30,
        },
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 20,
        },
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: [
              ['@babel/preset-env', { modules: false }],
              ['@babel/preset-react', { runtime: 'automatic' }],
              '@babel/preset-typescript',
            ],
            plugins: ['@babel/plugin-syntax-dynamic-import'],
          },
        },
      },
      {
        test: /\.css$/,
        use: [MiniCssExtractPlugin.loader, 'css-loader', 'postcss-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    plugins: [
      new TsconfigPathsPlugin(), // Add this to resolve paths from tsconfig.json
    ],
  },
  plugins: [
    new CleanWebpackPlugin(), // Cleans the `dist` folder before each build
    new webpack.DefinePlugin({
      'process.env.GA_MEASUREMENT_ID': JSON.stringify(process.env.GA_MEASUREMENT_ID),
      'process.env.GA_API_SECRET': JSON.stringify(process.env.GA_API_SECRET),
    }),
    new MiniCssExtractPlugin({
      filename: 'css/[name].css',
    }),
    new HtmlWebpackPlugin({
      template: path.join(srcDir, 'popup/index.html'), // Popup HTML template
      filename: 'popup.html',
      chunks: ['popup'], // Only include the popup script
    }),
    new CopyPlugin({
      patterns: [{ from: '.', to: '../dist', context: 'public' }],
    }),
    new BundleAnalyzerPlugin({
      analyzerMode: 'static',
      openAnalyzer: false,
    }),
  ],
  performance: {
    maxAssetSize: 300000,
    maxEntrypointSize: 500000,
    hints: 'warning',
  },
};
