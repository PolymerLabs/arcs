# Arcs Chrome DevTools

## Installation as a Devtools Extension

Ensure you have all the node packages installed:
```
npm install
```

Install bower components of the webapp:

```
(cd devtools; bower install)
```

Build the webapp and split JS from the HTML to satisfy CSP restrictions for
Chrome Extensions:
```
./tools/sigh devtools
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

Running the tool against NodeJS doesn't require rebuilding, which is quicker for development.

To see the changes in the DevTools extension you'll need to rerun:
```
./tools/sigh devtools
```

If you made changes to the manifest, or if you're sure your changes are
not showing up, you should click the "Reload" button on the `chrome://extensions/` page.
