package arcs.core.data

import arcs.core.storage.StorageKey
import arcs.core.type.Type

/** Represents a use of a [Handle] by a [Particle]. */
data class HandleConnectionSpec(
    var storageKey: StorageKey?,
    // TODO(shans): type should be a Type, not a Schema
    val type: Type
)
