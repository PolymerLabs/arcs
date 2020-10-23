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

package arcs.android.devtools

/**
 * An interface for the DevTools server. This allows the [DevToolsService] to send data to a client.
 */
interface DevWebServer {

  /**
   * Send a string to all the clients.
   */
  fun send(msg: String)

  /**
   * Send a string to a single client/websocket.
   */
  fun send(msg: String, socket: DevWebServerImpl.WsdSocket)
}
