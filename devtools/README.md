# Arcs Chrome DevTools

## Installation as a Devtools Extension

Ensure you have all the node packages installed:
```
npm install
```

Open up the Chrome and navigate to `chrome://extensions/`.
Ensure "Developer Mode" is checked and click the "Load unpacked extension..." button.
Select `arcs/devtools` directory. `Arcs` tab will be now available in Chrome DevTools.

## Using with NodeJS

It is possible to use the tool directly against a NodeJS instance.
To do that, run a test with `--explore` flag:
```
./tools/sigh test -g "demo flow" --explore
```

You should see a message `Waiting for Arcs Explorer`.
Navigate to the `devtools/src/index.html` directory in the browser
(e.g. `localhost:5005/devtools/src/index.html`, assuming port `5005` and the server serving
files from the repo).

## Development

After making local changes you will need to close and re-open the DevTools panel in Chrome.

If you made changes to the manifest you should click the "Reload" button on
the `chrome://extensions/` page.

## Notes on tooling

In order to serve this web app without a build step we use [Empathy](https://github.com/PolymerLabs/empathy/tree/initial-implementation).
It creates the `assets` directory where it rewrites Polymer 3 dependencies
from `node_modules` to use local paths instead of NPM packages. Someday browsers
may support it [natively](https://github.com/domenic/package-name-maps), but
we're not there yet.

There's also a custom script `tools/css-module-wrap` wrapping external CSS file
into a `dom-module` wrapped inside a ES module. This is needed as Polymer 3
does not provide any way to import external stylesheets out of the box.
