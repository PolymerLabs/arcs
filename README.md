# arcs

Particle developers should visit our [particle developer website](https://polymerlabs.github.io/arcs-cdn/dev/) instead of reading this document which is more geared towards Arcs core system developers. 

## Install

Note that you need a **recent** version of Node because we use new ES6 features. v7.8.0 is definitely OK - earlier v7 versions are probably fine too.

```
$ npm install -g gulp-cli
$ npm install -g bower
$ (cd tracelib && npm install)
$ (cd strategizer && npm install)
$ (cd runtime && npm install)
$ (cd strategy-explorer && bower install)

```

## Test
```
$ (cd runtime && gulp)
```

If there are unhandled promise exceptions without stack traces, use `./node_modules/.bin/mocha --trace-warnings`.

## Trace
```
$ cd runtime
$ traceFile=`pwd`/trace.json npm test
```

## Demo
```
$ python -m SimpleHTTPServer 5001 &
$ open 'http://localhost:5001/runtime/browser/demo/index.demo.html'
```
