package arcs.core.util

/** Char used to seperate entries in the [VersionMap] encoding. */
val ENTRIES_SEPARATOR = ';'
/** Char used to seperate actor and version in the [VersionMap] encoding. */
val ACTOR_VERSION_DELIMITER = '|'

/** Set of strings not allowed in [VersionMap] encoded. */
val FORBIDDEN_STRINGS = setOf(ENTRIES_SEPARATOR.toString(), ACTOR_VERSION_DELIMITER.toString())
