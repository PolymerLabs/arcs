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
    ErrorCodes,
    Message,
    StreamMessageReader as VSCodeStreamMessageReader,
    StreamMessageWriter as VSCodeStreamMessageWriter,
} from 'vscode-jsonrpc';

import {AmlService} from './aml-service.js';
import {Logger, DevNullLogger, AmlServiceOptions} from './util.js';

function createReader(id:number, inS, outS, options, logger: Logger) {
  const reader = new VSCodeStreamMessageReader(inS);
  const writer = new VSCodeStreamMessageWriter(outS);

  // The service should have no control over the closing of the connection.
  reader.onClose(err => {
    inS.end();
    inS.destroy();
    options.logger.log(`Connection ${id} closed (exit notification)`);
  });

  const service = new AmlService(reader, writer, options, logger);
}

export function serve(options: AmlServiceOptions) {
  let logger: Logger;
  switch (options.log) {
    case 'console':
      logger = console;
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
