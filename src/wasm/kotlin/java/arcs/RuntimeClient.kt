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

expect fun utf8ToStringImpl(bytes: ByteArray): String
expect fun stringToUtf8Impl(str: String): ByteArray

fun ByteArray.utf8ToString(): String = utf8ToStringImpl(this)
fun String.stringToUtf8(): ByteArray = stringToUtf8Impl(this)

/**
 * Delegate core runtime operations to the appropriate platform.
 */
expect object RuntimeClient {
    /**
     * Remove the entity within the Singleton handle of [particle].
     *
     * @param particle particle in scope
     * @param singleton target to be cleared
     */
    fun <T : Entity<T>> singletonClear(particle: Particle, singleton: Singleton<T>)

    /**
     * Set the entity of the Singleton handle of [particle].
     *
     * @param particle particle in scope
     * @param singleton target to be cleared
     * @param encoded serialized representation of an entity
     */
    fun <T : Entity<T>> singletonSet(particle: Particle, singleton: Singleton<T>, encoded: NullTermByteArray)

    /**
     * Removes all entities to produce an empty collection.
     *
     * @param particle particle in scope
     * @param collection target to be made empty
     */
    fun <T : Entity<T>> collectionClear(particle: Particle, collection: Collection<T>)

    /**
     * Remove a single entity from a collection
     *
     * @param particle particle in scope
     * @param collection target to be mutated
     * @param encoded serialized representation of an entity
     */
    fun <T : Entity<T>> collectionRemove(particle: Particle, collection: Collection<T>, encoded: NullTermByteArray)

    /**
     * Add a single entity to a collection
     *
     * @param particle particle in scope
     * @param collection target to be mutated
     * @param encoded serialized representation of an entity
     * @return the ID [String] of the stored entity, or null.
     */
    fun <T : Entity<T>> collectionStore(
        particle: Particle,
        collection: Collection<T>,
        encoded: NullTermByteArray
    ): String?

    /** @param msg message to write to a logging system. */
    fun log(msg: String)

    /**
     * React to UI Rendering
     *
     * @param particle particle in scope
     * @param template string encoding of UI template
     * @param model data model to be interpolated in the template
     */
    fun onRenderOutput(particle: Particle, template: String?, model: NullTermByteArray?)

    /**
     * Request an action to be performed by a Service
     *
     * @param particle particle in scope
     * @param call a call string. Format: `<serviceName>.<functionName>`
     * @param encoded serialized key-value data to be passed to the service
     * @param tag name the request to the service
     */
    fun serviceRequest(particle: Particle, call: String, encoded: NullTermByteArray, tag: String)

    /** @param url translate to absolute location */
    fun resolveUrl(url: String): String

    /**
     * Ensure that a Boolean condition is true, otherwise [abort].
     *
     * @param message description of assertion condition
     * @param cond evaluation of assertion condition
     */
    fun assert(message: String, cond: Boolean)

    /** Halt the runtime. */
    fun abort()
}
