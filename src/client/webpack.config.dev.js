const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { VueLoaderPlugin } = require('vue-loader');
const Dotenv = require('dotenv-webpack');

const cwd = process.cwd();

module.exports = [
  {
    mode: 'development',
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
    devtool: 'inline-source-map',
    plugins: [
      new Dotenv({
        path: path.resolve(cwd, '.env.dev'),
      }),
    ]
  },
  {
    mode: 'development',
    entry: './src/client/page/app.js',
    output: {
      filename: 'index.js',
      path: path.resolve(cwd, './dist/page'),
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
        },
        {
          test: /\.css$/,
          use: ['vue-style-loader', 'css-loader']
        },
      ],
    },
    resolve: {
      extensions: ['.js', '.vue', '.json'],
    },
    devtool: 'eval-source-map',
    devServer: {
      static: {
        directory: path.resolve(cwd, './dist/page/'),
      },
      client: {
        overlay: false,
      },
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range',
        'Access-Control-Expose-Headers': 'Content-Length,Content-Range'
      },
      host: 'localhost',
      port: 8899,
      open: './index.html'
    },
    plugins: [
      new Dotenv({
        path: path.resolve(cwd, '.env.dev')
      }),
      new VueLoaderPlugin(),
      new HtmlWebpackPlugin({
        template: './src/client/page/index.html',
        filename: 'index.html'
      })
    ]
  }
];
