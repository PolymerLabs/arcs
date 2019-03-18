# pipes-shell

Can be executed on either NodeJs or Browser platforms. Platform-agnostic code is at the top-level, platform-specific code is separated into folders:

- pipes-shell
  * // platform-agnostic sources
- node/
  - serve.sh // entry-point to execute the NodeJs application
  ...
- web/
  - index.html // entry-point to execute the Browser application
  ...

Also inside each platform folder is a deploy folder that contains tools for building deployments:

- [platform]
  - deploy // resources to build deployment
    - deploy.sh // constructs a deployment in dist/
    - stats.sh // creates `pack-stats.json`

`pack-stats.json` contains Webpack information that can be used in tools like [(Online) Webpack Visualizer](https://chrisbateman.github.io/webpack-visualizer/).

## Usage

pipes-shell exposes JS entry/exit points designed to be bound into another process. These entry points can also be exercised via console. Here are some examples:

```
> ShellApi.observeEntity(`{"type": "address", "name": "East Mumbleton"}`)
> ShellApi.receiveEntity(`{"type": "com.google.android.apps.maps"}`)
> ShellApi.receiveEntity(`{"type": "com.music.spotify"}`)
```
Results are returned via `DeviceClient.foundSuggestions(json)` (if it exists). Returned JSON depends on the type of entity that triggered the request. As of this writing, for `com.google.android.apps.maps` and `com.music.spotify`, the json encodes a single pipe-entity, e.g:

`{"type":"address","name":"East Pole","timestamp":1552937651253,"source":"com.unknown"}`

Example of implementing exit points for testing:
```
  window.DeviceClient = {
    shellReady() {
      console.warn('context is ready!');
    },
    foundSuggestions(json) {
    }
  };
```
Also, when run under headful chrome, clicking the display will run a test receive.

## Flags

pipes-shell/web/index.html?log[=[0..2]]&remote-explore-key=[key]&solo=[manifest-url]

- log[=level]
  - controls logging verbosity
    - 0 no logging
    - 1 logging from Particles only
    - 2 logging form Particles and Shell
  - if `level` is ommitted, it defaults to `log=2`
  - if `log` is ommitted, it defaults to `log=0`

- remote-explore-key
  - used to connect to remote devtools (aka Arcs Explorer)

- solo
  - fetch manifest from [manifest-url] instead of the default
  - if omitted, use default manifest

## Glitch Support

- pipes-shell imports `custom.recipes` from https://thorn-egret.glitch.me/
- `ShellApi.flush()` available clear caches (let changes to the glitch go into effect)
- tries to fail gracefully if `ArtistAutofill` isn't available

Note that the files in the glitch are copies of files in `particles/PipesApps` folder in the main repository (iow, they won't get lost if the glitch is blown up).
