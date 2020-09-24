# How to contribute to Arcs

Thank you for taking the time to contribute to the Arcs project. 
This guide outlines how to become an Arcs developer.

**Table of Contents**

[Workflow](#workflow)
* [Filing Bugs](#filing-bugs)
* [Contributing a Patch](#contributing-a-patch)

[Developer Installation](#developer-installation)
* [Additional Bazel Installation](#additional-bazel-installation)
* [Windows Installation Notes](#windows-installation-notes)
* [Mac Installation Notes](#mac-installation-notes)
* [IDE Setup](#ide-setup)
* [Git Setup](#git-setup)

[Starting Arcs](#starting-arcs)

[Testing](#testing)
* [WebAssembly tests](#webassembly-tests)
* [Debugging tests](#debugging-tests)
  * [Debugging unit tests in Chrome](#debugging-unit-tests-in-chrome)
* [Debugging WebDriver Failures](#debugging-webdriver-failures)
  * [Graphical (non-headless)](#graphical-non-headless)
  * [Attaching a Debugger](#attaching-a-debugger)


## Workflow

### Filing Bugs

**If you notice a security issue, please file a bug.**

* Before filing an [issue](https://github.com/PolymerLabs/arcs/issues), please check if one already exists. 

* After filing an issue, please attach an appropriate [label](https://github.com/PolymerLabs/arcs/labels).

* Questions are welcome! If you do ask a question that doesn't have an answer, please add the 
[question](https://github.com/PolymerLabs/arcs/labels/question) or 
[design question](https://github.com/PolymerLabs/arcs/labels/design%20question) label to your issue.

* All `TODO`s in the project need to be tracked with a buginizer bug or an issue (e.g. `TODO(#3838)`).

* The Arcs [approved committers](AUTHORS.md) will do their best to synchronize internal and external issue tracking.

### Contributing a Patch

1) Create a PR and go through reviews.

   If you are an external contributor, you will have to agree to the 
   [Contributor License Agreement](https://opensource.google/docs/cla/).

1) When you are ready to merge, add the "ready to pull" label to your PR.

   This will trigger an internal review process for the change. If you are an 
   internal contributor, please click `+2` to the Safe Review. Otherwise, please
   reach out to an [approved committer](AUTHORS.md) to help you land the change.
   
1) [Copybara](https://github.com/google/copybara) will create another import CL. 
   Get _another [approved committer](AUTHORS.md)_ to approve the CL.
   
1) When GCB and our internal integration tests are green, the import CL will be
   automatically submitted and the corresponding PR will be merged on GitHub.

## Developer Installation

1) Install nvm.

   As per the [installation instructions](https://github.com/creationix/nvm/blob/master/README.md#installation),
   download and run the installation script directly in your terminal (yes, you
   read that correctly):

   ```shell script
   $ curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
   ```

   If you're using zsh you may need to `source ~/.nvm/nvm.sh` after this.

1) Install node.

   ```shell script
   $ nvm install 10
   ```

1) If you need to update npm to a later version (our build checks for the
  minimum required version):

   ```shell script
   $ npm install -g npm   # can use npm@6.3.0 to install a specific version
   ```
   
1) Setup subprojects & invoke `sigh`.

    ```shell script
    $ tools/npm-install-all
    $ tools/sigh
    ```

    `tools/npm-install-all` is required on a fresh checkout. After that it only
    needs to be re-run infrequently as new dependencies are included, and usually a
    build failure will be the signal for that.
    
    `tools/sigh` is the web-runtime's main build tool. Please run `tools/sigh --help`
    to see all available commands.

### Additional Bazel Installation

If you only want to develop using JavaScript, the following instructions are optional.
These are required for building / running WebAssembly particles, or working with Android.

1) Install Bazel.
   
   Please follow the [official docs](https://docs.bazel.build/versions/master/install.html) to 
   learn how to install Bazel on your machine. 
   
1) Install the Android SDK.

   Follow steps 1-3 of [this section of the IDE Setup doc](docs/IDE-Setup.md#add-android-support) to install the 
   Android SDK. 
   
1) Install [ktlint](https://ktlint.github.io/).

   ```shell script
   $ mkdir -p $HOME/bin && cd $HOME/bin && curl -L -s -O https://github.com/pinterest/ktlint/releases/download/0.35.0/ktlint && cd -
   $ chmod a+x $HOME/bin/ktlint
   $ echo 'export PATH="$HOME/bin:$PATH"' >> $HOME/.bashrc
   ```
   
   Thereafter, lint checks can be done with `tools/sigh lint` or `tools/sigh ktlint`.
   
1) Build & run targets with Bazelisk
   
   Our project manages Bazel versions with Bazelisk. To run a test or build a target, please 
   use the wrapper in `tools/`. For example:
   
   ```shell script
   $ tools/bazelisk sync
   $ tools/bazelisk build //java/...
   $ tools/bazelisk test //javatests/...
   ```
   
1) For more information about Wasm, see the [C++ wasm instructions](src/wasm/cpp/README.md).


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
  described [here](https://stackoverflow.com/questions/24557224/git-bash-path-cannot-parse-windows-directory-with-space)
  and [here](https://github.com/coreybutler/nvm-windows/issues/41).

### Mac Installation Notes

- Instructions above assume that Command Line Tools are installed. To check or install these, run the 
  following command:
  
  `xcode-select --version || xcode-select --install`
- When installing, if you run into SSL Cert verification errors, consider certifying Python 3.6 on Mac:
`/Applications/Python\ 3.6/Install\ Certificates.command` ([source](https://stackoverflow.com/a/42334357))


### IDE Setup

See [IDE Setup](docs/IDE-Setup.md) for further instruction on IntelliJ & Android Studio integration.

### Git Setup

You may also find it helpful to have run our presubmit checks locally before
you push your commits. To do this, you can setup git to run these checks using:

```
$ git config core.hooksPath tools/hooks
```

## Starting Arcs

After the full build (`tools/npm-install-all && tools/sigh`) run:

```
$ tools/sigh devServer
```

Then open `http://localhost:8786/shells/web-shell/` in a web browser
(or, on MacOS, use `open 'http://localhost:8786/shells/web-shell/`).

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
- `tools/sigh`: run a subset of tests and build packed artifacts.

To run a specific Selenium test using Mocha's 'grep' capability:
`tools/sigh test --grep 'regex'`. In addition, for unit tests you can run
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
To update the path in your terminal, either restart terminal or run
`source ~/.bash_profile` on Mac or `source ~/.bashrc` on Linux.
To verify ANDROID_HOME has been set properly, you can run
`echo $ANDROID_HOME`.

Once your Android environment has been setup, you can run the tests
using bazel:
```
tools/bazelisk test javatests/...
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
tools/sigh test --inspect
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
`./shells/test/errorShots/` directory.

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
