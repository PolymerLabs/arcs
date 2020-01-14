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
@file:Suppress("PackageName", "TopLevelName")
package arcs.sdk

actual fun utf8ToStringImpl(bytes: ByteArray): String = bytes.toString(Charsets.UTF_8)
actual fun stringToUtf8Impl(str: String): ByteArray = str.toByteArray(Charsets.UTF_8)

// TODO(alxr): Implement Jvm Runtime
actual object RuntimeClient {
    actual fun <T : Entity> singletonClear(particle: Particle, singleton: Singleton<T>): Unit =
        throw NotImplementedError()

    actual fun <T : Entity> singletonSet(
        particle: Particle,
        singleton: Singleton<T>,
        encoded: NullTermByteArray
    ): Unit = throw NotImplementedError()

    actual fun <T : Entity> collectionRemove(
        particle: Particle,
        collection: Collection<T>,
        encoded: NullTermByteArray
    ): Unit = throw NotImplementedError()

    actual fun <T : Entity> collectionClear(
        particle: Particle,
        collection: Collection<T>
    ): Unit = throw NotImplementedError()

    actual fun <T : Entity> collectionStore(
        particle: Particle,
        collection: Collection<T>,
        encoded: NullTermByteArray
    ): String? = throw NotImplementedError()

    actual fun log(msg: String): Unit = throw NotImplementedError()

    actual fun onRenderOutput(
        particle: Particle,
        template: String?,
        model: NullTermByteArray?
    ): Unit = throw NotImplementedError()

    actual fun serviceRequest(
        particle: Particle,
        call: String,
        encoded: NullTermByteArray,
        tag: String
    ): Unit = throw NotImplementedError()

    actual fun resolveUrl(url: String): String = throw NotImplementedError()

    actual fun abort(): Unit = throw NotImplementedError()

    actual fun assert(message: String, cond: Boolean): Unit = throw NotImplementedError()
}
