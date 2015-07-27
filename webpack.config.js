const path = require('path');
const { ProvidePlugin } = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const tsConfig = require('./tsconfig.json');

const devEnvOK = process.argv.some((v) => v === '--mode=development');
const resolvePath = (...paths) => path.join(__dirname, ...paths);
const getAliasFromTsConfig = () => {
  const END_STR = '/*';
  const endStrLen = END_STR.length;

  /**
   * @param {string} str
   * @returns {string}
   */
  const trim = (str) => {
    const index = str.lastIndexOf(END_STR);
    return index + endStrLen === str.length ? str.substring(0, index) : str;
  };
  return Object.entries(tsConfig.compilerOptions.paths).reduce((o, [key, val]) => {
    const value = Array.isArray(val) && val[0];
    value && (o[trim(key)] = resolvePath(trim(value)));
    return o;
  }, {});
};

/** @param {string} ext */
const getCssRule = (ext) => ({
  test: new RegExp(`\\.${ext}$`, 'i'),
  use: [
    devEnvOK ? 'style-loader' : MiniCssExtractPlugin.loader,
    {
      loader: 'css-loader',
      options: {
        modules: true
      }
    },
    {
      loader: 'postcss-loader',
      options: {
        postcssOptions: {
          plugins: ['autoprefixer']
        }
      }
    },
    ...{
      less: ['less-loader']
    }[ext] || []
  ]
});

/** @type {import('webpack').Configuration} */
const webpackConfig = {
  entry: './src/index.tsx',
  output: {
    filename: 'static/js/bundle.js',
    path: resolvePath('dist')
  },
  module: {
    rules: [
      {
        test: /\.(t|j)sx?$/i,
        use: [
          {
            loader: 'babel-loader',
            options: {
              cacheDirectory: true
            }
          }
        ],
        include: resolvePath('src')
      },
      ...['css', 'less'].map(getCssRule),
      ...[
        [/\.(jpe?g|png|gif|svg)$/i, 'images'],
        [/\.(woff2?|eot|ttf|otf)$/i, 'fonts'],
        [/\.(mp4|webm|ogg|mp3|wav|flac|aac)$/i, 'media']
      ].map(([test, dir]) => ({
        test,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 1 * 1024
          }
        },
        generator: { 
          filename: `static/${dir}/[name][ext]`
        }
      })),
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: resolvePath('public'),
          to: path.resolve(__dirname, 'dist'),
          filter: source => !source.includes('index.html')
        }
      ]
    }),
    new MiniCssExtractPlugin({
      filename: 'static/style/[name].[contenthash].css'
    }),
    new HtmlWebpackPlugin({
      template: resolvePath('public/index.html'),
      inject: 'body',
      minify: true,
      templateParameters: {}
    }),
    new ProvidePlugin({
      React: 'react'
    }),
    new ESLintPlugin({
      fix: true
    })
  ],
  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          chunks: 'initial',
          minChunks: 2,
          minSize: 0,
          name: 'commons'
        }
      }
    },
    ...!devEnvOK && {
      minimizer: [
        new CssMinimizerPlugin()
      ]
    }
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    alias: getAliasFromTsConfig(),
    modules: [resolvePath('node_modules')]
  },
  cache: {
    type: 'filesystem'
  },
  devServer: {
    hot: true,
    open: true,
    compress: true,
    historyApiFallback: {
      verbose: true,
      rewrites: [
        { from: /^(\/\w+)+$/, to: '/index.html' }
      ]
    },
    static: ['./public/'],
    port: 3000
  }
};

module.exports = webpackConfig;
