// ktlint-disable filename
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

@file:Suppress("PackageName", "TopLevelName")

package arcs.sdk

actual fun utf8ToStringImpl(bytes: ByteArray): String = bytes.toString(Charsets.UTF_8)
actual fun stringToUtf8Impl(str: String): ByteArray = str.toByteArray(Charsets.UTF_8)
