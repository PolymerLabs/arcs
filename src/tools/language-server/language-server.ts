/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {serve} from './server.js';
import {DevNullLogger, LanguageServiceOptions} from './util.js';

const minimist = require('minimist');
const optionSet = {
  string: ['port', 'log'],
  boolean: ['help', 'version', 'stdio'],
  alias: {'v': 'version', 'h': 'help', 'p': 'port', 'l': 'log'},
  default: {'port': 2089, 'log': 'null'}
};

function main() {
  const options: LanguageServiceOptions = minimist(process.argv, optionSet);
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
