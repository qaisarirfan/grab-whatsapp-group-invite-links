const path = require('path');
const { merge } = require('webpack-merge');
const ZipPlugin = require('zip-webpack-plugin');
const common = require('./webpack.common.js');

module.exports = merge(common, {
  devtool: false,
  mode: 'production',
  plugins: [
    new ZipPlugin({
      path: path.resolve(__dirname, '..'),
      filename: 'grab-whatsapp-group-invite-links.zip',
    }),
  ],
});
