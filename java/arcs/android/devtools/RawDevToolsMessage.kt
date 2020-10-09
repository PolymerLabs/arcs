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

import arcs.android.devtools.DevToolsMessage.Companion.RAW_MESSAGE
import arcs.core.util.JsonValue

/**
 * An implementation of [DevToolsMessage] to pass raw [ProxyMessage]s.
 */
class RawDevToolsMessage(override val message: JsonValue.JsonString) : DevToolsMessage {
  override val kind: String = RAW_MESSAGE
}
