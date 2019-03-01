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

### Flags

pipes-shell/web/index.html?log[=[0..2]]&remote-explore-key=[key]

- log[=level]
  - controls logging verbosity
    - 0 no logging
    - 1 logging from Particles only
    - 2 logging form Particles and Shell
  - if `level` is ommitted, it defaults to `log=2`
  - if `log` is ommitted, it defaults to `log=0`

- remote-explore-key
  - used to connect to remote devtools (aka Arcs Explorer)
