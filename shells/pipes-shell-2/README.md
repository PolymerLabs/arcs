# shells/pipes-shell-2

### Dual Platform

Plaform code is in the `web` or `node` folders.

The web entry-point is `web/index.html`, the node entry-point is `node/serve.sh`.

There are deploy scripts for each platform, `web/deploy/deploy.sh` and `node/deploy/deploy.sh`. These scripts produce distributions into `web/deploy/dist` and `node/deploy/dist`, respectively.

### Flags

Flags are specified on the command line, or in the URL: e.g.:

`./serve.sh log test`
or
`index.html?log&test`

## Smoke Test

* test
  * run several simulated bus transactions

## Logging

* (no flag)
  * set logging level to 0
* log
  * set logging level to 2
* log=[level]
  * set logging level to [level]

#### Log Levels

* 0 = no logging
* 1 = particles/runtime-logging only
* 2 = add shell logging


