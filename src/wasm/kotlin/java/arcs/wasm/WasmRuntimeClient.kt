/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs

import arcs.wasm._free
import arcs.wasm.collectionClear
import arcs.wasm.collectionRemove
import arcs.wasm.collectionStore
import arcs.wasm.onRenderOutput
import arcs.wasm.resolveUrl
import arcs.wasm.singletonClear
import arcs.wasm.singletonSet
import arcs.wasm.serviceRequest
import arcs.wasm.toAddress
import arcs.wasm.toKString
import arcs.wasm.toNullableKString
import arcs.wasm.toWasmNullableString
import arcs.wasm.toWasmString
import arcs.wasm.WasmString

actual object RuntimeClient {
    actual fun <T : Entity<T>> singletonClear(particle: Particle, singleton: Singleton<T>) =
        singletonClear(particle.toAddress(), singleton.toAddress())

    actual fun <T : Entity<T>> singletonSet(particle: Particle, singleton: Singleton<T>, encoded: String) =
        singletonSet(
            particle.toAddress(),
            singleton.toAddress(),
            encoded.toWasmString()
        )

    actual fun <T : Entity<T>> collectionRemove(particle: Particle, collection: Collection<T>, encoded: String) =
        collectionRemove(
            particle.toAddress(),
            collection.toAddress(),
            encoded.toWasmString()
        )

    actual fun <T : Entity<T>> collectionClear(particle: Particle, collection: Collection<T>) =
        collectionClear(particle.toAddress(), collection.toAddress())

    actual fun <T : Entity<T>> collectionStore(
        particle: Particle,
        collection: Collection<T>,
        encoded: String
    ): String? {
        val wasmId = collectionStore(
            particle.toAddress(),
            collection.toAddress(),
            encoded.toWasmString()
        )
        return wasmId.toNullableKString()?.let { _free(wasmId); it }
    }

    actual fun log(msg: String) = arcs.wasm.log(msg);

    actual fun onRenderOutput(particle: Particle, template: String?, model: String?) =
        onRenderOutput(
            particle.toAddress(),
            template.toWasmNullableString(),
            model.toWasmNullableString()
        )

    actual fun serviceRequest(particle: Particle, call: String, encoded: String, tag: String) =
        serviceRequest(
            particle.toAddress(),
            call.toWasmString(),
            encoded.toWasmString(),
            tag.toWasmString()
        )

    actual fun resolveUrl(url: String): String {
        val r: WasmString = resolveUrl(url.toWasmString())
        val resolved = r.toKString()
        _free(r)
        return resolved
    }

    actual fun abort() = arcs.wasm.abort();

    actual fun assert(message: String, cond: Boolean) {
        if (cond) return
        log("AssertionError: $message")
        abort()
    }
}
