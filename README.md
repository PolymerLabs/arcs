[![Build Status](https://travis-ci.org/PolymerLabs/arcs.svg?branch=master)](https://travis-ci.org/PolymerLabs/arcs)

# arcs

Particle developers should visit our [particle developer website](https://polymerlabs.github.io/arcs-cdn/dev/) instead of reading this document which is more geared towards Arcs core system developers.

## Install

Note that you need a **recent** version of Node because we use new ES6 features. v9 is definitely OK.

```
$ ./tools/install
```

## Test
```
$ ./tools/test
```

## Demo

From the directory above the `arcs` directory:

```
$ python -m SimpleHTTPServer 5001 &
$ open 'http://localhost:5001/arcs/shell/apps/web/index.debug.html'
```

To load the demo shopping and wishlist recipes that were previously accessible
via the runtime browser:

- open the app shell via link above
- choose your user from the select menu top right
- note the user id in the query param
- construct a url as below and consider bookmarking it for future use

```
$ open 'http://localhost:5001/arcs/shell/apps/web/index.debug.html?
         arc=*&user=<user id>&
         solo=http://localhost:5001/arcs/runtime/browser/demo/recipes.manifest'
```
