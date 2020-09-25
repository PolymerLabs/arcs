package arcs.core.storage.driver.volatiles

import arcs.core.storage.Driver
import arcs.core.storage.DriverReceiver
import arcs.core.storage.StorageKey

/** Extension of [Driver] for managing in-memory key-value storage for a particular [StorageKey]. */
interface VolatileDriver<Data : Any> : Driver<Data> {
  /** Listener registered with the driver, if any. */
  val receiver: DriverReceiver<Data>?

  /** Perform any necessary initialization for the driver, like fetching initial values. */
  suspend fun initialize()
}
