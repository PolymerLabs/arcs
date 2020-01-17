package arcs.core.host

import arcs.core.data.Schema
import arcs.core.storage.StorageKey

/**
 * A [HandleSpec] represents a handle in a recipe that has either been resolved (contains a
 * [StorageKey]), or requires the allocator to construct a new [StorageKey].
 * [schema] is the [Schema] definition that this [StorageKey] uses, typically retrieved from
 * the Entity class generated at build time.
 */
class HandleSpec(
    // unused for now
    var id: String?,
    var name: String?,
    var storageKey: StorageKey?,
    val tags: Set<String> = mutableSetOf(),
    val schema: Schema
)
