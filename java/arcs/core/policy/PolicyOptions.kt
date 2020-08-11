package arcs.core.policy

import arcs.core.data.StoreId

/** Config options for policy enforcement. */
data class PolicyOptions(
    /**
     * Maps from store ID to the schema name of the type it stores. Indicates all of the stores
     * protected by policy
     *
     * Temporary measure until we have a proper way to designate these stores.
     */
    val storeMap: Map<StoreId, String>
)
