package arcs.core.storage

/** Implementation of [StorageKeyManager] that allows adding new parsers and resetting. */
open class StorageKeyManagerImpl(
  vararg initialSet: StorageKeyParser<*>
) : StorageKeyManager {
  private var parsers: MutableMap<StorageKeyProtocol, StorageKeyParser<*>> =
    initialSet.associateBy { it.protocol }.toMutableMap()

  override fun parse(rawKeyString: String): StorageKey {
    var match: MatchResult? = null
    // Try matching the short-form protocol first.
    match = SHORT_PROTOCOL_PATTERN.matchEntire(rawKeyString)
    if (match == null) {
      // Fall back to the long-form protocol.
      match = requireNotNull(LONG_PROTOCOL_PATTERN.matchEntire(rawKeyString)) {
        "Invalid key pattern: $rawKeyString"
      }
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
    /** Matches keys with long-form protocols, e.g. `create://abcd` */
    private val LONG_PROTOCOL_PATTERN = "^([\\w-]+)://(.*)$".toRegex()

    /** Matches keys with short-form protocols, e.g. `c|abcd` */
    private val SHORT_PROTOCOL_PATTERN = "^(\\w)\\|(.*)$".toRegex()
  }
}
