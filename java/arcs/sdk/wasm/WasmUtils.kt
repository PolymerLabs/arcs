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

import arcs.sdk.wasm.WasmRuntimeClient

actual object Utils {
    actual fun log(msg: String) = arcs.sdk.wasm.log(msg)

    actual fun abort() = arcs.sdk.wasm.abort()

    actual fun assert(message: String, cond: Boolean) {
        if (cond) return
        WasmRuntimeClient.log("AssertionError: $message")
        abort()
    }

    actual fun utf8ToString(bytes: ByteArray): String = bytes.decodeToString()
    actual fun stringToUtf8(str: String): ByteArray = str.encodeToByteArray()
}
