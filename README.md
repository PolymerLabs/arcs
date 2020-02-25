[![Cloud Build Status](https://storage.googleapis.com/arcs-github-gcb-badges/builds/arcs/branches/master.svg)](https://console.cloud.google.com/cloud-build/builds?project=arcs-265404&pageState=(%22builds%22:(%22f%22:%22%255B%257B_22k_22_3A_22Trigger%2520Name_22_2C_22t_22_3A10_2C_22v_22_3A_22_5C_22Arcs-Master-Trigger_5C_22_22_2C_22s_22_3Atrue_2C_22i_22_3A_22triggerName_22%257D%255D%22)))
[![Build Status](https://travis-ci.org/PolymerLabs/arcs.svg?branch=master)](https://travis-ci.org/PolymerLabs/arcs)
[![AppVeyor Build status](https://ci.appveyor.com/api/projects/status/rswlpkq2vtp9cns0/branch/master?svg=true)](https://ci.appveyor.com/project/arcs/arcs-3i77k/branch/master)

# Arcs

A hosted version of Arcs is available at https://live.arcs.dev.

[TypeDoc](https://live.arcs.dev/dist/apidocs/)
generated documentation is available for Arcs Runtime.

## Install

Arcs is developed with a recent version of Node. You can check our [Travis
config](https://github.com/PolymerLabs/arcs/blob/master/.travis.yml) to see what
version is used for automated build status. More recent versions should work,
but if for example you see test errors on a version that's a full release later
you may want to try rolling back to an earlier version. We welcome
patches that will allow more recent versions to operate, ideally without
requiring an upgrade to our current version.

### Installing the easy way

1) Run the setup script (MacOS, Linux)

   ```
   $ ./tools/setup
   ```

2) That's it! (You can skip the next section.)


### Installing from scratch

1) Install nvm.

   As per the [installation instructions](https://github.com/creationix/nvm/blob/master/README.md#installation),
   download and run the installation script directly in your terminal (yes, you
   read that correctly):

   ```
   $ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
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

1) Optional: install Bazel (required for building/running WebAssembly particles,
   optional if you only want to develop using JavaScript). See the
   `./tools/setup` script for the correct version of Bazel to install. See the
   [C++ wasm instructions](src/wasm/cpp/README.md) for more info.

### Installing within the Arcs project:

```
$ ./tools/npm-install-all
$ ./tools/sigh
```

`./tools/npm-install-all` is required on a fresh checkout. After that it only
needs to be re-run infrequently as new dependencies are included, and usually a
build failure will be the signal for that.

## Git Setup

You may also find it helpful to have run our presubmit checks locally before
you push your commits. To do this, you can setup git to run these checks using:

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
- If you encounter errors due to spaces in your user name directory
  with either `Git Bash` or `nvm`, you may benefit from solutions
  described [here](https://stackoverflow.com/questions/24557224/git-bash-path-cannot-parse-windows-directory-with-space) and [here](https://github.com/coreybutler/nvm-windows/issues/41).

### Mac Installation Notes

- When installing, if you run into SSL Cert verification errors, consider certifying Python 3.6 on Mac:
`/Applications/Python\ 3.6/Install\ Certificates.command` ([source](https://stackoverflow.com/a/42334357))

## Starting Arcs

After the full build (`./tools/npm-install-all && tools/sigh`) run:

```
$ tools/sigh devServer
```

Then open `http://localhost:8786/shells/web-shell/` in a web browser
(or, on MacOS, use `open 'http://localhost:8786/shells/web-shell/`).

## Subprojects

Subcomponents have more detailed descriptions. Particularly the extensions
also have individual installation steps.

### Chrome Extension

See [extension](extension/README.md).

### Chrome Developer Tools Extension

See [devtools](devtools/README.md).

## IDE Setup

See [IDE Setup](docs/IDE-Setup.md).

## Testing

The simplest way to run tests is to let the targets do all the work. These
commands will install all packages, run a build, start a background server,
run all the tests, and kill the background server:

```
$ tools/sigh test && tools/sigh testShells && tools/sigh testWdioShells
$ tools/local-presubmit
```

There are additional targets provided to run subsets of those commands.

- `tools/sigh devServer`: spins up a server (and blocks), serving on port 8786.
- `./tools/sigh`: run a subset of tests and build packed artifacts.

To run a specific Selenium test using Mocha's 'grep' capability:
`./tools/sigh test --grep 'regex'`. In addition, for unit tests you can run
only a single test case by using `it.only()` instead of `it()`, or a single
suite using `describe.only()` instead of `describe()`.

### WebAssembly tests

Test using Bazel (run from your repo root):

First you will need to make sure you have set the path attribute of
android_sdk_repository or the ANDROID_HOME environment variable. To
do this, you can run the following commands:
```
export ANDROID_HOME=$Path_to_SDK
```
If you don't know the path to the Android SDK, you can find it using
Android Studio by going to the SDK Manager tool.
```
export PATH=$PATH:$ANDROID_HOME/platform-tools
```
To update the path in your terminal, either restart terminal or run `source ~/.bash_profile` on Mac or `source ~/.bashrc` on Linux.
To verify ANDROID_HOME has been set properly, you can run
`echo $ANDROID_HOME`.

Once your Android environment has been setup, you can run the tests
using bazel:
```
./tools/bazelisk test javatests/...
```

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

#### Debugging unit tests in Chrome

You can attach the Chrome debugger to debug your unit tests using the
`--inspect` flag:

```
./tools/sigh test --inspect
```

It will wait for you to attach your debugger before running the tests. Open
[chrome://inspect] and look for the "inspect" button under the "Remote Target"
heading. You can use `Ctrl-P` to open files (you may need to add the `build`
folder to your workspace first). Hit "resume" to start running the unit tests.

### Debugging WebDriver Failures

WebDriver failures are often easy to cause due to seemingly unrelated changes,
and difficult to diagnose.

There are 2 main avenues to debug them in this system. The first is to
have the browser run in a graphical manner (as opposed to the default
headless configuration). The second is to actually debug the running
WebDriver instance.

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
state, or inspect it visually.

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
