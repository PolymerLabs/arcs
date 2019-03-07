[![Build Status](https://travis-ci.org/PolymerLabs/arcs.svg?branch=master)](https://travis-ci.org/PolymerLabs/arcs)
[![AppVeyor Build status](https://ci.appveyor.com/api/projects/status/rswlpkq2vtp9cns0/branch/master?svg=true)](https://ci.appveyor.com/project/arcs/arcs-3i77k/branch/master)



# arcs

A hosted version of Arcs is available in both tagged and bleeding edge forms.
Neither is stable -- the runtime, database and front-end are all iterating rapidly.

[TypeDoc](https://polymerlabs.github.io/arcs-live/dist/apidocs/)
generated documentation is available for Arcs Runtime.

## Tagged Releases

Tagged release URLs have the form
`https://cdn.rawgit.com/PolymerLabs/arcs-live/<release_number>/shells/web-shell`
(the list of releases is
[here](https://github.com/PolymerLabs/arcs-live/releases)). A tagged release (with an older
path due to a previous version of shell code) is
[v0.4.1](https://cdn.rawgit.com/PolymerLabs/arcs-live/v0.4.1/shell/apps/web/index.html).

Bleeding edge often works and is available via github pages:
https://polymerlabs.github.io/arcs-live/shells/web-shell



## Install

Arcs is developed with a recent version of Node (v10.0.0 at the time of this
writing), in particular as we use new ES6 features. You can check our [Travis
config](https://github.com/PolymerLabs/arcs/blob/master/.travis.yml) to see what
version is used for automated build status. More recent versions should work,
but if for example you see test errors on a version that's a full release later
(ex. v11+) you may want to try rolling back to an earlier version. We welcome
patches that will allow more recent versions to operate, ideally without
requiring an upgrade to our current version.

### Installing from scratch

1) Install nvm.

   As per the [installation instructions](https://github.com/creationix/nvm/blob/master/README.md#installation),
   download and run the installation script directly in your terminal (yes, you
   read that correctly):

   ```
   $ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.11/install.sh | bash
   ```

   If you're using zsh you may need to `source ~/.nvm/nvm.sh` after this.

1) Install node.

   ```
   $ nvm install 10
   ```

1) If you need to update npm to a later version (our build checks for the
  minimum required version):

   ```
   $ npm install -g npm   # can use npm@6.3.0 to install a specific version
   ```

### Installing within the Arcs project:

```
$ npm install
$ ./tools/sigh
```

`npm install` is required on a fresh checkout. After that it only needs to be
re-run infrequently as new dependencies are included, and usually a build
failure will be the signal for that.

## Git Setup

You may also find it helpful to have sigh lint and type check your work locally
before you commit it. To do this, you can setup git to run presubmit checks
using:

```
$ git config core.hooksPath tools/hooks
```

### Windows Installation Notes

- [Git for Windows](https://git-scm.com/downloads) is one of many Git options.
- Consider using [nvm-windows](https://github.com/coreybutler/nvm-windows/)
  to allow more easily switching between Node versions.
- As part of `npm install` you'll need to build `fibers` which uses `node-gyp`
  which in turn requires `windows-build-tools`. Follow the [node-gyp Windows
  build instructions](https://github.com/nodejs/node-gyp#option-1). If option
  1 hangs or otherwise hits issues, you can try [option 2](
    https://github.com/nodejs/node-gyp#option-2). Note the
  [Microsoft Build Tools 2015](
    https://www.microsoft.com/en-us/download/details.aspx?id=48159) can be
  downloaded separately from Visual Studio (and the links in the `node-gyp`
  documentation are stale), but you'll still need to do the
  `npm config set msvs_version 2015` bit, and similar for Python if you
  install that manually per `node-gyp` option 2 instructions.

## Starting Arcs

After the full build (`npm install && tools/sigh`) run: (note that `npm
start` will block, so you'll have to run the second command in a new shell):

```
$ npm start
```

Then open `http://localhost:8080/shells/web-shell` in a web browser
(or, on MacOS, use `open 'http://localhost:8080/shells/web-shell`).

## Subprojects
Subcomponents have more detailed descriptions. Particularly the extensions
also have individual installation steps.

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

To run a specific Selenium test using Mocha's 'grep' capability:

- In one terminal: `npm start`
- In another: `npm run test-wdio-shells -- --mochaOpts.grep 'regex'`

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

Through npm: `npm run test-wdio-shells --wdio-debug=true` (or `npm test
--wdio-debug=true`).  Directly through wdio: `node_modules/.bin/wdio
--wdio-debug=true shell/test/wdio.conf.js`.

Webdriver takes screenshots of failures, which are saved to the
`./shells/test/errorShots/` directory. When running on Travis, the screenshots
are uploaded to the `Arcs Webdriver Screenshots` team drive.

#### Graphical (non-headless)

It may be easiest to see the problem in a browser window to diagnose it. Edit
`wdio.conf.js` in the branch with failures, comment out the `'--headless'`
option and increase the mocha timeout. In combination, these two changes will
allow you to see what's happening on the screen, and will give you enough time
to debug the situation.

```
arcs/shells> vi test/wdio.conf.js
arcs/shells> git diff test/wdio.conf.js
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
arcs/shells> git diff test/wdio.conf.js
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
