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
  default: [peg, test, webpack],
};

function peg() {
  const peg = require('pegjs');
  for (let [grammarFile, outputFile] of sources.peg) {
    let grammar = fs.readFileSync(path.resolve(projectRoot, grammarFile), 'utf8');
    let source = peg.generate(grammar, {
      format: 'bare',
      output: 'source',
    });
    let prefix = 'export default ';
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
        if (/-tests?.js$/.test(fullPath) && !fullPath.includes('manual_test')) {
          yield fullPath;
        }
      }
    }
  }

  function buildTestRunner() {
    let tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sigh-'));
    let chain = [];
    let mochaInstanceFile = path.resolve(__dirname, '../platform/mocha-node.js');
    for (let test of testsInDir(process.cwd())) {
      chain.push(`
        import mocha from '${mochaInstanceFile}';
        mocha.suite.emit('pre-require', global, '${test}', mocha);
      `);
      chain.push(`
        import '${test}';
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
      return `import '${file}';`;
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

  let runner = buildTestRunner();
  // TODO: exit code?
  return spawn('node', [
    '--experimental-modules',
    //'--print_all_exceptions',
    '--loader', path.join(__dirname, 'custom-loader.mjs'),
    runner,
  ], {stdio: 'inherit'}).status == 0;
}

async function defaultSteps() {
  return await peg() &&
      await test() &&
      await webpack();
}

(async () => {
  console.log('😌');
  let result = false;
  let command = process.argv[2] || 'default';
  let funs = steps[command];
  try {
    if (!funs) {
      console.error(`What is '${command}'?`);
      return;
    }
    for (let fun of funs) {
      console.log(`🙋 ${fun.name}`);
      // To avoid confusion, only the last step gets args.
      let args = fun == funs[funs.length - 1] ? process.argv.slice(2) : [];
      if (!await fun(args)) {
        console.log(`🙅 ${fun.name}`);
        return;
      }
      console.log(`🙆 ${fun.name}`);
    }
    result = true;
  } finally {
    console.log(result ? '🎉' : '😱');
    process.on("exit", function() {
      process.exit(result ? 0 : 1);
    });
  }
})();
