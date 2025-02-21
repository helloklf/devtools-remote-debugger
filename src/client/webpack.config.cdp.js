// only generate cdp.js

const path = require('path');
const Dotenv = require('dotenv-webpack');

const cwd = process.cwd();

module.exports = [
  {
    mode: 'production',
    entry: './src/client/cdp/index.js',
    output: {
      filename: 'cdp.js',
      path: path.resolve(cwd, './dist'),
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: 'babel-loader',
        },
      ],
    },
    plugins: [
      new Dotenv({
        path: path.resolve(cwd, '.env'),
      }),
    ],
  },
];
