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

//expect fun utf8ToStringImpl(bytes: ByteArray): String
//expect fun stringToUtf8Impl(str: String): ByteArray
//
fun ByteArray.utf8ToString(): String =  throw NotImplementedError()
fun String.stringToUtf8(): ByteArray =  throw NotImplementedError()
/**
 * Delegate core runtime operations to the appropriate platform.
 */
/*expect*/ object RuntimeClient {
    /**
     * Remove the entity within the Singleton handle of [particle].
     *
     * @param particle particle in scope
     * @param singleton target to be cleared
     */
    @Suppress("UNUSED_PARAMETER")
    fun <T : Entity<T>> singletonClear(particle: Particle, singleton: Singleton<T>): Unit = throw NotImplementedError()

    /**
     * Set the entity of the Singleton handle of [particle].
     *
     * @param particle particle in scope
     * @param singleton target to be cleared
     * @param encoded serialized representation of an entity
     */
    @Suppress("UNUSED_PARAMETER")
    fun <T : Entity<T>> singletonSet(particle: Particle, singleton: Singleton<T>, encoded: NullTermByteArray): Unit = throw NotImplementedError()

    /**
     * Removes all entities to produce an empty collection.
     *
     * @param particle particle in scope
     * @param collection target to be made empty
     */
    @Suppress("UNUSED_PARAMETER")
    fun <T : Entity<T>> collectionClear(particle: Particle, collection: Collection<T>): Unit = throw NotImplementedError()

    /**
     * Remove a single entity from a collection
     *
     * @param particle particle in scope
     * @param collection target to be mutated
     * @param encoded serialized representation of an entity
     */
    @Suppress("UNUSED_PARAMETER")
    fun <T : Entity<T>> collectionRemove(particle: Particle, collection: Collection<T>, encoded: NullTermByteArray): Unit = throw NotImplementedError()

    /**
     * Add a single entity to a collection
     *
     * @param particle particle in scope
     * @param collection target to be mutated
     * @param encoded serialized representation of an entity
     * @return the ID [String] of the stored entity, or null.
     */
    @Suppress("UNUSED_PARAMETER")
    fun <T : Entity<T>> collectionStore(
        particle: Particle,
        collection: Collection<T>,
        encoded: NullTermByteArray
    ): String? = throw NotImplementedError()

    /** @param msg message to write to a logging system. */
    @Suppress("UNUSED_PARAMETER")
    fun log(msg: String): Unit = throw NotImplementedError()

    /**
     * React to UI Rendering
     *
     * @param particle particle in scope
     * @param template string encoding of UI template
     * @param model data model to be interpolated in the template
     */
    @Suppress("UNUSED_PARAMETER")
    fun onRenderOutput(particle: Particle, template: String?, model: NullTermByteArray?): Unit = throw NotImplementedError()

    /**
     * Request an action to be performed by a Service
     *
     * @param particle particle in scope
     * @param call a call string. Format: `<serviceName>.<functionName>`
     * @param encoded serialized key-value data to be passed to the service
     * @param tag name the request to the service
     */
    @Suppress("UNUSED_PARAMETER")
    fun serviceRequest(particle: Particle, call: String, encoded: NullTermByteArray, tag: String): Unit = throw NotImplementedError()

    /** @param url translate to absolute location */
    @Suppress("UNUSED_PARAMETER")
    fun resolveUrl(url: String): String = throw NotImplementedError()

    /**
     * Ensure that a Boolean condition is true, otherwise [abort].
     *
     * @param message description of assertion condition
     * @param cond evaluation of assertion condition
     */
    @Suppress("UNUSED_PARAMETER")
    fun assert(message: String, cond: Boolean): Unit = throw NotImplementedError()

    /** Halt the runtime. */
    @Suppress("UNUSED_PARAMETER")
    fun abort(): Unit = throw NotImplementedError()
}
