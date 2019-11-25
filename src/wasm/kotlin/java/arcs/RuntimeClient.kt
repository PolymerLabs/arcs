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
     */
    fun <T : Entity<T>> collectionStore(particle: Particle, collection: Collection<T>, encoded: String)

    /** @param msg Message to write to a logging system. */
    fun log(msg: String)

    /**
     *
     */
    fun onRenderOutput(particle: Particle, template: String?, model: String?)

    fun serviceRequest(particle: Particle, call: String, encoded: String, tag: String)

    fun resolveUrl(url: String): String

    fun assert(cond: Boolean)

    fun abort()
}
