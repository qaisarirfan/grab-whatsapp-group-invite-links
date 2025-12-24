const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const TsconfigPathsPlugin = require('tsconfig-paths-webpack-plugin');

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
