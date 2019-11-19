package arcs

interface IRuntimeClient {
    fun <T : Entity<T>> singletonClear(particle: Particle, singleton: Singleton<T>)
    fun <T : Entity<T>> singletonSet(particle: Particle, singleton: Singleton<T>, encoded: String)
}
