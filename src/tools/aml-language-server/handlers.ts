// Copyright (c) 2019 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Message} from 'vscode-jsonrpc';
import {NotificationMessage} from 'vscode-jsonrpc/lib/messages';
import {CodeActionParams, Command, CompletionItemKind, CompletionList, Diagnostic, DiagnosticSeverity, DidChangeConfigurationParams, DidChangeTextDocumentParams, DidCloseTextDocumentParams, DidOpenTextDocumentParams, DidSaveTextDocumentParams, DocumentSymbolParams, ExecuteCommandParams, Hover, InsertTextFormat, Location, MarkedString, ParameterInformation, PublishDiagnosticsParams, Range, ReferenceParams, RenameParams, SignatureHelp, SignatureInformation, SymbolInformation, TextDocumentPositionParams, TextDocumentSyncKind, TextEdit, WorkspaceEdit} from 'vscode-languageserver';

import {Dictionary} from '../../runtime/hot.js';
import {Manifest, ManifestError} from '../../runtime/manifest.js';

import {LspLoader} from './lspLoader.js';
import * as MessageTypes from './messageTypes.js';
import {alphaNumerics, AmlServiceContext, jsonrpc, normalizeUri, uri2path} from './util.js';

// tslint:disable-next-line: no-any
export type Handler = ((params: object, context: AmlServiceContext) => any);

export const handlers: Dictionary<Handler> = {
  initialize: (params: object, context: AmlServiceContext):
                  MessageTypes.InitializeResult => {
    context.rootPath =
    // tslint:disable-next-line: no-any
        (params as any).rootPath || uri2path((params as any).rootUri);
    const result: MessageTypes.InitializeResult = {
      capabilities: {
        // Tell the client that the server works in FULL text document sync mode
        textDocumentSync: TextDocumentSyncKind.Full,
        hoverProvider: true,
        signatureHelpProvider: {
          triggerCharacters: ['(', ','],
        },
        definitionProvider: true,
        typeDefinitionProvider: true,
        referencesProvider: true,
        documentSymbolProvider: true,
        workspaceSymbolProvider: true,
        xworkspaceReferencesProvider: true,
        xdefinitionProvider: true,
        xdependenciesProvider: true,
        completionProvider: {
          resolveProvider: true,
          triggerCharacters: ['.'],
        },
        codeActionProvider: true,
        renameProvider: true,
        executeCommandProvider: {
          commands: [],
        },
        xpackagesProvider: true,
      }
    };
    return result;
  },

  textDocumentCompletion: async (
      params, context: AmlServiceContext):
      Promise<MessageTypes.CompletionItem> => {
        const uri = (params as {textDocument: {uri: string}}).textDocument.uri;
        context.logger.info(`Completing for : ${uri}...`);
        return undefined;
      },

  textDocumentDidSave: async (params, context: AmlServiceContext):
      Promise<NotificationMessage> => {
        const uri = (params as {textDocument: {uri: string}}).textDocument.uri;
        context.logger.info(`Handling save for: ${uri}...`);
        return publishDiagnostics(uri, context);
      },

  textDocumentDidChange: async (params, context: AmlServiceContext):
      Promise<NotificationMessage> => {
        const uri = (params as {textDocument: {uri: string}}).textDocument.uri;
        context.logger.info(`Handling changes for: ${uri}...`);
        return publishDiagnostics(uri, context);
      },

  textDocumentDidOpen: async (params, context: AmlServiceContext):
      Promise<NotificationMessage> => {
        const uri = (params as {textDocument: {uri: string}}).textDocument.uri;
        context.logger.info(`Opened: ${uri}...`);
        return publishDiagnostics(uri, context);
      }
};

async function publishDiagnostics(uri: string, context: AmlServiceContext):
    Promise<NotificationMessage> {
      const diagnosticParams: PublishDiagnosticsParams =
          await gatherDiagnostics(uri, context);
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
        errors.splice(0, 0, ...Manifest.getErrors(manifest));
      } catch (e) {
        errors.push(e);
      }
      const diagnostics = errors.map(convertToDiagnostic);
      return {uri, diagnostics};
    }

function convertToDiagnostic(error: ManifestError) {
  const convertLocation = loc => ({
    character: loc.column,
    line: loc.line - 1,
  });
  const stripPreamble = msg => {
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
