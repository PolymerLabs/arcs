/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {
  commands,
  ExtensionContext,
  OutputChannel,
  window,
  workspace,
} from 'vscode';

import {ClientWorkspace} from './workspace.js';

// Note: The commandId parameter must match the command field in package.json
function clientCommands(context: ExtensionContext) {
  return [
    {
      'id': 'arcs.restart',
      'impl': () => {
        stop();
        start(context);
      }
    }
  ];
}

// Global singleton to hold configuration, server communication and caches.
// TODO: Workspace mapping
let client: ClientWorkspace | undefined = undefined;
let outputChannel: OutputChannel | undefined = undefined;

function start(context: ExtensionContext) {
  if (!outputChannel) {
    outputChannel = window.createOutputChannel('Arcs Language Server');
  }
  client = new ClientWorkspace(outputChannel);

  if (client.start(context)) {
    client.outputChannel.appendLine(`----Started!---- path = ${client.lspPath}`);
    // Catch the already open files.
    workspace.textDocuments.forEach(doc => client && client.didOpenTextDocument(doc, context));
  } else {
    const status = 'Failed to start. You may need to update Arcs, or configure the extension.';
    window.showInformationMessage(`Arcs Language Server ${status}`);
  }
}

function stop() {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

// Called after extension is started
export async function activate(context: ExtensionContext): Promise<void> {
  const services = clientCommands(context).map(
    (comm: {id: string, impl: (...args: any[]) => any}) =>
      commands.registerCommand(comm.id, comm.impl)
  );

  // Possibly should be client specific.
  services.forEach(service => context.subscriptions.push(service));

  // Start the client. This will also launch the server.
  await start(context);

  // register callbacks to start new work spaces / update old ones.
  workspace.onDidSaveTextDocument(doc => client && client.didSaveTextDocument(doc, context));
  workspace.onDidChangeTextDocument(change => client && client.didChangeTextDocument(change, context));
  workspace.onDidOpenTextDocument(doc => client && client.didOpenTextDocument(doc, context));
}

// this method is called when your extension is deactivated
export function deactivate(): Thenable<void> | undefined {
  return stop();
}
