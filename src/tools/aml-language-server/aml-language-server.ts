import {serve} from './server.js';
import {DevNullLogger, AmlServiceOptions} from './util.js';

const minimist = require('minimist');
const optionSet = {
  string: ['port', 'log'],
  boolean: ['help', 'version', 'stdio'],
  alias: {'v': 'version', 'h': 'help', 'p': 'port', 'l': 'log'},
  default: {'port': 2089, 'log': 'console'}
};

function main() {
  const options: AmlServiceOptions = minimist(process.argv, optionSet);
  if (options.version || options.help) {
    const packageJson = require('../../../package.json');
    console.log(`Arcs Manifest Language Server v${packageJson.version}`);
    if (options.help) {
      const args = [...optionSet.string, ...optionSet.boolean];
      console.log(`Options:${args.map(s => ` ${s}`)}`);
    }
    process.exit(0);
  }

  serve(options);
}
main();
