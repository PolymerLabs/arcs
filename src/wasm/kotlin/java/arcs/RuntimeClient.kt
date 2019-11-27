package arcs

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
    fun <T : Entity<T>> singletonSet(particle: Particle, singleton: Singleton<T>, encoded: String)

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
    fun <T : Entity<T>> collectionRemove(particle: Particle, collection: Collection<T>, encoded: String)

    /**
     * Add a single entity to a collection
     *
     * @param particle particle in scope
     * @param collection target to be mutated
     * @param encoded serialized representation of an entity
     * @return the ID [String] of the stored entity, or null.
     */
    fun <T : Entity<T>> collectionStore(particle: Particle, collection: Collection<T>, encoded: String): String?

    /** @param msg message to write to a logging system. */
    fun log(msg: String)

    /**
     * React to UI Rendering
     *
     * @param particle particle in scope
     * @param template string encoding of UI template
     * @param model data model to be interpolated in the template
     */
    fun onRenderOutput(particle: Particle, template: String?, model: String?)

    /**
     * Request an action to be performed by a Service
     *
     * @param particle particle in scope
     * @param call a call string. Format: `<serviceName>.<functionName>`
     * @param encoded serialized key-value data to be passed to the service
     * @param tag name the request to the service
     */
    fun serviceRequest(particle: Particle, call: String, encoded: String, tag: String)

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
