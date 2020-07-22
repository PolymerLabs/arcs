/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.devtools;


/**
 * Exposed API for the DevToolsService.
 *
 * TODO: subject to change.
 */
interface IDevToolsService {
    /** Sends the [str] to the remote device */
    oneway void send(String str);

    /** Start the [DevWebSocket]. */
    void start();

  /** Close the [DevWebSocket] to free up the port. */
    void close();
}
