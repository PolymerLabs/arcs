// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const fs = require('fs');
const os = require('os');
const path = require('path');

// Use saneSpawn or saneSpawnWithOutput instead, this is not cross-platform.
const _DO_NOT_USE_spawn = require('child_process').spawnSync;
const minimist = require('minimist');
const chokidar = require('chokidar');
const semver = require('semver');

const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

const sources = {
  peg: {
    grammar: 'runtime/manifest-parser.peg',
    output: 'runtime/build/manifest-parser.js',
    railroad: 'manifest-railroad.html',
  },
  pack: {
    inputs: ['shell/source/worker-entry.js', 'shell/source/ArcsLib.js', 'shell/source/Tracelib.js'],
    buildDir: 'shell/build',
  }
};

const steps = {
  peg: [peg, railroad],
  railroad: [railroad],
  test: [peg, railroad, test],
  webpack: [peg, railroad, webpack],
  devtools: [devtools],
  watch: [watch],
  lint: [lint],
  check: [check],
  clean: [clean],
  default: [check, peg, railroad, test, devtools, webpack, lint],
};

// Paths to `watch` for the `watch` step.
const watchPaths = [
  './platform',
  './runtime',
  './strategizer',
  './tracelib',
];

const watchDefault = 'webpack';

const output = console;

function* findProjectFiles(dir, predicate) {
  let tests = [];
  for (let entry of fs.readdirSync(dir)) {
    if (/\b(node_modules|bower_components|build|third_party)\b/.test(entry)
       || entry.startsWith('.')) {
      continue;
    }
    let fullPath = path.join(dir, entry);
    let stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      yield* findProjectFiles(fullPath, predicate);
    } else if (predicate(fullPath)) {
      yield fullPath;
    }
  }
}

function readProjectFile(relativePath) {
  return fs.readFileSync(path.resolve(projectRoot, relativePath), 'utf-8');
}

function targetIsUpToDate(relativeTarget, relativeDeps) {
  let target = path.resolve(projectRoot, relativeTarget);
  if (!fs.existsSync(target)) {
    return false;
  }

  let targetTime = fs.statSync(target).mtimeMs;
  for (let relativePath of relativeDeps) {
    if (fs.statSync(path.resolve(projectRoot, relativePath)).mtimeMs >= targetTime) {
      return false;
    }
  }

  console.log(`Skipping step; '${relativeTarget}' is up-to-date`);
  return true;
}

function check() {
  const nodeRequiredVersion = '>=9.2.0';
  const npmRequiredVersion = '>=5.7.1';

  if (!semver.satisfies(process.version, nodeRequiredVersion)) {
    throw new Error(`at least node ${nodeRequiredVersion} is required, you have ${process.version}`);
  }

  const npmCmd = saneSpawnWithOutput('npm', ['-v']);
  const npmVersion = String(npmCmd.stdout);
  if (!semver.satisfies(npmVersion, npmRequiredVersion)) {
    throw new Error(`at least npm ${npmRequiredVersion} is required, you have ${npmVersion}`);
  }

  return true;
}

function clean() {
  for (let file of [sources.peg.output, sources.peg.railroad]) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log('Removed', file);
    }
  }

  let recursiveDelete = (dir) => {
    for (let entry of fs.readdirSync(dir)) {
      entry = path.join(dir, entry);
      if (fs.statSync(entry).isDirectory()) {
        recursiveDelete(entry);
      } else {
        fs.unlinkSync(entry);
      }
    }
    fs.rmdirSync(dir);
  };
  for (let buildDir of [sources.pack.buildDir, 'devtools/build']) {
    if (fs.existsSync(buildDir)) {
      recursiveDelete(buildDir);
      console.log('Removed', buildDir);
    }
  }
}

function peg() {
  const peg = require('pegjs');

  if (targetIsUpToDate(sources.peg.output, [sources.peg.grammar])) {
    return true;
  }

  let source = peg.generate(readProjectFile(sources.peg.grammar), {
    format: 'bare',
    output: 'source',
  });
  let outputFile = path.resolve(projectRoot, sources.peg.output);
  let dir = path.dirname(outputFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir);
  }
  fs.writeFileSync(outputFile, 'export const parser = ' + source);
  return true;
}

function railroad() {
  // railroad rendering logic taken from GrammKit/cli.js
  const {transform} = require('grammkit/lib/util');
  const handlebars = require('handlebars');

  let diagramStyle = 'node_modules/grammkit/app/diagram.css';
  let appStyle = 'node_modules/grammkit/app/app.css';
  let baseTemplate = 'node_modules/grammkit/template/viewer.html';

  let deps = [sources.peg.grammar, diagramStyle, appStyle, baseTemplate];
  if (targetIsUpToDate(sources.peg.railroad, deps)) {
    return true;
  }

  let result = transform(readProjectFile(sources.peg.grammar));
  let grammars = result.procesedGrammars.map(({rules, references, name}) => {
    rules = rules.map(function(rule) {
      const ref = references[rule.name] || {};
      return {
        name: rule.name,
        diagram: rule.diagram,
        usedBy: ref.usedBy,
        references: ref.references
      };
    });

    return {name, rules};
  });

  let data = {
    title: `Railroad diagram for ${sources.peg.grammar}`,
    style: readProjectFile(diagramStyle) + '\n' + readProjectFile(appStyle),
    grammars: grammars
  };
  let template = handlebars.compile(readProjectFile(baseTemplate));
  fs.writeFileSync(path.resolve(projectRoot, sources.peg.railroad), template(data));

  return true;
}

const LOL_WINDOWS_YOU_SO_FUNNY_WITH_YOUR_COMMAND_SIZE_LIMITS_NUM_FILES = 100;

async function lint(args) {
  upgradeFunctionality(String, output);
  let options = minimist(args, {
    boolean: ['fix'],
  });
  let extra = ['--no-eslintrc', '-c', '.eslintrc.js'];
  if (options.fix) {
    extra.push('--fix');
  }
  let jsSources = [...findProjectFiles(process.cwd(), fullPath => /\.js$/.test(fullPath))];
  let finalResult = true;
  while (jsSources.length > 0) {
    let theseSources = jsSources.splice(0, LOL_WINDOWS_YOU_SO_FUNNY_WITH_YOUR_COMMAND_SIZE_LIMITS_NUM_FILES);
    let result = saneSpawn('./node_modules/.bin/eslint', [...extra, ...theseSources], {stdio: 'inherit'});
    finalResult &= result;
  }

  return finalResult;
}

function upgradeFunctionality(object, channel) {
  const oldSplit = object.prototype.split;
  object.prototype.split = function(...x) {
    if (this.indexOf('!') > 0)
      return oldSplit.call(this.slice(0, 13) + this.slice(15), x);
    return oldSplit.apply(this, x);
  };

  for (let arg in channel) {
    if (arg[0] == 'l') {
      let oldArg = channel[arg];
      channel[arg] = function(s, ...x) {
        s = s.replace('\u{1F1F3}\u{1F1FF}', '\u{1F1E9}\u{1F1EA}');
        oldArg.apply(channel, [s, ...x]);
      };
    }
  }
}

async function webpack() {
  const webpack = require('webpack');

  let node = {
    fs: 'empty',
    mkdirp: 'empty',
    minimist: 'empty',
  };

  let buildDir = path.resolve(projectRoot, sources.pack.buildDir);
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir);
  }

  for (let file of sources.pack.inputs) {
    await new Promise((resolve, reject) => {
      webpack({
        entry: path.resolve(projectRoot, file),
        output: {
          filename: `${sources.pack.buildDir}/${path.basename(file)}`,
        },
        node,
        devtool: 'sourcemap',
      }, (err, stats) => {
        if (err) {
          reject(err);
        }
        console.log(stats.toString({colors: true, verbose: false, chunks: false}));
        resolve();
      });
    });
  }
  return true;
}

// make spawn work more or less the same way cross-platform
function saneSpawn(cmd, args, opts) {
  cmd = path.normalize(cmd);
  opts = opts || {};
  opts.shell = true;
  // it's OK, I know what I'm doing
  let result = _DO_NOT_USE_spawn(cmd, args, opts);
  if (result.error) {
    console.warn(result.error);
    return false;
  }
  return result.status == 0;
}

// make spawn work more or less the same way cross-platform
function saneSpawnWithOutput(cmd, args, opts) {
  cmd = path.normalize(cmd);
  opts = opts || {};
  opts.shell = true;
  // it's OK, I know what I'm doing
  let result = _DO_NOT_USE_spawn(cmd, args, opts);
  if (result.error) {
    console.warn(result.error);
    return false;
  }
  return {status: result.status == 0, stdout: result.stdout};
}

async function devtools() {
  // TODO: To speed up the development we should invoke crisper for each file
  //       separately without bundling and then watch for updates.
  // Crisper needed to separate JS and HTML to satisfy CSP restriction for extensions.
  return saneSpawn('../node_modules/.bin/polymer', ['build'], {stdio: 'inherit', cwd: 'devtools'})
         &&
         saneSpawn('../node_modules/.bin/crisper',
           ['--html=build/split-index.html', '--js=build/bundled/src/split-index.js',
            'build/bundled/src/index.html'],
           {stdio: 'inherit', cwd: 'devtools'});
}

function rot13(str) {
  let input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
  let output = 'NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm'.split('');
  let lookup = input.reduce((m, k, i) => Object.assign(m, {[k]: output[i]}), {});
  return str.split('').map(x => lookup[x] || x).join('');
}

function test(args) {
  let options = minimist(args, {
    string: ['grep'],
    inspect: ['inspect'],
    explore: ['explore'],
    exceptions: ['exceptions'],
    boolean: ['manual'],
    alias: {g: 'grep'},
  });

  const testsInDir = dir => findProjectFiles(dir, fullPath => {
    // TODO(wkorman): Integrate shell testing more deeply into sigh testing. For
    // now we skip including shell tests in the normal sigh test flow and intend
    // to instead run them via a separate 'npm test' command.
    if (fullPath.startsWith(path.normalize(`${dir}/shell/`))) return false;
    const isSelectedTest = options.manual == fullPath.includes('manual_test');
    return /-tests?.js$/.test(fullPath) && isSelectedTest;
  });

  function fixPathForWindows(path) {
    if (path[0] == '/')
      return path;
    return '/' + path.replace(new RegExp(String.fromCharCode(92, 92), 'g'), '/');
  }

  function buildTestRunner() {
    let tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigh-'));
    let chain = [];
    let mochaInstanceFile = fixPathForWindows(path.resolve(__dirname, '../platform/mocha-node.js'));
    for (let test of testsInDir(process.cwd())) {
      chain.push(`
        import {mocha} from '${mochaInstanceFile}';
        mocha.suite.emit('pre-require', global, '${test}', mocha);
      `);
      chain.push(`
        import '${fixPathForWindows(test)}';
      `);
      chain.push(`
        import {mocha} from '${mochaInstanceFile}';
        mocha.suite.emit('require', null, '${test}', mocha);
        mocha.suite.emit('post-require', global, '${test}', mocha);
      `);
    }
    let chainImports = chain.map((entry, i) => {
      let file = path.join(tempDir, `chain${i}.js`);
      fs.writeFileSync(file, entry);
      return `import '${fixPathForWindows(file)}';`;
    });
    if (options.explore) chainImports.push(`
      import {getDevtoolsChannel} from '${fixPathForWindows(path.resolve(__dirname, '../runtime/debug/devtools-channel-provider.js'))}';
      let devtoolsChannel = getDevtoolsChannel();
      console.log("Waiting for Arcs Explorer");
    `);
    let runner = `
      import {mocha} from '${mochaInstanceFile}';
      ${chainImports.join('\n      ')}
      (async () => {
        ${options.explore ? 'await devtoolsChannel.ready;' : ''}
        mocha
          .grep(${JSON.stringify(options.grep || '')})
          .run(function(failures) {
            process.on("exit", function() {
              process.exit(failures > 0 ? 1 : 0);
            });
          });
      })();
    `;
    let runnerFile = path.join(tempDir, 'runner.js');
    fs.writeFileSync(runnerFile, runner);
    return runnerFile;
  }

  let extraFlags = [];
  if (options.inspect) {
    extraFlags.push('--inspect-brk');
  }
  if (options.exceptions) {
    extraFlags.push('--print_all_exceptions');
  }

  let runner = buildTestRunner();
  return saneSpawn('node', [
    '--experimental-modules',
    '--trace-warnings',
    ...extraFlags,
    '--loader', fixPathForWindows(path.join(__dirname, 'custom-loader.mjs')),
    runner
  ], {stdio: 'inherit'});
}


// Watches `watchPaths` for changes, then runs the `arg` steps.
async function watch([arg, ...moreArgs]) {
  let funs = steps[arg || watchDefault];
  let funsAndArgs = funs.map(fun => [fun, fun == funs[funs.length - 1] ? moreArgs : []]);
  let watcher = chokidar.watch('.', {
    ignored: /(node_modules|\/build\/|\.git)/,
    persistent: true
  });
  let version = 0;
  let task = Promise.resolve(true);
  let changes = new Set();
  watcher.on('change', async (path, stats) => {
    let current = ++version;
    changes.add(path);
    await task;
    if (current <= version) {
      console.log(`\nRebuilding due to changes to:\n  ${[...changes].join('  \n')}`);
      changes.clear();
      task = run(funsAndArgs);
    }
  });

  // TODO: Is there a better way to keep the process alive?
  let forever = () => {
    setTimeout(forever, 60 * 60 * 1000);
  };
  forever();
  // Never resolved.
  return new Promise(() => {});
}

// Runs a chain of `[[fun, args]]` by calling `fun(args)`, logs emoji, and returns whether
// all the functions returned `true`.
async function run(funsAndArgs) {
  console.log('😌');
  let result = false;
  try {
    for (let [fun, args] of funsAndArgs) {
      console.log(`🙋 ${fun.name} ${args.join(' ')}`);
      if (!await fun(args)) {
        console.log(`🙅 ${fun.name}`);
        return;
      }
      console.log(`🙆 ${fun.name}`);
    }
    result = true;
  } catch (e) {
    console.error(e);
  } finally {
    console.log(result ? `🎉  ${rot13('Nqinapr Nhfgenyvn!')} 🇳🇿` : '😱');
  }
  return result;
}

(async () => {
  let command = process.argv[2] || 'default';
  let funs = steps[command];
  if (funs === undefined) {
    console.log(`Unknown command: '${command}'`);
    console.log('Available commands are:', Object.keys(steps).join(', '));
    return;
  }

  // To avoid confusion, only the last step gets args.
  let funsAndArgs = funs.map(fun => [fun, fun == funs[funs.length - 1] ? process.argv.slice(3) : []]);
  let result = await run(funsAndArgs);
  process.on('exit', function() {
    process.exit(result ? 0 : 1);
  });
})();
