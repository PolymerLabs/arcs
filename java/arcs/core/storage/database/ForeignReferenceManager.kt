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

  /**
   * Checks the IDs stored in the database against the given [fullSet], and triggers a deletion for
   * any ID which is in the database, but not in the [fullSet].
   */
  suspend fun reconcile(namespace: Schema, fullSet: Set<String>) {
    val dbIds = dbManager.getAllHardReferenceIds(ForeignStorageKey(namespace))
    dbIds.filterNot { fullSet.contains(it) }.forEach { triggerDatabaseDeletion(namespace, it) }
  }
}
