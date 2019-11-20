package arcs

actual object RuntimeClient {
    actual fun <T : Entity<T>> singletonClear(particle: Particle, singleton: Singleton<T>) {
    }

    actual fun <T : Entity<T>> singletonSet(particle: Particle, singleton: Singleton<T>, encoded: String) {
    }

    actual fun <T : Entity<T>> collectionRemove(particle: Particle, collection: Collection<T>, encoded: String) {
    }

    actual fun <T : Entity<T>> collectionClear(particle: Particle, collection: Collection<T>) {
    }

    actual fun <T : Entity<T>> collectionStore(particle: Particle, collection: Collection<T>, encoded: String) {
    }

    actual fun log(msg: String) {
    }

    actual fun onRenderOutput(particle: Particle, template: String?, model: String?) {

    }

    actual fun serviceRequest(particle: Particle, call: String, encoded: String, tag: String) {

    }

    actual fun resolveUrl(url: String): String = ""

    actual fun abort() {
    }

    actual fun assert(cond: Boolean) {
    }
}

