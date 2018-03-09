[![Build Status](https://travis-ci.org/PolymerLabs/arcs.svg?branch=master)](https://travis-ci.org/PolymerLabs/arcs)

# arcs

Particle developers should visit our [particle developer website](https://polymerlabs.github.io/arcs-cdn/dev/) instead of reading this document which is more geared towards Arcs core system developers.

## Install

Note that you need a **recent** version of Node because we use new ES6 features. v9 is definitely OK.

```
$ ./tools/install
$ ./tools/sigh
```

## Starting Arcs

After the full build (`tools/install && tools/sigh`) run: (note that `npm
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
$ tools/install
$ npm test-with-start
```

There are additional targets provided to run subsets of those commands.

- To start a server, run `npm start`. This will spin up a server in the
  current directory serving on 8080.
- To build packed artifacts, run `tools/sigh`.
- To run tests against a currently running server, with the current set of
  built artifacts, run `npm run test`.

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
