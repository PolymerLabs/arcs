# Arcs Language Client (for VS Code)

A minimal language server protocol client for working with Arcs using VS Code.

## Features

Problems / Diagnostics: Basic
Snippets: Basic
Syntax Highlighting: In progress

## Requirements

Requires a working & building arcs environment and a version of VS Code in your path named 'code'.

Use the following npm command to install a dev version of the extension.

```
npm run install:vscodeclient
```

## Extension Settings

The extension also needs to know where arcs is installed (this also allows switching between different arcs installs during development).
This is controlled using VS Code's settings.

* `arcs.arcsPath`: Path pointing to the arcs repo root directory.

## Known Issues

The extension has undergone fairly little testing. Please report problems on [our github](https://github.com/PolymerLabs/arcs/).

## Release Notes

### 0.0.0

Initial Development release

-----------------------------------------------------------------------------------------------------------
