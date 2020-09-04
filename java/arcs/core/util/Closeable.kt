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

package arcs.core.util

/** Extension function to support [Closeable] mirrored on the Java version. */
inline fun <T : Closeable?, R> T.use(block: (T) -> R?): R? {
    try {
        return block(this)
    } finally {
        this?.close()
    }
}

/** Replacement for java.io.Closeable that is multiplatform portable. */
interface Closeable {
    fun close()
}
