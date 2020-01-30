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

object Utils : UtilsInterface {
    override fun log(msg: String) = arcs.sdk.wasm.log(msg)

    override fun abort() = arcs.sdk.wasm.abort()

    override fun assert(message: String, cond: Boolean) {
        if (cond) return
        WasmRuntimeClient.log("AssertionError: $message")
        abort()
    }

    override fun toUtf8String(bytes: ByteArray): String = bytes.decodeToString()
    override fun toUtf8ByteArray(str: String): ByteArray = str.encodeToByteArray()
}
