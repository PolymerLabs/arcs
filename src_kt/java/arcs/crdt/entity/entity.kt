/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.crdt.entity

/** The name of a field within an entity. */
typealias EntityFieldName = String

/** Arcs-entity-friendly name for [String]. */
typealias Text = String

/** Arcs-entity-friendly name for [ByteArray]. */
typealias Bytes = ByteArray

/** Point in time. Represents milliseconds from the epoch. */
typealias Instant = Long

/** Converts a [String] to an [Instant]. */
fun String.toInstant(): Instant = toLong()

/**
 * Represents a URL.
 *
 * **Note:** URL is not available as part of the kotlin runtime without the JVM, this class is meant
 * to still support "URL" primitives in schemas.
 *
 * TODO: consider supporting common URL-related methods (encoding/decoding), getting the scheme,
 *   etc.
 */
data class Url(val string: String) : CharSequence by string

fun String.toJson(): String = "\"$this\""
fun String.fromJson(): String = substring(1, length - 1)
