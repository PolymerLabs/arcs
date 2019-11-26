package arcs

/**
 * Delegate core runtime operations to the appropriate platform.
 */
expect object RuntimeClient {
    /**
     * Remove the entity within the Singleton handle of [particle].
     *
     * @param particle Particle in scope
     * @param singleton target to be cleared
     */
    fun <T : Entity<T>> singletonClear(particle: Particle, singleton: Singleton<T>)

    /**
     * Set the entity of the Singleton handle of [particle].
     *
     * @param particle Particle in scope
     * @param singleton target to be cleared
     * @param encoded Serialized representation of an entity
     */
    fun <T : Entity<T>> singletonSet(particle: Particle, singleton: Singleton<T>, encoded: String)

    /**
     * Removes all entities to produce an empty collection.
     *
     * @param particle Particle in scope
     * @param collection target to be made empty
     */
    fun <T : Entity<T>> collectionClear(particle: Particle, collection: Collection<T>)

    /**
     * Remove a single entity from a collection
     *
     * @param particle Particle in scope
     * @param collection target to be mutated
     * @param encoded Serialized representation of an entity
     */
    fun <T : Entity<T>> collectionRemove(particle: Particle, collection: Collection<T>, encoded: String)

    /**
     * Add a single entity to a collection
     *
     * @param particle Particle in scope
     * @param collection target to be mutated
     * @param encoded Serialized representation of an entity
     * @return The ID [String] of the stored entity, or null.
     */
    fun <T : Entity<T>> collectionStore(particle: Particle, collection: Collection<T>, encoded: String): String?

    /** @param msg Message to write to a logging system. */
    fun log(msg: String)

    /**
     * React to UI Rendering
     *
     * @param particle Particle in scope
     * @param template String encoding of UI template
     * @param model Data model to be interpolated in the template
     */
    fun onRenderOutput(particle: Particle, template: String?, model: String?)

    /**
     * Request an action to be performed by a Service
     *
     * @param particle Particle in scope
     * @param call A call string. Format: `<serviceName>.<functionName>`
     * @param encoded Serialized key-value data to be passed to the service
     * @param tag Name the request to the service
     */
    fun serviceRequest(particle: Particle, call: String, encoded: String, tag: String)

    /** @param url translate to absolute location */
    fun resolveUrl(url: String): String

    /**
     * Ensure that a Boolean condition is true, otherwise [abort].
     *
     * @param message Description of assertion condition
     * @param cond Evaluation of assertion condition
     */
    fun assert(message: String, cond: Boolean)

    /** Halt the runtime. */
    fun abort()
}
