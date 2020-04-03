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
package arcs.core.data

/**
 * Specifies the access mode for a [Handle].
 */
enum class HandleMode(
    val canRead: Boolean = false,
    val canWrite: Boolean = false,
    val canQuery: Boolean = false
) {
    /** [Handle] is read only. */
    Read(canRead = true),
    /** [Handle] is write only. */
    Write(canWrite = true),
    /** [Handle] is query only. */
    Query(canQuery = true),
    /** [Handle] is read-write. */
    ReadWrite(canRead = true, canWrite = true),
    /** [Handle] is read-query. */
    ReadQuery(canRead = true, canQuery = true),
    /** [Handle] is query-write. */
    WriteQuery(canWrite = true, canQuery = true),
    /** [Handle] is read-query-write. */
    ReadWriteQuery(canRead = true, canWrite = true, canQuery = true);
}
