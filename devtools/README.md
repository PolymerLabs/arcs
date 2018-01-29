# Arcs Chrome DevTools Extension

## Installation

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
Click the "Load unpacked extension..." button, and select `arcs/devtools` directory.
`Arcs` tab will be now available in the DevTools.

## Development

After making changes to the code, you'll need to rerun:

```
./tools/sigh devtools
```

In order to bundle the code together and split javascript from HTML due to CSP
restrictions for Chrome Extensions.

If you made changes to the manifest, or if you're sure your changes are
not showing up, you should click the "Reload" button on the `chrome://extensions/` page.
