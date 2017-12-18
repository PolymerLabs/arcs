// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const fs = require('fs');
const os = require('os');
const path = require('path');
const spawn = require('child_process').spawnSync;
const minimist = require('minimist');

const projectRoot = path.resolve(__dirname, '..');
process.chdir(projectRoot);

const sources = {
  peg: [
    ['runtime/manifest-parser.peg', 'runtime/build/manifest-parser.js'],
  ],
  browser: [
    'test/test.js',
    'demo/demo.js',
    'env/environment.js',
    'worker-entry.js',
    'planner.js'
  ],
};

const steps = {
  peg: [peg],
  test: [peg, test],
  webpack: [peg, webpack],
  watch: [watch],
  default: [peg, test, webpack],
};

// Paths to `watch` for the `watch` step.
const watchPaths = [
  './platform',
  './strategizer',
  './tracelib',
];

function peg() {
  const peg = require('pegjs');
  for (let [grammarFile, outputFile] of sources.peg) {
    let grammar = fs.readFileSync(path.resolve(projectRoot, grammarFile), 'utf8');
    let source = peg.generate(grammar, {
      format: 'bare',
      output: 'source',
    });
    let prefix = 'export default ';
    let dir = path.dirname(path.resolve(projectRoot, outputFile));
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    fs.writeFileSync(path.resolve(projectRoot, outputFile), prefix + source);
  }
  return true;
}

async function webpack() {
  const webpack = require('webpack');

  let node = {
    fs: 'empty',
    mkdirp: 'empty',
    minimist: 'empty',
  };

  if (!fs.existsSync('./runtime/browser/build')) {
    fs.mkdirSync('./runtime/browser/build');
  }
  for (let file of sources.browser) {
    await new Promise((resolve, reject) => {
      webpack({
        entry: `./runtime/browser/${file}`,
        output: {
          filename: `./runtime/browser/build/${file}`,
        },
        node,
        devtool: 'sourcemap',
      }, (err, stats) => {
        if (err) {
          reject(err);
        }
        console.log(stats.toString({colors: true, verbose: true}));
        resolve();
      });
    });
  }
  return true;
}

function test(args) {
  let options = minimist(args, {
    string: ['grep'],
    inspect: ['inspect'],
    exceptions: ['exceptions'],
    boolean: ['manual'],
    alias: {g: 'grep'},
  });
  function* testsInDir(dir) {
    let tests = [];
    for (let entry of fs.readdirSync(dir)) {
      if (entry.includes('node_modules') || entry.startsWith('.')) {
        continue;
      }
      let fullPath = path.join(dir, entry);
      let stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        yield* testsInDir(fullPath);
      } else {
        var isSelectedTest = options.manual == fullPath.includes('manual_test');
        if (/-tests?.js$/.test(fullPath) && isSelectedTest) {
          yield fullPath;
        }
      }
    }
  }

  function fixPathForWindows(path) {
    if (path[0] == '/')
      return path;
    return '/' + path.replace(new RegExp(String.fromCharCode(92,92), 'g'), "/");
  }

  function buildTestRunner() {
    let tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigh-'));
    let chain = [];
    let mochaInstanceFile = fixPathForWindows(path.resolve(__dirname, '../platform/mocha-node.js'));
    for (let test of testsInDir(process.cwd())) {
      chain.push(`
        import mocha from '${mochaInstanceFile}';
        mocha.suite.emit('pre-require', global, '${test}', mocha);
      `);
      chain.push(`
        import '${fixPathForWindows(test)}';
      `)
      chain.push(`
        import mocha from '${mochaInstanceFile}';
        mocha.suite.emit('require', null, '${test}', mocha);
        mocha.suite.emit('post-require', global, '${test}', mocha);
      `);
    }
    let chainImports = chain.map((entry, i) => {
      let file = path.join(tempDir, `chain${i}.js`);
      fs.writeFileSync(file, entry);
      return `import '${fixPathForWindows(file)}';`;
    });
    let runner = `
      import mocha from '${mochaInstanceFile}';
      ${chainImports.join('\n    ')}
      mocha
        .grep(${JSON.stringify(options.grep || '')})
        .run(function(failures) {
          process.on("exit", function() {
            process.exit(failures > 0 ? 1 : 0);
          });
      });
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
    extraFlags.push('--print_all_exceptions')
  }

  let runner = buildTestRunner();
  return spawn('node', [
    '--experimental-modules',
    '--trace-warnings',
    ...extraFlags,
    '--loader', fixPathForWindows(path.join(__dirname, 'custom-loader.mjs')),
    runner
  ], {stdio: 'inherit'}).status == 0;
}


// Watches `watchPaths` for changes, then runs the `peg` and `webpack` steps.
async function watch() {
  let watchers = [];
  let handler = async () => {
    for (let watcher of watchers) {
      watcher.close();
    }
    watchers = [];

    await run([
      [peg, []],
      [webpack, []]
    ]);

    for (let watchPath of watchPaths) {
      watchers.push(fs.watch(watchPath, {persistent: false}, handler));
    }
  };

  // Run the steps and start watching for file changes.
  handler();

  // TODO: Is there a better way to keep the process alive?
  let forever = () => {
    setTimeout(forever, 60 * 60 * 1000);
  };
  forever();
  // Never resolved.
  return new Promise(() => {});
}

async function defaultSteps() {
  return await peg() &&
      await test() &&
      await webpack();
}

// Runs a chain of `[[fun, args]]` by calling `fun(args)`, logs emoji, and returns whether
// all the functions returned `true`.
async function run(funsAndArgs) {
  console.log('😌');
  let result = false;
  try {
    for (let [fun, args] of funsAndArgs) {
      console.log(`🙋 ${fun.name}`);
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
    console.log(result ? '🎉' : '😱');
    return result;
  }
}

(async () => {
  let command = process.argv[2] || 'default';
  let funs = steps[command];
  // To avoid confusion, only the last step gets args.
  let funsAndArgs = funs.map(fun => [fun, fun == funs[funs.length - 1] ? process.argv.slice(2) : []])
  let result = await run(funsAndArgs);
  process.on("exit", function() {
    process.exit(result ? 0 : 1);
  });
})();
