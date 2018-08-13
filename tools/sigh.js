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
    inputs: [
      'shell/source/worker-entry.js',
      'shell/source/ArcsLib.js',
      'shell/source/Tracelib.js'
    ],
    buildDir: 'shell/build',
  }
};

const steps = {
  peg: [peg, railroad],
  railroad: [railroad],
  test: [peg, railroad, tsc, test],
  webpack: [peg, railroad, tsc, webpack],
  watch: [watch],
  lint: [lint],
  check: [check],
  clean: [clean],
  default: [check, peg, railroad, tsc, test, webpack, lint],
};

// Paths to `watch` for the `watch` step.
const watchPaths = [
  './platform',
  './runtime',
  './strategizer',
  './tracelib',
];

const watchDefault = 'webpack';

const eslintCache = '.eslint_sigh_cache';

const output = console;

function* findProjectFiles(dir, predicate) {
  let tests = [];
  for (let entry of fs.readdirSync(dir)) {
    if (/\b(node_modules|deps|build|third_party)\b/.test(entry) ||
        entry.startsWith('.')) {
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
  const nodeRequiredVersion = require('../package.json').engines.node;
  const npmRequiredVersion = require('../package.json').engines.npm;

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
  for (let file of [sources.peg.output, sources.peg.railroad, eslintCache]) {
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
  for (let buildDir of [sources.pack.buildDir]) {
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

async function tsc() {
  let result = saneSpawnWithOutput('node_modules/.bin/tsc', ['--diagnostics'], {});
  if (result.status) {
    console.log(result.stdout);
  }
  return result;
}

async function lint(args) {
  const CLIEngine = require('eslint').CLIEngine;

  let options = minimist(args, {
    boolean: ['fix'],
  });

  let jsSources = [...findProjectFiles(process.cwd(), fullPath => {
    if (/intermediate/.test(fullPath)) {
      return false;
    }
    return /\.js$/.test(fullPath);
  })];

  const cli = new CLIEngine({
    useEsLintRc: false,
    configFile: '.eslintrc.js',
    fix: options.fix,
    cacheLocation: eslintCache,
    cache: true
  });
  let report = cli.executeOnFiles(jsSources);
  let formatter = cli.getFormatter();
  console.log(formatter(report.results));

  if (options.fix) {
    CLIEngine.outputFixes(report);
  }

  return report.errorCount == 0;
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
      webpack(
          {
            entry: path.resolve(projectRoot, file),
            mode: 'development',
            output: {
              path: process.cwd(),
              filename: `${sources.pack.buildDir}/${path.basename(file)}`,
            },
            node,
            devtool: 'sourcemap',
          },
          (err, stats) => {
            if (err) {
              reject(err);
            }
            console.log(
                stats.toString({colors: true, verbose: false, chunks: false}));
            resolve();
          });
    });
  }
  return true;
}

function spawnWasSuccessful(result) {
  if (result.status === 0 && !result.error) {
    return true;
  }
  for (let x of [result.stdout.toString().trim(), result.stderr.toString().trim(), result.error]) {
    if (x) {
      console.warn(x);
    }
  }
  return false;
}

// make spawn work more or less the same way cross-platform
function saneSpawn(cmd, args, opts) {
  cmd = path.normalize(cmd);
  opts = opts || {};
  opts.shell = true;
  // it's OK, I know what I'm doing
  let result = _DO_NOT_USE_spawn(cmd, args, opts);
  return spawnWasSuccessful(result);
}

// make spawn work more or less the same way cross-platform
function saneSpawnWithOutput(cmd, args, opts) {
  cmd = path.normalize(cmd);
  opts = opts || {};
  opts.shell = true;
  // it's OK, I know what I'm doing
  let result = _DO_NOT_USE_spawn(cmd, args, opts);
  if (!spawnWasSuccessful(result)) {
    return false;
  }
  return {status: result.status == 0, stdout: result.stdout.toString()};
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
    if (fullPath.startsWith(path.normalize(`${dir}/shell/`))) {
      return false;
    }
    // TODO(sjmiles): `artifacts` was moved from `arcs\shell\` to `arcs`, added
    // this statement to match the above filter.
    if (fullPath.startsWith(path.normalize(`${dir}/artifacts/`))) {
      return false;
    }
    const isSelectedTest = options.manual == fullPath.includes('manual_test');
    return /-tests?.js$/.test(fullPath) && isSelectedTest;
  });

  function fixPathForWindows(path) {
    if (path[0] == '/') {
      return path;
    }
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
    if (options.explore) {
      chainImports.push(`
      import {DevtoolsConnection} from '${fixPathForWindows(path.resolve(__dirname, '../runtime/debug/devtools-connection.js'))}';
      console.log("Waiting for Arcs Explorer");
      DevtoolsConnection.ensure();
    `);
    }
    let runner = `
      import {mocha} from '${mochaInstanceFile}';
      ${chainImports.join('\n      ')}
      (async () => {
        ${options.explore ? 'await DevtoolsConnection.onceConnected;' : ''}
        let runner = mocha
            .grep(${JSON.stringify(options.grep || '')})
            .run(function(failures) {
              process.on("exit", function() {
                process.exit(failures > 0 ? 1 : 0);
              });
            });
        process.on('unhandledRejection', (reason, promise) => {
          runner.abort();
          throw reason;
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
  return saneSpawn(
      'node',
      [
        '--experimental-modules',
        '--trace-warnings',
        ...extraFlags,
        '--loader',
        fixPathForWindows(path.join(__dirname, 'custom-loader.mjs')),
        runner
      ],
      {stdio: 'inherit'});
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
