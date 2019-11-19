package arcs

import arcs.wasm.*

class WasmRuntimeClient : IRuntimeClient {
    override fun <T : Entity<T>> singletonClear(particle: Particle, singleton: Singleton<T>) {
        arcs.wasm.singletonClear(particle.toWasmAddress(), singleton.toWasmAddress())
    }

    override fun <T : Entity<T>> singletonSet(particle: Particle, singleton: Singleton<T>, encoded: String) {
        arcs.wasm.singletonSet(particle.toWasmAddress(), singleton.toWasmAddress(),
            encoded.toWasmString())
    }

    fun <T : Entity<T>> collectionRemove(particle: Particle, collection: Collection<T>, encoded: String) {
        arcs.wasm.collectionRemove(particle.toWasmAddress(), collection.toWasmAddress(),
            encoded.toWasmString())
    }

    fun <T : Entity<T>> collectionClear(particle: Particle, collection: Collection<T>) {
        arcs.wasm.collectionClear(particle.toWasmAddress(), collection.toWasmAddress())
    }

    fun <T : Entity<T>> collectionStore(particle: Particle, collection: Collection<T>, encoded: String) {
        arcs.wasm.collectionStore(particle.toWasmAddress(), collection.toWasmAddress(), encoded.toWasmString())
    }

    fun log(msg: String) {
        arcs.wasm.log(msg);
    }

    fun onRenderOutput(particle: Particle, template: String, model: String) {
        arcs.wasm.onRenderOutput(particle.toWasmAddress(), template.toWasmString(),
            model.toWasmString())
    }

    fun serviceRequest(particle: Particle, call: String, encoded: String, tag: String) {
        arcs.wasm.serviceRequest(particle.toWasmAddress(), call.toWasmString(),
            encoded.toWasmString(), tag.toWasmString())
    }

    fun resolveUrl(url: String): String {
        val r: WasmString = arcs.wasm.resolveUrl(url.toWasmString())
        val resolved = r.toKString()
        _free(r)
        return resolved
    }
}
