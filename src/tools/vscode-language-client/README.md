# Arcs Language Client (for VSCode)

A minimal language server protocol client for working with Arcs using VsCode.

## Features

Problems / Diagnostics: Basic
Snippets: Basic
Syntax Highlighting: In progress

## Requirements

Requires a working & building arcs environment and a version of VsCode in your path named 'code'.

Use the following npm command to install a dev version of the extension.

```
npm run install:vscodeclient
```

## Extension Settings

The extension also needs to know where arcs is installed (this also allows switching between different arcs installs during development).
This is controlled using VsCode's settings.

* `arcs.arcsPath`: Path pointing to the arcs repo root directory.

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 0.0.0

Initial Developement release

-----------------------------------------------------------------------------------------------------------
