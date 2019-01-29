# shells/lib

Is a platform-agnostic (Web/Nodejs) library of Arcs middle-ware.

### Import platform-specific code

- for web environment, project entry-point must load the following scripts:

```
<!-- may be `import`ed -->
<script src="..//lib/build/pouchdb.js"></script>
<script src="../lib/build/firebase.js"></script>
<!-- cannot be `import`ed (tries to use `this`) -->
<script src="../../node_modules/sourcemapped-stacktrace/dist/sourcemapped-stacktrace.js"></script>
```

### Import any platform-agnostic library modules

- any of lib/*.js

### Accessing environment objects

```
import {Utils} from 'lib/utils.js'
Utils.init([relative path from document root to arcs root]);
console.log(Utils.env.loader, Utils.env.pecFactory);
```

## smoke-shell example

- smoke-shell has two entry-points
  - smoke-shell/serve.sh (nodejs)
  - smoke-shell/smoke.html (web)
- smoke-shell's main implementation is platform-agnostic
  - app.js


