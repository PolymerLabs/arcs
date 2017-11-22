// TODO: Don't use modules here!
import fs from 'fs';
import os from 'os';
import path from 'path';
import child_process from 'child_process';
const spawn = child_process.spawn;
const __dirname = process.argv[2];

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
  let mochaInstanceFile = path.resolve(__dirname, '../runtime/mocha-node.js');
  for (let test of testsInDir(process.cwd())) {
    chain.push(`
      import mocha from '${mochaInstanceFile}';
      mocha.suite.emit('pre-require', global, '${test}', mocha);
      console.log('next ${test}')
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
    mocha.run(function(failures) {
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
console.log(runner);
spawn('node', [
  '--experimental-modules',
  //'--print_all_exceptions',
  '--loader', path.join(__dirname, 'custom-loader.mjs'),
  runner,
], {stdio: 'inherit'});
