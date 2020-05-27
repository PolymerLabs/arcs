# Arcs Explorer

Arcs Explorer gives visibility into Arcs Runtime, allowing inspecting storage,
arc structure, log of execution and details of planning.

It can connect to Arcs Runtime using one of 3 transport channels:

* Chrome Extension Message Passing - if using with a local WebShell as a Chrome Extension.
* WebSocket - if connecting to a Node.js server or using a WebSocket proxy server.
* WebRTC - if connecting to a remote runtime without using a proxy server.

## Pre-requisite

Ensure you have all the node packages installed:
```
npm install
```

TODO(#5379) Fix Post-install script for full setup.

## Using with local WebShell as a Chrome Extension

Open up the Chrome and navigate to `chrome://extensions/`.
Ensure "Developer Mode" is checked and click the "Load unpacked extension..." button.
Select `arcs/devtools` directory. 'Arcs' tab will be now available in Chrome DevTools.

## Using with Tests or a Planner Shell

It is possible for Arcs Explorer to Node.js server directly. With both Tests and the
Planner Shell use `--explore` flag when starting to open up a WebSocket connection for
Arcs Explorer:

```
./tools/sigh test -g "demo flow" --explore
```
or
```
cd shells/planner-shell/ && ./serve.sh --explore
```

You should see a message `Waiting for Arcs Explorer`.
Navigate to the `devtools/` directory in the browser
(e.g. `localhost:8786/devtools/`, assuming port `8786` and the server serving
files from the repo).

## Using with remote Arcs

To pair remote Arcs with Arcs Explorer you can use `remote-explore-key` URL parameter.
The value of the parameter is a pairing key.

E.g.

Open up the following URL on the first machine:
```
https://live.arcs.dev/shells/web-shell/?remote-explore-key=uniquekey
```

And the following on the second machine:
```
https://live.arcs.dev/devtools/?remote-explore-key=uniquekey
```

There are certain network configurations that will not allow such communication without
a TURN server to proxy it. We don't currently have a TURN server set up.

## Using with a WebSocket proxy

WebSocket proxy is useful if you are working with Arcs embedded on a mobile device,
and the device is on a different network than your development machine. If network
configuration doesn't allow connecting with the `remote-explore-key` URL parameter,
starting a WebSocket proxy is our last resort.

To start the proxy run:
```
./tools/sigh devServer
```

Note that this server plays the same role and uses the same port as the web server
started by `npm run`, so you will need to shut down the latter you have it running.

Now we need to set up the port forwarding. You can either set it up with Chrome
DevTools, use at `chrome://inspect` or by executing `adb reverse tcp:8786 tcp:8786`.

Now you can use `explore-proxy` URL parameter with the Arcs embedding to connect to
Arcs Explorer running on your development machine.

E.g.

Arcs embedding on the Android device would get this parameter appended:
```
file://your-local-arcs-shell/?explore-proxy
```

And Arcs Explorer can be run without any parameters, as WebSocket is a default in the
absence of Chrome Extension context and WebRTC parameters.
```
http://localhost:8786/devtools/
```

## Development

After making local changes you will need to close and re-open the DevTools panel in Chrome.

If you made changes to the manifest or the content script you should click the "Reload"
button on the `chrome://extensions/` page.

## Notes on tooling

In order to serve this web app without a build step we use [Compassion](https://github.com/shaper/compassion).
It creates the `assets` directory where it rewrites Polymer 3 dependencies
from `node_modules` to use local paths instead of NPM packages. Someday browsers
may support it [natively](https://github.com/domenic/package-name-maps), but
we're not there yet.

There's also a custom script `tools/css-module-wrap` wrapping external CSS file
into a `dom-module` wrapped inside a ES module. This is needed as Polymer 3
does not provide any way to import external stylesheets out of the box.
