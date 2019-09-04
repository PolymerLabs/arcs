/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {createConnection, IConnection} from 'vscode-languageserver';

import {DevNullLogger, FileLogger, LanguageServiceOptions} from './util.js';
import {LanguageService} from './language-service.js';

const minimist = require('minimist');
const optionSet = {
  string: ['log', 'socket'],
  boolean: ['help', 'version', 'stdio', 'node-ipc'],
  alias: {'v': 'version', 'h': 'help', 'l': 'log'},
  default: {'log': 'null'}
};

function makeLogger(options: LanguageServiceOptions) {
  switch (options.log) {
    case 'console':
      return console;
    case 'null':
      return new DevNullLogger();
    default:
      // Attempt to use the argument as a file.
      // TODO(jopra): Check that the path is a valid file/directory.
      return new FileLogger(options.log);
  }
}

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

  const logger = makeLogger(options);
  // Handles --stdio, --socket=<number> and --node-ipc
  const connection: IConnection = createConnection();
  const ls = new LanguageService(connection, options, logger);
  ls.start();
}

main();
