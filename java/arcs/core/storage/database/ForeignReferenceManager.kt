package arcs.core.storage.database

import arcs.core.analytics.Analytics
import arcs.core.data.Schema
import arcs.core.storage.keys.ForeignStorageKey

/**
 * Helper to perform database deletes based on foreign hard references.
 */
class ForeignReferenceManager(
  private val dbManager: DatabaseManager,
  private val analytics: Analytics? = null
) {
  // Removes entities with a foreign hard reference to the given schema/id.
  suspend fun triggerDatabaseDeletion(namespace: Schema, id: String) {
    val entitiesCountBefore = dbManager.getEntitiesCount(persistent = true) +
      dbManager.getEntitiesCount(persistent = false)
    dbManager.removeEntitiesHardReferencing(ForeignStorageKey(namespace), id)
    val entitiesCountAfter = dbManager.getEntitiesCount(persistent = true) +
      dbManager.getEntitiesCount(persistent = false)
    analytics?.logDeletionPropagationTrigger(entitiesCountBefore - entitiesCountAfter)
  }

  /**
   * Checks the IDs stored in the database against the given [fullSet], and triggers a deletion for
   * any ID which is in the database, but not in the [fullSet].
   */
  suspend fun reconcile(namespace: Schema, fullSet: Set<String>) {
    val entitiesCountBefore = dbManager.getEntitiesCount(persistent = true) +
      dbManager.getEntitiesCount(persistent = false)
    val dbIds = dbManager.getAllHardReferenceIds(ForeignStorageKey(namespace))
    dbIds.filterNot { fullSet.contains(it) }.forEach { triggerDatabaseDeletion(namespace, it) }
    val entitiesCountAfter = dbManager.getEntitiesCount(persistent = true) +
      dbManager.getEntitiesCount(persistent = false)
    analytics?.logDeletionPropagationReconcile(entitiesCountBefore - entitiesCountAfter)
  }
}
