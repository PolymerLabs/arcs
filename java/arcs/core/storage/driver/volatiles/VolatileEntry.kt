package arcs.core.storage.driver.volatiles

/** A single entry in a [VolatileDriver]. */
data class VolatileEntry<Data : Any>(
  val data: Data? = null,
  val version: Int = 0,
  val drivers: Set<VolatileDriver<Data>> = emptySet()
) {
  constructor(data: Data? = null, version: Int = 0, vararg drivers: VolatileDriver<Data>) :
    this(data, version, drivers.toSet())
}
