/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {ExecuteCommandParams, InitializeParams, IConnection,
  DidSaveTextDocumentParams, TextDocumentSyncKind, InitializeResult
} from 'vscode-languageserver';

import {Logger, LanguageServiceOptions, uri2path} from './util.js';
import {gatherDiagnostics} from './diagnostics.js';

export class LanguageService {
  connection: IConnection;
  rootPath: string | undefined = undefined;
  logger: Logger;
  options: LanguageServiceOptions;
  isInitialized = false;  // error / onclose should trigger shutdown message.

  constructor( connection: IConnection, options: LanguageServiceOptions, logger: Logger) {
    this.connection = connection;
    this.options = options;
    this.logger = logger;
  }

  start() {
    // Register service manager handlers
    this.connection.onInitialize(this.initialize.bind(this));
    this.connection.onInitialized(this.initialized.bind(this));
    this.connection.onShutdown(this.shutdown.bind(this));
    this.connection.onExit(this.exit.bind(this));

    // Register language service handlers

    // TODO: this.connection.onCompletion(this.completion);
    this.connection.onDidSaveTextDocument(this.didSaveTextDocument.bind(this));
    // TODO: this.connection.onDidChangeConfiguration(this.didChangeConfig.bind(this));
    // TODO: this.connection.onDidChangeTextDocument(this.didChange.bind(this));
    this.connection.onExecuteCommand(this.executeCommand.bind(this));

    this.connection.listen();
  }

  // Handlers

  initialize(params: InitializeParams): InitializeResult {
    this.rootPath = params.rootPath || uri2path(params.rootUri);

    return {
      capabilities: {
        // Tell the client that the server works in FULL text document sync mode
        textDocumentSync: TextDocumentSyncKind.Full,
        completionProvider: {
          resolveProvider: true,
        },
        renameProvider: false,
        executeCommandProvider: {
          commands: [],
        }
      }
    };
  }

  initialized() {
    this.isInitialized = true;
  }

  shutdown() {
    this.isInitialized = false;
    // TODO(cypher1): Cleanup.
  }

  exit() {
    // TODO(cypher1): Cleanup.
  }

  async executeCommand(params: ExecuteCommandParams) {
    this.logger.info(`execute command requested ${params}`);
  }

  async didSaveTextDocument(params: DidSaveTextDocumentParams) {
    const uri = params.textDocument.uri;
    this.logger.info(`Handling save for: ${uri}...`);
    await this.publishDiagnostics(uri);
  }

  // Other functions
  async publishDiagnostics(uri: string) {
    this.logger.info(`publishDiagnostics: ${uri}...`);

    const diagnostics = await gatherDiagnostics(uri, this.logger);
    this.connection.sendDiagnostics({uri, diagnostics});
  }

}
