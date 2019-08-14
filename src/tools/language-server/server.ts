/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {createServer} from 'net';
import {
    StreamMessageReader,
    StreamMessageWriter,
} from 'vscode-jsonrpc';

import {LanguageService} from './language-service.js';
import {Logger, DevNullLogger, LanguageServiceOptions} from './util.js';


// tslint:disable-next-line: no-any
function createReader(id:number, inS: any, outS: any, options: LanguageServiceOptions, logger: Logger) {
  const reader = new StreamMessageReader(inS);
  const writer = new StreamMessageWriter(outS);

  // The service should have no control over the closing of the connection.
  reader.onClose(_err => {
    inS.end();
    inS.destroy();
    logger && logger.log(`Connection ${id} closed (exit notification)`);
  });

  new LanguageService(reader, writer, options, logger);
}

export function serve(options: LanguageServiceOptions) {
  let logger: Logger = console;
  switch (options.log) {
    case 'console':
      break;
    case 'null':
      logger = new DevNullLogger();
      break;
    default:
      throw new Error(`Unknown logger ${options.log}`);
  }

  if (options.stdio) {
    createReader(0, process.stdin, process.stdout, options, logger);
    return;
  }

  logger.log(`Starting server on port ${options.port}!`);
  let counter = 1;
  const server = createServer(socket => {
    const id = counter++;
    logger.log(`Connection ${id} accepted`);
    createReader(id, socket, socket, options, logger);
  });
  server.listen(options.port, () => {
    logger.info(`Listening for connections on ${options.port}`);
  });
}
