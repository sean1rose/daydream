let webpack = require("webpack")
let path = require("path")
let ExtractTextPlugin = require("extract-text-webpack-plugin")
let CopyWebpackPlugin = require("copy-webpack-plugin")
let AssetsPlugin = require("assets-webpack-plugin")

let BUILD_DIR = path.resolve(__dirname, "public")

let extractStyles = new ExtractTextPlugin("styles/[name].css")

let config = {
  context: path.join(__dirname, "src"),
  entry: {
    "app/index": [
      "./sass/app/main.scss", // main app stylesheet
      "./scripts/app/index.js" // Your appʼs entry point
    ],
    "index": [ "./sass/main.scss", "./sass/index.scss", "./scripts/main.js", "./scripts/signup.js" ],
    "signin": [ "./sass/signin.scss", "./scripts/signin.js" ],
    "signup": [ "./sass/signup.scss", "./scripts/signup.js" ],
    "pricing": [ "./sass/pricing.scss" ],
    "send-reset": [ "./scripts/send-reset.js" ],
    "reset-password": [ "./scripts/reset-password" ]
  },
  output: {
    path: BUILD_DIR,
    publicPath: "/",
    filename: "scripts/[name].js"
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: "babel",
        query: {
          cacheDirectory: true,
          compact: true,
          presets: [ "es2015", "react", "stage-0" ]
        },
        plugins: [ "transform-runtime", "transform-object-rest-spread" ]
      },
      {
        test: /\.json$/,
        loader: "json"
      },
      {
        test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: "url-loader",
        query: {
          "limit": 50000,
          "mimetype": "application/font-woff",
          "name": "fonts/[name].[ext]"
        }
      },
      {
        test: /\.(ttf|eot|svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
        loader: "url-loader",
        query: {
          "name": "fonts/[name].[ext]"
        }
      },
      {
        test: /\.(jpe?g|png|gif|svg)$/i,
        loader: "url-loader",
        query: {
          "name": "images/[name].[ext]"
        }
      },
      {
        test: /\.scss$/,
        loader: extractStyles.extract("style-loader", [ "raw-loader", "sass-loader" ])
      },
      {
        test: /\.modernizrrc$/,
        loader: "modernizr"
      }
    ]
  },
  plugins: [
    extractStyles,
    new AssetsPlugin(),
    new webpack.PrefetchPlugin("react-bootstrap"),
    new webpack.optimize.CommonsChunkPlugin({
      name: "app/vendor",
      filename: "vendor.js",
      async: true
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new webpack.optimize.UglifyJsPlugin({
      compress: {
        warnings: false
      }
    }),
    new webpack.EnvironmentPlugin([
      "NODE_ENV"
    ]),
    new CopyWebpackPlugin([
      {
        from: "./fonts/*.otf",
        to: path.resolve(__dirname, "public")
      },
      {
        from: "./fonts/*.svg",
        to: path.resolve(__dirname, "public")
      },
      {
        from: "./fonts/*.eot",
        to: path.resolve(__dirname, "public")
      },
      {
        from: "./fonts/*.ttf",
        to: path.resolve(__dirname, "public")
      },
      {
        from: "./fonts/*.woff",
        to: path.resolve(__dirname, "public")
      },
      {
        from: "./fonts/*.woff2",
        to: path.resolve(__dirname, "public")
      },
      {
        from: "./images/**/*.ico",
        to: path.resolve(__dirname, "public")
      },
      {
        from: "./images/**/*.png",
        to: path.resolve(__dirname, "public")
      },
      {
        from: "./images/**/*.jpg",
        to: path.resolve(__dirname, "public")
      }
    ], {
      ignore: [
        // Doesn't copy any files with a txt extension
        "*.txt",
        // Doesn't copy any file, even if they start with a dot
        { glob: "**/*", dot: true }
      ]
    }),
    new webpack.ProvidePlugin({
      Promise: "imports?this=>global!exports?global.Promise!es6-promise"
    })
  ],
  resolve: {
    root: __dirname,
    modulesDirectories: [ "node_modules" ],
    extensions: [ "", ".webpack.js", ".web.js", ".js", ".jsx", ".json" ],
    alias: {
      modernizr$: path.resolve(__dirname, ".modernizrrc")
    }
  }
}

module.exports = config
