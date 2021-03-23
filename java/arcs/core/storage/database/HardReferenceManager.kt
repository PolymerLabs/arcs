package arcs.core.storage.database

import arcs.core.storage.StorageKey

/**
 * Helper to perform database deletes based on hard references.
 */
class HardReferenceManager(
  private val dbManager: DatabaseManager
) {
  // Removes entities with a hard reference to the given id and backing storage key.
  suspend fun triggerDatabaseDeletion(storageKey: StorageKey, id: String) =
    dbManager.removeEntitiesHardReferencing(storageKey, id)

  /**
   * Checks the IDs stored in the database against the given [fullSet], and triggers a deletion for
   * any ID which is in the database, but not in the [fullSet].
   */
  suspend fun reconcile(storageKey: StorageKey, fullSet: Set<String>): Long {
    val dbIds = dbManager.getAllHardReferenceIds(storageKey)
    System.out.println("reconcile: fullSet: $fullSet")
    System.out.println("storageKey: $storageKey")
    System.out.println("dbIds: $dbIds")
    return dbIds
      .filterNot {
        System.out.println(">>> Contains check $it -> ${fullSet.contains(it)}")
        fullSet.contains(it)
      }
      .map {
        System.out.println(">>> Deleting $storageKey, $it")
        triggerDatabaseDeletion(storageKey, it)
      }
      .sum()
  }
}
