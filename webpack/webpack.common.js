const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

const srcDir = path.join(__dirname, '..', 'src');

module.exports = {
  entry: {
    popup: path.join(srcDir, 'popup.js'),
    options: path.join(srcDir, 'options.js'),
    background: path.join(srcDir, 'background.js'),
    content_script: path.join(srcDir, 'content_script.js'),
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
