package arcs

// TODO(alxr): Implement Jvm Runtime
actual object RuntimeClient {
    actual fun <T : Entity<T>> singletonClear(particle: Particle, singleton: Singleton<T>): Unit =
        throw NotImplementedError()

    actual fun <T : Entity<T>> singletonSet(particle: Particle, singleton: Singleton<T>, encoded: String): Unit =
        throw NotImplementedError()

    actual fun <T : Entity<T>> collectionRemove(particle: Particle, collection: Collection<T>, encoded: String): Unit =
        throw NotImplementedError()

    actual fun <T : Entity<T>> collectionClear(particle: Particle, collection: Collection<T>): Unit =
        throw NotImplementedError()

    actual fun <T : Entity<T>> collectionStore(particle: Particle, collection: Collection<T>, encoded: String): Unit =
        throw NotImplementedError()

    actual fun log(msg: String): Unit = throw NotImplementedError()

    actual fun onRenderOutput(particle: Particle, template: String?, model: String?): Unit =
        throw NotImplementedError()

    actual fun serviceRequest(particle: Particle, call: String, encoded: String, tag: String): Unit =
        throw NotImplementedError()

    actual fun resolveUrl(url: String): String = throw NotImplementedError()

    actual fun abort(): Unit = throw NotImplementedError()

    actual fun assert(message: String, cond: Boolean): Unit = throw NotImplementedError()
}

