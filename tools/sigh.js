// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const assert = require('assert');
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
    grammar: 'src/runtime/manifest-parser.peg',
    output: 'build/runtime/manifest-parser.js',
    railroad: 'manifest-railroad.html',
  },
  pack: [{
    buildDir: 'shell/build',
  }, {
    buildDir: 'shells/lib/build'
  }],
  ts: {
    buildDir: 'build'
  }
};

const steps = {
  peg: [peg, railroad],
  railroad: [railroad],
  test: [peg, railroad, build, test],
  webpack: [peg, railroad, build, webpack],
  build: [peg, build],
  watch: [watch],
  lint: [lint, tslint],
  tslint: [tslint],
  check: [check],
  clean: [clean],
  importSpotify: [build, importSpotify],
  unit: [unit],
  default: [check, peg, railroad, build, test, webpack, lint, tslint],
};

const eslintCache = '.eslint_sigh_cache';

const linklist = './tools/reducethislist';

// RE pattern to exclude when finding within project source files.
const srcExclude = /\b(node_modules|deps|build|third_party)\b/;
// RE pattern to exclude when finding within project built files.
const buildExclude = /\b(node_modules|deps|src|third_party)\b/;

function* findProjectFiles(exclude, dir, predicate) {
  const tests = [];
  for (const entry of fs.readdirSync(dir)) {
    if (exclude.test(entry) ||
        entry.startsWith('.')) {
      continue;
    }

    const fullPath = path.join(dir, entry);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      yield* findProjectFiles(exclude, fullPath, predicate);
    } else if (predicate(fullPath)) {
      yield fullPath;
    }
  }
}

function readProjectFile(relativePath) {
  return fs.readFileSync(path.resolve(projectRoot, relativePath), 'utf-8');
}

function fixPathForWindows(path) {
  if (path[0] == '/') {
    return path;
  }
  return '/' + path.replace(new RegExp(String.fromCharCode(92, 92), 'g'), '/');
}

function targetIsUpToDate(relativeTarget, relativeDeps) {
  const target = path.resolve(projectRoot, relativeTarget);
  if (!fs.existsSync(target)) {
    return false;
  }

  const targetTime = fs.statSync(target).mtimeMs;
  for (const relativePath of relativeDeps) {
    if (fs.statSync(path.resolve(projectRoot, relativePath)).mtimeMs > targetTime) {
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
  for (const file of [sources.peg.output, sources.peg.railroad, eslintCache]) {
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.log('Removed', file);
    }
  }

  const recursiveDelete = (dir) => {
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
  for (const buildDir of [sources.pack.buildDir, sources.ts.buildDir]) {
    if (fs.existsSync(buildDir)) {
      recursiveDelete(buildDir);
      console.log('Removed', buildDir);
    }
  }
  return true;
}

// Run unit tests on the parts of this tool itself.
function unit() {
  // Add more tests here.
  return linkUnit();
}

function linkUnit() {
  if (link(
`
# Just a comment; should be ok
`
    ) == false) {
      console.error('Link file with just a comment did not succeed.');
  }

  if (link(
`

`
    ) == false) {
      console.error('Empty link file did not succeed.');
  }

  if (link(
`
bad/foo.js
`
    ) == true) {
      console.error('File not beginning with src did succeed.');
  }

  const dummySrc = 'src/foo.js';
  const dummyDest = 'build/foo.js';

  if (link(
`
${dummySrc}
`
    ) == true) {
      console.error('Non-existent file did succeed.');
  }

  fs.writeFileSync(dummySrc, 'Just some nonsense');

  if (link(
`
${dummySrc}
`
    ) == false) {
      console.error('Dummy link failed when it should have succeeded.');
      fs.unlinkSync(dummySrc);
      return false;
  }

  if (!fs.existsSync(dummyDest)) {
    console.error('Dummy link succeeded, but new hard link does not exist.');
    fs.unlinkSync(dummySrc);
    return false;
  }

  if (link(
`
${dummySrc}
`
    ) == false) {
      console.error('Attempted idempotent Dummy link failed when it should have succeeded.');
      fs.unlinkSync(dummySrc);
      return false;
  }


  fs.unlinkSync(dummyDest);
  fs.writeFileSync(dummyDest, 'Some different nonsense, a bit longer this time');

  if (link(
`
${dummySrc}
`
    ) == false) {
    console.error('Differing destination exists, but link failed');
    fs.unlinkSync(dummySrc);
    fs.unlinkSync(dummyDest);
    return false;
  }

  fs.unlinkSync(dummySrc);
  fs.unlinkSync(dummyDest);
  console.log('Above errors are expected! Link unit test passes!');
  return true;
}

function peg() {
  const peg = require('pegjs');

  if (targetIsUpToDate(sources.peg.output, [sources.peg.grammar])) {
    return true;
  }

  const source = peg.generate(readProjectFile(sources.peg.grammar), {
    format: 'bare',
    output: 'source',
    trace: false
  });
  const outputFile = path.resolve(projectRoot, sources.peg.output);
  const dir = path.dirname(outputFile);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
  fs.writeFileSync(outputFile, 'export const parser = ' + source);
  return true;
}

function railroad() {
  // railroad rendering logic taken from GrammKit/cli.js
  const {transform} = require('grammkit/lib/util');
  const handlebars = require('handlebars');

  const diagramStyle = 'node_modules/grammkit/app/diagram.css';
  const appStyle = 'node_modules/grammkit/app/app.css';
  const baseTemplate = 'node_modules/grammkit/template/viewer.html';

  const deps = [sources.peg.grammar, diagramStyle, appStyle, baseTemplate];
  if (targetIsUpToDate(sources.peg.railroad, deps)) {
    return true;
  }

  const result = transform(readProjectFile(sources.peg.grammar));
  const grammars = result.procesedGrammars.map(({rules, references, name}) => {
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

  const data = {
    title: `Railroad diagram for ${sources.peg.grammar}`,
    style: readProjectFile(diagramStyle) + '\n' + readProjectFile(appStyle),
    grammars: grammars
  };
  const template = handlebars.compile(readProjectFile(baseTemplate));
  fs.writeFileSync(path.resolve(projectRoot, sources.peg.railroad), template(data));

  return true;
}

async function build() {
  if (await tsc() == false) {
    console.log('build::twsc failed');
    return false;
  }

  if (await link(fs.readFileSync(linklist, 'utf8')) == false) {
    console.log('build::link failed');
    return false;
  }

  return true;
}

async function tsc() {
  const result = saneSpawnWithOutput('node_modules/.bin/tsc', ['--diagnostics'], {});
  if (result.status) {
    console.log(result.stdout);
  }
  return result;
}

function makeLink(src, dest) {
  try {
    // First we have to ensure the entire path is there.
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {recursive: true});
    }
    fs.linkSync(src, dest);
  } catch (lerr) {
    console.error(`Error linking ${src} to ${dest} ${lerr.message}`);
    return false;
  }
  return true;
}

async function link(filecontents) {
  let srcStats;
  let destStats;
  let success = true;
  for (const line of filecontents.split('\n')) {
    const src = line.trim();
    // skip blank lines and lines that begin with a #. Note that only full-line
    // comments are supported.
    if (src.length == 0 || src.startsWith('#')) {
      continue;
    }
    if (!src.startsWith('src')) {
      console.error(`Invalid source file: ${src} source files must begin with "src"`);
      success = false;
    }
    try {
      srcStats = fs.statSync(src);
    } catch (err) {
      console.error(`Error stating src file ${src} ${err.message} Perhaps you need to update tools/reducethislist?`);
      success = false;
    }
    const dest = src.replace('src', 'build');
    try {
      destStats = fs.statSync(dest);
      // This would have thrown if dest didn't exist, so it does.
      if (JSON.stringify(srcStats) !== JSON.stringify(destStats)) {
        // They aren't the same. This is likely due to switching branches. Just
        // Remove the destination and make the link.
        fs.unlinkSync(dest);
        if (!makeLink(src, dest)) {
          success = false;
        }
      }
    } catch (err) {
      // if the error was that the dest does not exist, we make the link
      if (err.code === 'ENOENT') {
        if (!makeLink(src, dest)) {
          success = false;
        }
      } else {
        // Unexpected error when checking for existence of dest
        console.error(`Error stating ${dest} ${err.message}`);
        success = false;
      }
    }
  }
  return success;
}

async function tslint(args) {
  const options = minimist(args, {
    boolean: ['fix'],
  });

  const fixArgs = options.fix ? ['--fix'] : [];

  const result = saneSpawnWithOutput('node_modules/.bin/tslint', ['-p', '.', ...fixArgs], {});
  if (result.status) {
    console.log(result.stdout);
  }
  return result;
}

async function lint(args) {
  const CLIEngine = require('eslint').CLIEngine;

  const options = minimist(args, {
    boolean: ['fix'],
  });

  const jsSources = [...findProjectFiles(srcExclude, process.cwd(), fullPath => {
    if (/build/.test(fullPath) || /server/.test(fullPath) || /dist/.test(fullPath)) {
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
  const report = cli.executeOnFiles(jsSources);
  const formatter = cli.getFormatter();
  console.log(formatter(report.results));

  if (options.fix) {
    CLIEngine.outputFixes(report);
  }

  return report.errorCount == 0;
}

async function webpack() {
  const result = saneSpawnWithOutput('npm', ['run', 'build:webpack'], {});
  if (result.status) {
    console.log(result.stdout);
  }
  return result;
}

function spawnWasSuccessful(result) {
  if (result.status === 0 && !result.error) {
    return true;
  }
  for (const x of [result.stdout, result.stderr]) {
    if (x) {
      console.warn(x.toString().trim());
    }
  }
  if (result.error) {
    console.warn(result.error);
  }
  return false;
}

// make spawn work more or less the same way cross-platform
function saneSpawn(cmd, args, opts) {
  cmd = path.normalize(cmd);
  opts = opts || {};
  opts.shell = true;
  // it's OK, I know what I'm doing
  const result = _DO_NOT_USE_spawn(cmd, args, opts);
  return spawnWasSuccessful(result);
}

// make spawn work more or less the same way cross-platform
function saneSpawnWithOutput(cmd, args, opts) {
  cmd = path.normalize(cmd);
  opts = opts || {};
  opts.shell = true;
  // it's OK, I know what I'm doing
  const result = _DO_NOT_USE_spawn(cmd, args, opts);
  if (!spawnWasSuccessful(result)) {
    return false;
  }
  return {status: result.status == 0, stdout: result.stdout.toString()};
}

function rot13(str) {
  const input = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'.split('');
  const output = 'NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm'.split('');
  const lookup = input.reduce((m, k, i) => Object.assign(m, {[k]: output[i]}), {});
  return str.split('').map(x => lookup[x] || x).join('');
}

function test(args) {
  const options = minimist(args, {
    string: ['grep'],
    inspect: ['inspect'],
    explore: ['explore'],
    exceptions: ['exceptions'],
    boolean: ['manual', 'all'],
    repeat: ['repeat'],
    alias: {g: 'grep'},
  });

  const testsInDir = dir => findProjectFiles(buildExclude, dir, fullPath => {
    // TODO(wkorman): Integrate shell testing more deeply into sigh testing. For
    // now we skip including shell tests in the normal sigh test flow and intend
    // to instead run them via a separate 'npm test' command.
    if (fullPath.startsWith(path.normalize(`${dir}/shell`))) {
      return false;
    }
    // TODO(sjmiles): `artifacts` was moved from `arcs\shell\` to `arcs`, added
    // this statement to match the above filter.
    if (fullPath.startsWith(path.normalize(`${dir}/artifacts/`))) {
      return false;
    }
    const isSelectedTest = options.all || (options.manual == fullPath.includes('manual_test'));
    return /-tests?.js$/.test(fullPath) && isSelectedTest;
  });

  function buildTestRunner() {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigh-'));
    const chain = [];
    const mochaInstanceFile = fixPathForWindows(path.resolve(__dirname, '../src/platform/mocha-node.js'));
    for (const test of testsInDir(process.cwd())) {
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
    const chainImports = chain.map((entry, i) => {
      const file = path.join(tempDir, `chain${i}.js`);
      fs.writeFileSync(file, entry);
      return `import '${fixPathForWindows(file)}';`;
    });
    if (options.explore) {
      chainImports.push(`
      import {DevtoolsConnection} from '${fixPathForWindows(path.resolve(__dirname, '../build/runtime/debug/devtools-connection.js'))}';
      console.log("Waiting for Arcs Explorer");
      DevtoolsConnection.ensure();
    `);
    }
    const runner = `
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
    const runnerFile = path.join(tempDir, 'runner.js');
    fs.writeFileSync(runnerFile, runner);
    return runnerFile;
  }

  const extraFlags = [];
  if (options.inspect) {
    extraFlags.push('--inspect-brk');
  }
  if (options.exceptions) {
    extraFlags.push('--print_all_exceptions');
  }

  const runner = buildTestRunner();
  // Spawn processes as needed to repeat tests specified by 'repeat' flag.
  const repeatCount = parseInt(JSON.stringify(options.repeat || 1));
  const testResults = [];
  const failedRuns = [];
  for (let i = 1; i < repeatCount + 1; i++) {
    console.log('RUN %s STARTING [%s]:', i, (new Date).toLocaleTimeString());
    const testResult = saneSpawn(
        'node',
        [
          '--experimental-modules',
          '--trace-warnings',
          '--no-deprecation',
          ...extraFlags,
          '--loader',
          fixPathForWindows(path.join(__dirname, 'custom-loader.mjs')),
          '-r',
          'source-map-support/register.js',
          runner
        ],
        {stdio: 'inherit'});
    if (testResult === false) {
      failedRuns.push(i);
    }
    testResults.push(testResult);
  }
  console.log('%s runs completed. %s runs failed.', repeatCount, failedRuns.length);
  if (failedRuns.length > 0) {
    console.log('Failed runs: ', failedRuns);
  }
  return testResults;
}

async function importSpotify(args) {
  return saneSpawn('node', [
    '--experimental-modules',
    '--trace-warnings',
    '--loader', fixPathForWindows(path.join(__dirname, 'custom-loader.mjs')),
    './tools/spotify-importer.js',
    ...args
  ], {stdio: 'inherit'});
}

// Watches for file changes, then runs the `arg` steps.
async function watch([arg, ...moreArgs]) {
  const funs = steps[arg || 'webpack'];
  const funsAndArgs = funs.map(fun => [fun, fun == funs[funs.length - 1] ? moreArgs : []]);
  const watcher = chokidar.watch('.', {
    ignored: /(node_modules|build\/|\.git)/,
    persistent: true
  });
  let timerId = 0;
  const changes = new Set();
  watcher.on('change', path => {
    if (timerId) {
      clearTimeout(timerId);
    }
    changes.add(path);
    timerId = setTimeout(async () => {
      console.log(`\nRebuilding due to changes to:\n  ${[...changes].join('\n  ')}`);
      changes.clear();
      await run(funsAndArgs);
      timerId = 0;
    }, 500);
  });

  // TODO: Is there a better way to keep the process alive?
  const forever = () => {
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
    for (const [fun, args] of funsAndArgs) {
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
  const command = process.argv[2] || 'default';
  const funs = steps[command];
  if (funs === undefined) {
    console.log(`Unknown command: '${command}'`);
    console.log('Available commands are:', Object.keys(steps).join(', '));
    return;
  }

  // To avoid confusion, only the last step gets args.
  const funsAndArgs = funs.map(fun => [fun, fun == funs[funs.length - 1] ? process.argv.slice(3) : []]);
  const result = await run(funsAndArgs);
  process.on('exit', function() {
    process.exit(result ? 0 : 1);
  });
})();
