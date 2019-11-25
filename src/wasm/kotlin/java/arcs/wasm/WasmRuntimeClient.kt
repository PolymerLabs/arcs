package arcs

import arcs.wasm.*

actual object RuntimeClient {
    actual fun <T : Entity<T>> singletonClear(particle: Particle, singleton: Singleton<T>) =
        singletonClear(particle.toAddress(), singleton.toAddress())

    actual fun <T : Entity<T>> singletonSet(particle: Particle, singleton: Singleton<T>, encoded: String) =
        singletonSet(particle.toAddress(), singleton.toAddress(),
            encoded.toWasmString())

    actual fun <T : Entity<T>> collectionRemove(particle: Particle, collection: Collection<T>, encoded: String) =
        collectionRemove(particle.toAddress(), collection.toAddress(),
            encoded.toWasmString())

    actual fun <T : Entity<T>> collectionClear(particle: Particle, collection: Collection<T>) =
        collectionClear(particle.toAddress(), collection.toAddress())

    actual fun <T : Entity<T>> collectionStore(particle: Particle, collection: Collection<T>, encoded: String) =
        collectionStore(particle.toAddress(), collection.toAddress(), encoded.toWasmString())

    actual fun log(msg: String) = arcs.wasm.log(msg);

    actual fun onRenderOutput(particle: Particle, template: String?, model: String?) =
        onRenderOutput(particle.toAddress(), template.toWasmNullableString(),
            model.toWasmNullableString())

    actual fun serviceRequest(particle: Particle, call: String, encoded: String, tag: String) =
        serviceRequest(particle.toAddress(), call.toWasmString(),
            encoded.toWasmString(), tag.toWasmString())

    actual fun resolveUrl(url: String): String {
        val r: WasmString = resolveUrl(url.toWasmString())
        val resolved = r.toKString()
        _free(r)
        return resolved
    }

    actual fun abort() = arcs.wasm.abort();

    actual fun assert(message: String, cond: Boolean) {
        if(!cond) {
            log("AssertionError: $message")
            abort()
        }
    }

}
