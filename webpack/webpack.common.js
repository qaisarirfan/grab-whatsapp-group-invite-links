const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const srcDir = path.join(__dirname, '..', 'src');

module.exports = {
  entry: {
    background: path.join(srcDir, 'background.js'),
    content_script: path.join(srcDir, 'content_script.js'),
    content: path.join(srcDir, 'content.js'),
    options: path.join(srcDir, 'options.js'),
    popup: path.join(srcDir, 'popup.js'),
  },
  output: {
    path: path.join(__dirname, '../dist/js'),
    filename: '[name].js',
  },
  watchOptions: {
    poll: true,
    ignored: /node_modules/,
  },
  optimization: {
    minimize: true,
    minimizer: [new TerserPlugin({
      terserOptions: {
        mangle: true,
      },
    })],
    splitChunks: {
      name: 'vendor',
      chunks(chunk) {
        return chunk.name !== 'background';
      },
    },
  },
  module: {
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ['babel-loader'],
      },
    ],
  },
  resolve: {
    extensions: ['*', '.js', '.jsx'],
  },
  plugins: [
    new CopyPlugin({
      patterns: [{ from: '.', to: '../', context: 'public' }],
      options: {},
    }),
  ],
};
