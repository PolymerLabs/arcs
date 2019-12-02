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

    actual fun <T : Entity<T>> collectionStore(
        particle: Particle,
        collection: Collection<T>,
        encoded: String): String? = throw NotImplementedError()

    actual fun log(msg: String): Unit = throw NotImplementedError()

    actual fun onRenderOutput(particle: Particle, template: String?, model: String?): Unit =
        throw NotImplementedError()

    actual fun serviceRequest(particle: Particle, call: String, encoded: String, tag: String): Unit =
        throw NotImplementedError()

    actual fun resolveUrl(url: String): String = throw NotImplementedError()

    actual fun abort(): Unit = throw NotImplementedError()

    actual fun assert(message: String, cond: Boolean): Unit = throw NotImplementedError()
}

