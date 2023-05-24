const path = require('path');
const { ProvidePlugin } = require('webpack');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ESLintPlugin = require('eslint-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const tsConfig = require('./tsconfig.json');
const TerserWebpackPlugin = require('terser-webpack-plugin');

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
const contentHash = '[contenthash:6]'

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
    filename: `js/[name].${contentHash}.js`,
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
          filename: `${dir}/[name][ext]`
        }
      })),
    ]
  },
  plugins: [
    new CleanWebpackPlugin(),
    new CopyWebpackPlugin({
      patterns: [
        (file => ({
          from: resolvePath('public'),
          to: resolvePath('dist'),
          filter: source => !path.normalize(source).startsWith(file)
        }))(resolvePath('public/index.html'))
      ]
    }),
    new MiniCssExtractPlugin({
      filename: `style/[name].${contentHash}.css`
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
      chunks: 'all',
      minSize: 20000,
      minRemainingSize: 0,
      minChunks: 1,
      maxAsyncRequests: 30,
      maxInitialRequests: 30,
      enforceSizeThreshold: 50000,
      cacheGroups: {
        defaultVendors: {
          test: /[\\/]node_modules[\\/]/,
          priority: -10,
          reuseExistingChunk: true,
          name: 'common'
        },
        default: {
          minChunks: 2,
          priority: -20,
          reuseExistingChunk: true
        },
      }
    },
    minimize: !devEnvOK,
    minimizer: [
      new TerserWebpackPlugin({
        terserOptions: {
          compress: true,
          sourceMap: true
        }
      }),
      new CssMinimizerPlugin()
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.json'],
    alias: getAliasFromTsConfig(),
    modules: [resolvePath('node_modules')]
  },
  cache: {
    type: 'filesystem'
  },
  devtool: devEnvOK ? 'cheap-module-source-map' : false,
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
