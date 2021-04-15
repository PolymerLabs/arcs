package arcs.core.storage

/** Implementation of [StorageKeyManager] that allows adding new parsers and resetting. */
open class StorageKeyManagerImpl(
  vararg initialSet: StorageKeyParser<*>
) : StorageKeyManager {
  private var parsers: MutableMap<StorageKeyProtocol, StorageKeyParser<*>> =
    initialSet.associateBy { it.protocol }.toMutableMap()

  override fun parse(rawKeyString: String): StorageKey {
    val match =
      requireNotNull(VALID_KEY_PATTERN.matchEntire(rawKeyString)) {
        "Invalid key pattern"
      }

    val protocol = StorageKeyProtocol.parseProtocol(match.groupValues[1])
    val contents = match.groupValues[2]
    val parser = synchronized(this) {
      requireNotNull(parsers[protocol]) {
        "No registered parsers for protocol \"$protocol\""
      }
    }

    return parser.parse(contents)
  }

  override fun addParser(parser: StorageKeyParser<*>) = synchronized(this) {
    parsers[parser.protocol] = parser
  }

  override fun reset(vararg initialSet: StorageKeyParser<*>) = synchronized(this) {
    parsers = initialSet.associateBy { it.protocol }.toMutableMap()
  }

  private companion object {
    private val VALID_KEY_PATTERN = "^([\\w-]+)://(.*)$".toRegex()
  }
}
