# shells/lib

## Platform agnostic (Web/Nodejs) library for Arcs

### Import the platform-specific Environment module

- project entry-point should import one of:
  - lib/env/node/env.js
  - lib/env/web/env.js

### Import any needed platform-agnostic library modules

- any of lib/*.js

## smoke-shell example

- smoke-shell has two entry-points
  - smoke-shell/node/serve.sh (nodejs)
    - imports lib/env/node/env.js
  - smoke-shell/web/smoke.html (web)
    - imports lib/env/web/env.js

- smoke-shell's main implementation is platform-agnostic
  - app.js
    - imports lib/util.js


