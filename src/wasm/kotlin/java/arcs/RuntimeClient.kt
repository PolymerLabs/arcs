package arcs

object RuntimeClient {
    var impl: IRuntimeClient? = null
    fun <T : Entity<T>> singletonClear(particle: Particle, singleton: Singleton<T>) {
      impl?.singletonClear(particle, singleton)
    }

    fun <T : Entity<T>> singletonSet(particle: Particle, singleton: Singleton<T>, encoded: String) {
        impl?.singletonSet(particle, singleton, encoded)
    }
}
