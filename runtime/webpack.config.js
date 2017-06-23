let path = require("path");

let sources = [
  "demo/demo.js",
  "vr-demo/vr-demo.js"
]

module.exports = sources.map(s => new Object({
  entry: `./browser/${s}`,
  output: {
    path: path.join(__dirname, "/browser/build/", path.dirname(s)),
    filename: path.basename(s),
  },
  node: {
    fs: 'empty'
  },
  devtool: 'source-map',
  watch: true
}));
