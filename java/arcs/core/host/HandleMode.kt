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
package arcs.core.host

/**
 * Specifies the access mode for a [Handle].
 */
enum class HandleMode {
    /** [Handle] is read only. */
    Read,
    /** [Handle] is write only. */
    Write,
    /** [Handle] is read-write. */
    ReadWrite
}
