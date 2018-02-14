# arcs-cdn

## Arcs Applications

### Arcs Webapp

https://polymerlabs.github.io/arcs-cdn/dev/apps/web/

### Arcs VR

https://polymerlabs.github.io/arcs-cdn/devv/apps/vr/

### Arcs ChromeCast

https://polymerlabs.github.io/arcs-cdn/dev/apps/chromecast/

### Arcs Home

TBD.

## Build Process

The Arcs engine and other primary resources live in https://github.com/PolymerLabs/arcs repository. `ArcsLib.js` (and other artifacts in `lib`) are built out of sources in `arcs`. Here are build instructions.

Initial Setup

1. Have local checkouts of **arcs** and **arcs-cdn** as siblings (i.e. the gulpfile in arcs-cdn expects to find mainline source code in ../arcs).

	**[path]/arcs
	[path]/arcs-cdn**

2. Install npm utilities for arcs-cdn (one time).

	[path]/arcs-cdn/> **npm install**

Building Arcs Lib

1. Build browser-loadable artifacts

	[path]/arcs-cdn/[version]/> **gulp**

2. Built artifacts should appear in [path]/arcs-cdn/[version]/lib.

## Testing

To run local tests (including running a full build and starting a local
server), run `npm test`. If you have a running server on localhost:8080 you
can skip the build by running `npm run test-test`. You can start a local
server with `npm start` as well.

### Debugging tests

If you see errors like

```
ERROR: connect ECONNREFUSED 127.0.0.1:9515
chrome
    at new RuntimeError (C:\Users\small\source\arcs\shell\node_modules\webdriverio\build\lib\utils\ErrorHandler.js:144:12)
    at Request._callback (C:\Users\small\source\arcs\shell\node_modules\webdriverio\build\lib\utils\RequestHandler.js:327:43)
```

It may indicate that chromedriver hasn't been installed completely. Run the install script:

```
node node_modules\chromedriver\install.js
```

