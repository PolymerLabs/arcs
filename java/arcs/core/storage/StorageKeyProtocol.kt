package arcs.core.storage

import arcs.flags.BuildFlags

/** All [StorageKey] protocols understood by Arcs. */
enum class StorageKeyProtocol(
  private val longProtocol: String,
  private val shortProtocol: String
) {
  // Sorted alphabetically by shortProtocol.
  Create("create", "c"),
  Database("db", "d"),
  ReferenceMode("reference-mode", "e"),
  Foreign("foreign", "f"),
  Inline("inline", "i"),
  Join("join", "j"),
  InMemoryDatabase("memdb", "m"),
  RamDisk("ramdisk", "r"),
  Dummy("dummy", "u"),
  Volatile("volatile", "v");

  val protocolStr: String
    get() {
      // TODO(b/179216769): Delete longProtocol once flag has launched.
      return if (BuildFlags.STORAGE_KEY_REDUCTION) shortProtocol else longProtocol
    }

  override fun toString(): String = protocolStr

  companion object {
    private val SHORT_PROTOCOLS = values().associateBy { it.shortProtocol }
    private val LONG_PROTOCOLS = values().associateBy { it.longProtocol }

    fun parseProtocol(protocol: String): StorageKeyProtocol {
      val protocols = if (BuildFlags.STORAGE_KEY_REDUCTION) SHORT_PROTOCOLS else LONG_PROTOCOLS
      return protocols[protocol] ?: throw IllegalArgumentException(
        "Unknown storage key protocol: $protocol"
      )
    }
  }
}
