[![Build Status](https://travis-ci.org/PolymerLabs/arcs.svg?branch=master)](https://travis-ci.org/PolymerLabs/arcs)
[![Appveyor Build status](https://ci.appveyor.com/api/projects/status/rswlpkq2vtp9cns0?svg=true)](https://ci.appveyor.com/project/arcs/arcs-3i77k)


# arcs

Particle developers should visit our [particle developer website](https://polymerlabs.github.io/arcs-live/shell/docs/) instead of reading this document which is more geared towards Arcs core system developers.


A hosted version of Arcs is available in both tagged & bleeding edge forms.
Neither is stable - both the db and front-end are iterating rapidly.


Tagged release URLs have the form
`https://cdn.rawgit.com/PolymerLabs/arcs-live/<release_number>/shell/apps/web/index.html`
(the list of releases is
[here](https://github.com/PolymerLabs/arcs-live/releases)). A recent version
(latest as of this writing) is
[v0.3.5](https://cdn.rawgit.com/PolymerLabs/arcs-live/v0.3.5/shell/apps/web/index.html).

Bleeding edge often works and is available via github pages:
https://polymerlabs.github.io/arcs-live/shell/apps/web/.



## Install

Note that you need a **recent** version of Node because we use new ES6 features. v9 is definitely OK.

```
$ npm install
$ ./tools/sigh
```

## Starting Arcs

After the full build (`npm install && tools/sigh`) run: (note that `npm
start` will block, so you'll have to run the second command in a new shell):

```
$ npm start
```

Then open `http://localhost:8080/shell/apps/web/index.html` in a web browser
(or, on MacOS, use `open 'http://localhost:8080/shell/apps/web/index.html'`).

## Subprojects
Subcomponents have more detailed descriptions. Particularly the extensions
also have individual installation steps.

### Shell

For more information on the shell, see [shell](shell/README.md).

### Chrome Extension

See [extension](extension/README.md).

### Chrome Developer Tools Extension

See [devtools](devtools/README.md).

## Testing

The simplest way to run tests is to let the targets do all the work. These
commands will install all packages, run a build, start a background server,
run all the tests, and kill the background server:

```
$ npm install
$ npm run test-with-start
```

There are additional targets provided to run subsets of those commands.

- `npm start`: spins up a server (and blocks), serving in port 8080.
- `tools/sigh`: run a subset of tests and build packed artifacts.
- `npm test`: run all tests (using currently built artifacts) against an
  already-running server (assumed to be port 8080).
- `npm run test-no-web`: run all non-web tests.

### Debugging tests

If you see errors like

```
ERROR: connect ECONNREFUSED 127.0.0.1:9515
chrome
    at new RuntimeError (...\node_modules\webdriverio\build\lib\utils\ErrorHandler.js:144:12)
    at Request._callback (...\node_modules\webdriverio\build\lib\utils\RequestHandler.js:327:43)
```

It may indicate that chromedriver hasn't been installed completely. Run the install script:

```
node node_modules\chromedriver\install.js
```

### Debugging Selenium Failures

Selenium failures are often easy to cause due to seemingly unrelated changes,
and difficult to diagnose.

There are 2 main avenues to debug them in this system. The first is to have
the browser run in a graphical manner (as opposed to the default headless
configuration). The second is to actually debug the running selenium instance.

There are some debugging hints (code and configuration you can uncomment to
make debugging easier) in `test/specs/starter-test.js` and `test/wdio.conf.js`
marked with the phrase `debug hint`.

To activate a sane set of helpful debugging flags, there's a `wdio-debug`
command line argument that you can pass in. This will run Chrome in a
non-headless fashion, and will increase timeouts.

Through npm: `npm run test-wdio --wdio-debug=true` (or `npm test
--wdio-debug=true`).  Directly through wdio: `node_modules/.bin/wdio
--wdio-debug=true shell/test/wdio.conf.js`.

Webdriver takes screenshots of failures, which are saved to the
`./shell/test/errorShots/` directory. When running on Travis, the screenshots
are uploaded to the `Arcs Webdriver Screenshots` team drive.

#### Graphical (non-headless)

It may be easiest to see the problem in a browser window to diagnose it. Edit
`wdio.conf.js` in the branch with failures, comment out the `'--headless'`
option and increase the mocha timeout. In combination, these two changes will
allow you to see what's happening on the screen, and will give you enough time
to debug the situation.

```
arcs/shell> vi test/wdio.conf.js
arcs/shell> git diff test/wdio.conf.js
diff --git a/test/wdio.conf.js b/test/wdio.conf.js
index 0e36452..8ecf3d6 100644
--- a/test/wdio.conf.js
+++ b/test/wdio.conf.js
@@ -50,7 +50,7 @@ exports.config = {
       chromeOptions: {
         args: [
           // arcs note: comment this out to see the system running
-          '--headless'
+          // '--headless'
         ]
       }
     }
@@ -139,7 +139,7 @@ exports.config = {
   mochaOpts: {
     ui: 'bdd',
     // arcs note: increase this timeout for debugging
-    timeout: 20003
+    timeout: 2000003
   }
   //
   // =====
```

Then, in your test, you can add a breakpoint (via `browser.debug();`) to pause
execution so you can debug in the browser. It may be worthwhile to add several
`browser.debug()` invocations through your flow to trace execution (`.exit`
will exit the debugger and continue execution of the test).

At that point you can open up DevTools in the browser to debug the current
state, or inspect it visually. Some utilities (those in `selenium-utils.js`,
including `pierceShadows`) have already been loaded.

There are also some commands available natively at that point, including
`.help` and the `browser` variable (including methods such as
`browser.execute()`).

#### Attaching a Debugger

To attach a debugger, uncomment the `execArgv` `--inspect` configuration option.
It's likely that you'll still want to have increased the `mochaTimeout` and to
be running graphically, so those are in the example as well:

```
arcs/shell> git diff test/wdio.conf.js
diff --git a/test/wdio.conf.js b/test/wdio.conf.js
index 0e36452..4240c0a 100644
--- a/test/wdio.conf.js
+++ b/test/wdio.conf.js
@@ -50,11 +50,12 @@ exports.config = {
       chromeOptions: {
         args: [
           // arcs note: comment this out to see the system running
-          '--headless'
+          // '--headless'
         ]
       }
     }
   ],
+  execArgv: ['--inspect'],
   //
   // ===================
   // Test Configurations
@@ -139,7 +140,7 @@ exports.config = {
   mochaOpts: {
     ui: 'bdd',
     // arcs note: increase this timeout for debugging
-    timeout: 20003
+    timeout: 2000003
   }
   //
   // =====
```

When starting, you should see log item like `debugger listening on
ws://127.0.0.1:9229/..` as normally appears for [node
debugging](https://nodejs.org/api/debugger.html). Passing the `--inspect`
argument will also enable the [V8 Inspector
Integration](https://nodejs.org/api/debugger.html) which may be easier to use
(to activate this, look for a node icon in a Chrome DevTools process).

Adding `debugger;` statements may be the easiest way to activate the debugger.
Using `browser.debug();` statements to pause execution to give you time to
attach a debugger may be helpful as well.

## Releasing

Our release process is pretty minimal, but requires a few steps across the
[arcs](https://github.com/PolymerLabs/arcs) and
[arcs-live](https://github.com/PolymerLabs/arcs-live) repositories.

Our standard is to have the stable versions start with clean (empty)
databases, but to continue a single mainline/unstable database.

1) Decide what your new mainline and stable versions will be. For an example
  here, I'll use `0.3.5-alpha` as the old mainline, `0.3.6-alpha` as the new
  mainline, and `0.3.5` as the new stable version.

1) In order to keep the mainline data roughly consistent, clone the data at
  the current firebase key to the new mainline release number. To do this, I
  used the firebase web interface to "Export JSON" for the current tree, and
  "Import JSON" to the new tree.

  For example, clone from `<snip>/database/arcs-storage/data/0_3_5-alpha` to
  `<snip>/database/arcs-storage/data/0_3_6-alpha`.

  If the web interface is read-only due to too many nodes, you can visit the
  new version's URL directly to Import JSON.

1) Update the version in `shell/apps/common/firebase-config.js` to a
  reasonable stable version (in our example, `0.3.5`). See
  [#1114](https://github.com/PolymerLabs/arcs/pull/1114) for an example.
  Update the links README.md (this file) to reflect this new version.

1) Once the deploy is done to
  [arcs-live](https://github.com/PolymerLabs/arcs-live), create a new
  [release](https://github.com/PolymerLabs/arcs-live/releases). Note that we
  remap the versions slightly between the two systems for legibility in
  different systems - a version of `0_3_5` (in `firebase-config.js`) becomes
  `v0.3.5` (in the arcs-live repo).

1) Update the version in `shell/apps/common/firebase-config.js` to the
  new mainline development version (perhaps using the `-alpha` suffix; in our
  example, `0.3.6-alpha`).  See
  [#1155](https://github.com/PolymerLabs/arcs/pull/1155) for an example.
