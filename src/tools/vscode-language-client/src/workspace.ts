/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import path from 'path';
import {
  Disposable,
  ExtensionContext,
  languages,
  OutputChannel,
  TextDocument,
  Uri,
  window,
  workspace,
  WorkspaceConfiguration,
  TextDocumentContentChangeEvent,
  TextDocumentChangeEvent,
  Diagnostic,
  DiagnosticCollection
} from 'vscode';
import {
  LanguageClient,
  LanguageClientOptions,
  RevealOutputChannelOn,
  Executable,
} from 'vscode-languageclient';

const clientName = 'Arcs Language Server';

export class ClientWorkspace {
  private configuration: WorkspaceConfiguration;
  // TODO(jopra): Add support for Workspaces and WorkspaceFolders
  private disposables: Disposable[] = [];
  private lc: LanguageClient | null = null;
  public outputChannel: OutputChannel;
  private diagnostics: DiagnosticCollection;

  constructor(outputChannel: OutputChannel) {
    this.configuration = workspace.getConfiguration();
    this.outputChannel = outputChannel;
    this.diagnostics = languages.createDiagnosticCollection('arcs');
  }

  public async start(context: ExtensionContext): Promise<boolean> {
    if (!this.lspPath) {
      // Warn the user
      return false;
    }
    // Run the node server
    const serverOptions: Executable = {
      command: 'node',
      args: [
        this.lspPath,
        '--stdio'
      ]
    };

    // Options to control the language client
    const clientOptions: LanguageClientOptions = {
      // Register the server for plain text documents
      documentSelector: [{scheme: 'file', language: 'arcs'}],
      synchronize: {
        // Notify the server about file changes to '.clientrc files contained in the workspace
        fileEvents: workspace.createFileSystemWatcher('**/.clientrc')
      },
      revealOutputChannelOn: this.revealOutputChannelOn,
      outputChannel: this.outputChannel,
    };

    // Create the language client and start the client.
    this.lc = new LanguageClient(
      'arcsLanguageServer',
      clientName,
      serverOptions,
      clientOptions
    );
    this.disposables.push(this.lc.start());

    context.subscriptions.push(this.diagnostics);

    this.outputChannel.appendLine('starting arcs lsp');
    await this.lc.onReady();
    this.outputChannel.appendLine('started arcs lsp');

    this.diagnostics.clear();
    this.lc.onNotification(
      'textDocument/publishDiagnostics',
      (params: {uri: Uri, diagnostics: Diagnostic[]}) => {
        const uri = Uri.parse(params.uri.toString());
        this.diagnostics.set(uri, params.diagnostics);
      });

    return true;
  }

  public async stop() {
    if (this.lc) {
      await this.lc.stop();
    }
    this.disposables.forEach(d => d.dispose());
  }

  // Handler triggers

  public didChangeTextDocument(change: TextDocumentChangeEvent, _context: ExtensionContext) {
    if (!this.lc) { return; }
    const doc = change.document;
    if (doc.languageId !== 'arcs') {
      return; // Ignore non-arcs files.
    }
    this.outputChannel.appendLine(`${doc.uri} changed`);
    const contentChanges: TextDocumentContentChangeEvent[] = [];
    this.lc.sendNotification(
      'textDocument/didChangeTextDocument',
      {textDocument: doc, contentChanges});
  }

  public didOpenTextDocument(textDocument: TextDocument, _context: ExtensionContext) {
    if (!this.lc) {return; }
    if (textDocument.languageId !== 'arcs') {
      return; // Ignore non-arcs files.
    }
    this.outputChannel.appendLine(`Client: ${textDocument.uri} opened`);
    const contentChanges: TextDocumentContentChangeEvent[] = [];

    // TODO(jopra): Add open support.
    // Currently this is 'faked' but really just pretends that the file was
    // saved.
    this.lc.sendNotification(
      'textDocument/didSaveTextDocument',
      {textDocument, contentChanges});
  }

  public didSaveTextDocument(textDocument: TextDocument, _context: ExtensionContext) {
    if (!this.lc) { return; }
    if (textDocument.languageId !== 'arcs') {
      return; // Ignore non-arcs files.
    }
    this.outputChannel.appendLine(`Client: ${textDocument.uri} saved`);
    const contentChanges: TextDocumentContentChangeEvent[] = [];
    this.lc.sendNotification(
      'textDocument/didSaveTextDocument',
      {textDocument, contentChanges});
  }

  // Getters for easy configuation value usage.
  private get revealOutputChannelOn(): RevealOutputChannelOn {
    const setting = this.configuration.get<string>(
      'arcs-client.revealOutputChannelOn',
      'never',
    );
    return fromStringToRevealOutputChannelOn(setting);
  }

  public get arcsPath(): string | undefined {
    // TODO (jopra): Checkout into a default location if this is not set...
    const arcsPath = this.configuration.get<string>('arcs.arcsPath');
    return arcsPath && path.resolve(arcsPath);
  }

  public get lspPath(): string | undefined {
    // TODO (jopra): Check that this works
    if (!this.arcsPath) {
      window.showInformationMessage('Please set the arcsPath');
      return undefined;
    }
    const packedPath = [this.arcsPath,
      'dist', 'tools', 'language-server',
      'language-server.js'
    ];
    return path.join(...packedPath);
  }
}

function fromStringToRevealOutputChannelOn(
  value: string,
): RevealOutputChannelOn {
  switch (value && value.toLowerCase()) {
    case 'info':
      return RevealOutputChannelOn.Info;
    case 'warn':
      return RevealOutputChannelOn.Warn;
    case 'error':
      return RevealOutputChannelOn.Error;
    case 'never':
      return RevealOutputChannelOn.Never;
    default:
      return RevealOutputChannelOn.Error;
  }
}
