package arcs.core.host

import arcs.core.common.ArcId

/**
 * Represents a registered callback listener and the [ArcId] it's registered to compactly.
 * Primarily used to remove callbacks.
 */
@Suppress("EXPERIMENTAL_FEATURE_WARNING")
inline class ArcStateChangeRegistration(private val callbackId: String) {
  constructor(arcId: ArcId, block: Any) : this("$arcId;${block.hashCode()}")

  fun arcId(): String = callbackId.substringBefore(";", "").also { check(it.isNotEmpty()) }
}
