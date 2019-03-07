
import {DevtoolsConnection} from '../../../build/runtime/debug/devtools-connection.js';

// TODO(sjmiles): move into a module?
export const devtools = async () => {
  const params = (new URL(document.location)).searchParams;
  if (params.has('remote-explore-key')) {
    // Wait for the remote Arcs Explorer to connect before starting the Shell.
    DevtoolsConnection.ensure();
    await DevtoolsConnection.onceConnected;
  }
};
