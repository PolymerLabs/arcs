# arcs

## Install

Note that you need a **recent** version of Node because we use new ES6 features. v7.8.0 is definitely OK - earlier v7 versions are probably fine too. 

```
$ (cd runtime && npm install)
$ (cd tracelib && npm install)
```

## Test
```
$ (cd runtime && npm test)
```

## Trace
```
$ cd runtime
$ traceFile=`pwd`/trace.json npm test
```
