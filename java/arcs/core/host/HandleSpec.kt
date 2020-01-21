package arcs.core.host

import arcs.core.data.Schema
import arcs.core.storage.StorageKey

/**
 * A [HandleSpec] represents a handle in a recipe that has either been resolved (contains a
 * [StorageKey]), or requires the allocator to construct a new [StorageKey].
 * @property id handle id from the manifest
 * @property name the name of the handle
 * @property storageKey the [StorageKey] backing this handle.
 * @property tags specified on the handle in the manifest.
 * @property schema is the [Schema] definition used for this [StorageKey]
 */
class HandleSpec(
    // unused for now
    var id: String?,
    var name: String?,
    var storageKey: StorageKey?,
    val tags: Set<String> = mutableSetOf(),
    val schema: Schema
)
