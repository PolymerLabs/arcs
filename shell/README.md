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

In the shell directory:

```
npm install
npm run build
```

Subsequently, as long as the `package.json` remains consistent, just `npm run
build` is required to update the packed browser files.

## Testing

To run local tests (including running a full build and starting a local
server), run `npm test`. If you have a running server on `localhost:8080` and
there are no changes made to the runtime you can skip starting the server and
running the build by using `npm run test-test`. You can start a local server
with `npm start` as well.

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

