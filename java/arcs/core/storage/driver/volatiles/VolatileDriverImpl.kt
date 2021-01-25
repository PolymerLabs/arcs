package arcs.core.storage.driver.volatiles

import arcs.core.storage.Driver
import arcs.core.storage.DriverReceiver
import arcs.core.storage.StorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.util.TaggedLog
import kotlin.reflect.KClass
import kotlinx.atomicfu.atomic

/** [Driver] implementation for an in-memory store of data. */
class VolatileDriverImpl<Data : Any> private constructor(
  override val storageKey: StorageKey,
  override val dataClass: KClass<Data>,
  private val memory: VolatileMemory,
  private val onClose: suspend (VolatileDriver<Data>) -> Unit = {}
) : VolatileDriver<Data> {
  // TODO(#5551): Consider including a hash of the toString info in log prefix.
  private val log = TaggedLog { "VolatileDriver" }

  // The identifier is simply used to help differentiate between VolatileDrivers for the same
  // storage key.
  private val identifier = nextIdentifier.incrementAndGet()
  private var pendingVolatileEntry = VolatileEntry<Data>(data = null, version = 0)

  override var receiver: DriverReceiver<Data>? = null
    private set

  override val token: String?
    get() = memory.token

  init {
    require(
      // VolatileDriver does double-duty: serving both Volatile and RamDisk purposes, just
      // with different policies on which instances of VolatileMemory they point at.
      storageKey is VolatileStorageKey || storageKey is RamDiskStorageKey
    ) { "Invalid storage key type: ${storageKey.protocol}" }
  }

  override suspend fun initialize() {
    memory.update<Data>(storageKey) { currentValue ->
      val dataForCriteria: VolatileEntry<Data> = currentValue?.also {
        pendingVolatileEntry = it
      } ?: VolatileEntry()

      // Add the data to the memory.
      dataForCriteria.copy(drivers = dataForCriteria.drivers + this)
    }
    log.debug { "Created" }
  }

  override suspend fun registerReceiver(token: String?, receiver: DriverReceiver<Data>) {
    this.receiver = receiver

    this.pendingVolatileEntry
      .takeIf { this.token != token }
      ?.let { (data, version) -> if (data != null) receiver(data, version) }

    // Denotes that we have now sent the pending entry to the receiver given the check above.
    this.pendingVolatileEntry = VolatileEntry(null)
  }

  override suspend fun send(data: Data, version: Int): Boolean {
    log.verbose { "send($data, $version)" }
    val (success, newEntry) = memory.update<Data>(storageKey) { optCurrentValue ->
      val currentValue = optCurrentValue ?: VolatileEntry<Data>()
      val currentVersion = currentValue.version
      // If the new version isn't immediately after this one, return false.
      if (currentVersion != version - 1) {
        log.verbose { "current entry version = ${currentValue.version}, incoming = $version" }
        currentValue
      } else {
        currentValue.copy(
          data = data,
          version = version,
          drivers = currentValue.drivers + this
        )
      }
    }

    if (success) {
      newEntry.drivers.forEach { driver ->
        val receiver = driver.takeIf { it != this }?.receiver
        log.verbose { "Invoking receiver: $receiver" }
        receiver?.invoke(data, version)
      }
    }

    return success
  }

  override suspend fun close() {
    super.close()
    onClose(this)
  }

  override fun toString(): String = "VolatileDriver($storageKey, $identifier)"

  override suspend fun clone(): VolatileDriver<Data> {
    return create(storageKey, dataClass, memory)
  }

  companion object {
    private var nextIdentifier = atomic(0)

    /** Creates and initializes a new [VolatileDriverImpl]. */
    suspend fun <Data : Any> create(
      storageKey: StorageKey,
      dataClass: KClass<Data>,
      memory: VolatileMemory,
      onClose: suspend (VolatileDriver<Data>) -> Unit = {}
    ): VolatileDriver<Data> {
      val driver = VolatileDriverImpl(storageKey, dataClass, memory, onClose)
      driver.initialize()
      return driver
    }
  }
}
