/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {NotificationMessage} from 'vscode-jsonrpc/lib/messages';
import {Diagnostic, DiagnosticSeverity, DidChangeTextDocumentParams, DidOpenTextDocumentParams, DidSaveTextDocumentParams, PublishDiagnosticsParams, Range, TextDocumentSyncKind} from 'vscode-languageserver';

import {Dictionary} from '../../runtime/hot.js';
import {Manifest, ManifestError} from '../../runtime/manifest.js';
import {SourcePosition} from '../../runtime/manifest-ast-nodes.js';

import {LspLoader} from './lspLoader.js';
import * as MessageTypes from './messageTypes.js';
import {AmlServiceContext, jsonrpc, normalizeUri, uri2path} from './util.js';

// tslint:disable-next-line: no-any
export type Handler = ((params: any, context: AmlServiceContext) => any);

export const handlers: Dictionary<Handler> = {
// tslint:disable-next-line: no-any
  initialize: (params: any, context: AmlServiceContext):
                  MessageTypes.InitializeResult => {
    context.rootPath =
        params.rootPath || uri2path(params.rootUri);
    const result: MessageTypes.InitializeResult = {
      capabilities: {
        // Tell the client that the server works in FULL text document sync mode
        textDocumentSync: TextDocumentSyncKind.Full,
        hoverProvider: false,
        signatureHelpProvider: {
          triggerCharacters: ['(', ','],
        },
        definitionProvider: false, // TODO(cypher1): Provide definitions.
        typeDefinitionProvider: false,
        referencesProvider: false,
        documentSymbolProvider: false,
        workspaceSymbolProvider: false,
        xworkspaceReferencesProvider: false,
        xdefinitionProvider: false,
        xdependenciesProvider: false,
        completionProvider: {
          resolveProvider: false,
          triggerCharacters: ['.'], // TODO(cypher1): Provide Completing (on all).
        },
        codeActionProvider: false,
        renameProvider: false,
        executeCommandProvider: {
          commands: [],
        },
        xpackagesProvider: false,
      }
    };
    return result;
  },

  textDocumentCompletion: async (
      params, context: AmlServiceContext):
      Promise<MessageTypes.CompletionItem> => {
        const uri = params.textDocument.uri as string;
        context.logger.info(`Completing for : ${uri}...`);
        return undefined;
      },

  textDocumentDidSave: async (params, context: AmlServiceContext):
      Promise<NotificationMessage> => {
        params = params as DidSaveTextDocumentParams;
        const uri = params.textDocument.uri;
        context.logger.info(`Handling save for: ${uri}...`);
        return publishDiagnostics(uri, context);
      },

  textDocumentDidChange: async (params, context: AmlServiceContext):
      Promise<NotificationMessage> => {
        params = params as DidChangeTextDocumentParams;
        const uri = params.textDocument.uri;
        context.logger.info(`Handling changes for: ${uri}...`);
        return publishDiagnostics(uri, context);
      },

  textDocumentDidOpen: async (params, context: AmlServiceContext):
      Promise<NotificationMessage> => {
        params = params as DidOpenTextDocumentParams;
        const uri = params.textDocument.uri;
        context.logger.info(`Opened: ${uri}...`);
        return publishDiagnostics(uri, context);
      }
};

async function publishDiagnostics(uri: string, context: AmlServiceContext):
    Promise<NotificationMessage> {
      const diagnosticParams: PublishDiagnosticsParams = await gatherDiagnostics(uri, context);
      return {
        jsonrpc,
        method: 'textDocument/publishDiagnostics',
        params: diagnosticParams
      };
    }

async function gatherDiagnostics(uri: string, context: AmlServiceContext):
    Promise<PublishDiagnosticsParams> {
      const path = uri2path(normalizeUri(uri));
      // TODO(cypher1): Catch exception and list them for later.
      const errors: ManifestError[] = [];
      try {
        const manifest = await Manifest.load(path, new LspLoader(context));
        errors.push(...Manifest.getErrors(manifest));
      } catch (e) {
        errors.push(e);
      }
      const diagnostics = errors.map(convertToDiagnostic);
      return {uri, diagnostics};
    }

function convertToDiagnostic(error: ManifestError): Diagnostic {
  const convertLocation = (loc: SourcePosition) => ({
    character: loc.column,
    line: loc.line - 1,
  });
  const stripPreamble = (msg: string) => {
    // Remove preamble.
    msg = msg.replace(/^(Parse|Post-parse) [^\n]*line [0-9]*.\n/g, '');
    // Remove preview of code.
    msg = msg.replace(/\n.*/g, '');
    return msg;
  };
  const range: Range = {
    start: convertLocation(error.location.start),
    end: convertLocation(error.location.end)
  };
  return {
    range,
    message: stripPreamble(error.message),
    code: error.key,
    severity: DiagnosticSeverity.Error,
    source: error.location.filename || 'aml'
  };
}
