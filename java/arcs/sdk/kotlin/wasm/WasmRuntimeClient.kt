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

package arcs.sdk.kotlin.wasm

import arcs.sdk.kotlin.Collection
import arcs.sdk.kotlin.Entity
import arcs.sdk.kotlin.NullTermByteArray
import arcs.sdk.kotlin.Particle
import arcs.sdk.kotlin.Singleton

actual fun utf8ToStringImpl(bytes: ByteArray): String = bytes.decodeToString()
actual fun stringToUtf8Impl(str: String): ByteArray = str.encodeToByteArray()

actual object RuntimeClient {
    actual fun <T : Entity<T>> singletonClear(particle: Particle, singleton: Singleton<T>) =
        singletonClear(particle.toAddress(), singleton.toAddress())

    actual fun <T : Entity<T>> singletonSet(
        particle: Particle,
        singleton: Singleton<T>,
        encoded: NullTermByteArray
    ) = singletonSet(
        particle.toAddress(),
        singleton.toAddress(),
        encoded.bytes.toWasmAddress()
    )

    actual fun <T : Entity<T>> collectionRemove(
        particle: Particle,
        collection: Collection<T>,
        encoded: NullTermByteArray
    ) = collectionRemove(
        particle.toAddress(),
        collection.toAddress(),
        encoded.bytes.toWasmAddress()
    )

    actual fun <T : Entity<T>> collectionClear(particle: Particle, collection: Collection<T>) =
        collectionClear(particle.toAddress(), collection.toAddress())

    actual fun <T : Entity<T>> collectionStore(
        particle: Particle,
        collection: Collection<T>,
        encoded: NullTermByteArray
    ): String? {
        val wasmId = collectionStore(
            particle.toAddress(),
            collection.toAddress(),
            encoded.bytes.toWasmAddress()
        )
        return wasmId.toNullableKString()?.let { _free(wasmId); it }
    }

    actual fun log(msg: String) = arcs.sdk.kotlin.wasm.log(msg)

    actual fun onRenderOutput(particle: Particle, template: String?, model: NullTermByteArray?) =
        onRenderOutput(
            particle.toAddress(),
            template.toWasmNullableString(),
            model?.bytes?.toWasmAddress() ?: 0
        )

    actual fun serviceRequest(particle: Particle, call: String, encoded: NullTermByteArray, tag: String) =
        serviceRequest(
            particle.toAddress(),
            call.toWasmString(),
            encoded.bytes.toWasmAddress(),
            tag.toWasmString()
        )

    actual fun resolveUrl(url: String): String {
        val r: WasmString = resolveUrl(url.toWasmString())
        val resolved = r.toKString()
        _free(r)
        return resolved
    }

    actual fun abort() = arcs.sdk.kotlin.wasm.abort()

    actual fun assert(message: String, cond: Boolean) {
        if (cond) return
        log("AssertionError: $message")
        abort()
    }
}
