/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ErrorCodes, Message, StreamMessageReader as VSCodeStreamMessageReader, StreamMessageWriter as VSCodeStreamMessageWriter} from 'vscode-jsonrpc';
import {isNotificationMessage, isRequestMessage, isResponseMessage} from 'vscode-jsonrpc/lib/messages';

import {handlers} from './handlers.js';
import {jsonrpc, Logger, AmlServiceOptions, AmlServiceContext, camelCase} from './util.js';

export class AmlService {
  reader: VSCodeStreamMessageReader;
  writer: VSCodeStreamMessageWriter;
  context: AmlServiceContext;  // The state.
  initialized = false;  // error / onclose should trigger shutdown message.
  streaming = false;    // Client supports partialResult.

  constructor(
      reader: VSCodeStreamMessageReader,
      writer: VSCodeStreamMessageWriter,
      options: AmlServiceOptions,
      logger: Logger) {
    this.reader = reader;
    this.writer = writer;
    this.context = {logger, options};

    this.reader.listen(message => {
      this.update(message).then((response: Message) => {
        this.context.logger.info('Response: ', response ? response : 'No response.');
        if (response) {
          writer.write(response);
        }
      }).catch(e => this.context.logger.error(e));
    });

    this.reader.onError(err => {
      this.context.logger.error(err);
    });
  }

  async update(message: Message): Promise<Message | undefined> {
    const logger = this.context.logger;
    // Ignore responses (currently unhandled).
    if (isResponseMessage(message)) {
      logger.info('Received response message:', message);
      return undefined;
    }
    if (!isRequestMessage(message) && !isNotificationMessage(message)) {
      logger.error('Received invalid message:', message);
      return undefined;
    }
    logger.info('Received valid message:', message);

    const method = camelCase(message.method);
    switch (method) {
      case 'initialize':
        this.initialized = true;
        this.streaming = message.params.capabilities.streaming;
        break;
      case 'shutdown':
        this.initialized = false; // TODO(cypher1): Cleanup.
        // Ignore as the service will close when the socket does.
        return undefined;
      case 'exit':
        // Ignore as the service will close when the socket does.
        return undefined;
      default: // Fall through to use handlers[method].
    }
    // The message needs to be handler by an appropriate handler.
    const handler = handlers[method];

    if (typeof handler !== 'function') {
      // Method not implemented
      if (isRequestMessage(message)) {
        return {
          jsonrpc,
          id: message.id,
          error: {
            code: ErrorCodes.MethodNotFound,
            message: `Method ${method} not implemented`,
          },
        } as Message;
      } else {
        logger.warn(`Method ${method} not implemented`);
      }
      return undefined;
    }

    return await handler(message.params, this.context);
  }
}
