[![Build Status](https://travis-ci.org/PolymerLabs/arcs.svg?branch=master)](https://travis-ci.org/PolymerLabs/arcs)

# arcs

Particle developers should visit our [particle developer website](https://polymerlabs.github.io/arcs-cdn/dev/) instead of reading this document which is more geared towards Arcs core system developers.

## Install

Note that you need a **recent** version of Node because we use new ES6 features. v9 is definitely OK.

```
$ npm install
$ npm install -g bower
$ (cd strategy-explorer && bower install)
$ (cd extension && npm install)

```

## Test
```
$ ./tools/sigh test
$ (cd extension && npm test)
```

## Demo
```
$ python -m SimpleHTTPServer 5001 &
$ open 'http://localhost:5001/runtime/browser/demo/index.demo.html'
```
