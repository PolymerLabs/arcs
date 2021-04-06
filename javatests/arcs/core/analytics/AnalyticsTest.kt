/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.analytics

import arcs.core.common.toArcId
import arcs.core.storage.keys.DatabaseStorageKey
import arcs.core.storage.keys.RamDiskStorageKey
import arcs.core.storage.keys.VolatileStorageKey
import arcs.core.storage.referencemode.ReferenceModeStorageKey
import arcs.core.storage.testutil.DummyStorageKey
import arcs.core.testutil.fail
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class AnalyticsTest {

  @Test
  fun logPaxelEvalLatency_succeeds() {
    try {
      NOOP_ANALYTICS_IMPL.logPaxelEvalLatency(10L)
      Analytics.defaultAnalytics.logPaxelEvalLatency(12L)
    } catch (e: Exception) {
      fail("logPaxelEvalLatency should succeed.")
    }
  }

  @Test
  fun logPaxelEntitiesCount_succeeds() {
    try {
      NOOP_ANALYTICS_IMPL.logPaxelEntitiesCount(13L, 14L)
      Analytics.defaultAnalytics.logPaxelEntitiesCount(15L, 16L)
    } catch (e: Exception) {
      fail("logPaxelEntitiesCount should succeed.")
    }
  }

  @Test
  fun logEntityCountSnapshot_succeeds() {
    try {
      NOOP_ANALYTICS_IMPL.logEntityCountSnapshot(17, Analytics.StorageType.OTHER)
      Analytics.defaultAnalytics.logEntityCountSnapshot(
        18,
        Analytics.StorageType.REFERENCE_MODE_DATABASE
      )
    } catch (e: Exception) {
      fail("logEntityCountSnapshot should succeed.")
    }
  }

  @Test
  fun logStorageSizeSnapshot_succeeds() {
    try {
      NOOP_ANALYTICS_IMPL.logStorageSizeSnapshot(19, Analytics.StorageType.DATABASE)
      Analytics.defaultAnalytics.logStorageSizeSnapshot(20, Analytics.StorageType.RAM_DISK)
    } catch (e: Exception) {
      fail("logStorageSizeSnapshot should succeed.")
    }
  }

  @Test
  fun logStorageTooLarge_succeeds() {
    try {
      NOOP_ANALYTICS_IMPL.logStorageTooLarge()
      Analytics.defaultAnalytics.logStorageTooLarge()
    } catch (e: Exception) {
      fail("logStorageSizeSnapshot should succeed.")
    }
  }

  @Test
  fun logStorageLatency_succeeds() {
    try {
      NOOP_ANALYTICS_IMPL.logStorageLatency(
        1206L,
        Analytics.StorageType.MEMORY_DATABASE,
        Analytics.HandleType.SINGLETON,
        Analytics.Event.SYNC_REQUEST_TO_MODEL_UPDATE
      )
      Analytics.defaultAnalytics.logStorageLatency(
        207L,
        Analytics.StorageType.VOLATILE,
        Analytics.HandleType.COLLECTION,
        Analytics.Event.SYNC_REQUEST_TO_MODEL_UPDATE
      )
    } catch (e: Exception) {
      fail("logStorageLatency should succeed.")
    }
  }

  @Test
  fun logPendingReferenceTimeout_succeeds() {
    try {
      NOOP_ANALYTICS_IMPL.logPendingReferenceTimeout()
      Analytics.defaultAnalytics.logPendingReferenceTimeout()
    } catch (e: Exception) {
      fail("logPendingReferenceTimeout should succeed.")
    }
  }

  @Test
  fun storageKeyToStorageKey_convertsReferenceModeStorageKey() {
    assertThat(
      Analytics.storageKeyToStorageType(ReferenceModeStorageKey(DB_PERSIST_KEY, DB_PERSIST_KEY))
    ).isEqualTo(Analytics.StorageType.REFERENCE_MODE_DATABASE)

    assertThat(
      Analytics.storageKeyToStorageType(ReferenceModeStorageKey(DB_MEMORY_KEY, DB_MEMORY_KEY))
    ).isEqualTo(Analytics.StorageType.REFERENCE_MODE_MEMORY_DATABASE)

    assertThat(
      Analytics.storageKeyToStorageType(ReferenceModeStorageKey(RAM_DISK_KEY, RAM_DISK_KEY))
    ).isEqualTo(Analytics.StorageType.REFERENCE_MODE_RAM_DISK)

    assertThat(
      Analytics.storageKeyToStorageType(ReferenceModeStorageKey(VOLATILE_KEY, VOLATILE_KEY))
    ).isEqualTo(Analytics.StorageType.REFERENCE_MODE_VOLATILE)

    assertThat(
      Analytics.storageKeyToStorageType(ReferenceModeStorageKey(DUMMY_KEY, DUMMY_KEY))
    ).isEqualTo(Analytics.StorageType.REFERENCE_MODE_OTHER)
  }

  @Test
  fun storageKeyToStorageKey_convertsOtherKeys() {
    assertThat(Analytics.storageKeyToStorageType(DB_PERSIST_KEY))
      .isEqualTo(Analytics.StorageType.DATABASE)

    assertThat(Analytics.storageKeyToStorageType(DB_MEMORY_KEY))
      .isEqualTo(Analytics.StorageType.MEMORY_DATABASE)

    assertThat(Analytics.storageKeyToStorageType(RAM_DISK_KEY))
      .isEqualTo(Analytics.StorageType.RAM_DISK)

    assertThat(Analytics.storageKeyToStorageType(VOLATILE_KEY))
      .isEqualTo(Analytics.StorageType.VOLATILE)

    assertThat(Analytics.storageKeyToStorageType(DUMMY_KEY))
      .isEqualTo(Analytics.StorageType.OTHER)
  }

  companion object {
    val NOOP_ANALYTICS_IMPL = object : Analytics {}
    val DB_PERSIST_KEY = DatabaseStorageKey.Persistent("unique", "abc123", "myDB")
    val DB_MEMORY_KEY = DatabaseStorageKey.Memory("unique1", "def456", "myDB")
    val RAM_DISK_KEY = RamDiskStorageKey("backing")
    val VOLATILE_KEY = VolatileStorageKey("myArc".toArcId(), "unique2")
    val DUMMY_KEY = DummyStorageKey("someKey")
  }
}
