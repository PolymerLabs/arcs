package arcs.core.storage.database

import arcs.core.data.Schema
import arcs.core.storage.keys.ForeignStorageKey

/**
 * Helper to perform database deletes based on foreign hard references.
 */
class ForeignReferenceManager(
  private val dbManager: DatabaseManager
) {
  // Removes entities with a foreign hard reference to the given schema/id.
  suspend fun triggerDatabaseDeletion(namespace: Schema, id: String) =
    dbManager.removeEntitiesHardReferencing(ForeignStorageKey(namespace), id)
}
