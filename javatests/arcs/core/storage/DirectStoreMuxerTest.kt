package arcs.core.storage

import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtSingleton
import arcs.core.crdt.VersionMap
import arcs.core.data.EntityType
import arcs.core.data.FieldType
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.util.toReferencable
import arcs.core.storage.api.DriverAndKeyConfigurator
import arcs.core.storage.keys.RamDiskStorageKey
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.launch
import kotlinx.coroutines.runBlocking
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
class DirectStoreMuxerTest {

  @Test
  fun directStoreMuxerNoRace() = runBlocking<Unit>(Dispatchers.IO) {
    DriverAndKeyConfigurator.configure(null)

    val storageKey = RamDiskStorageKey("test")

    val schema = Schema(
      emptySet(),
      SchemaFields(
        singletons = mapOf(
          "field" to FieldType.Text
        ),
        collections = emptyMap()
      ),
      "abc"
    )

    var callbacks = 0

    val directStoreMuxer = DirectStoreMuxer<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>(
      storageKey = storageKey,
      backingType = EntityType(schema),
      devToolsProxy = null
    )

    val callbackId = directStoreMuxer.on {
      callbacks++
    }

    val vm1 = VersionMap("first" to 1)
    val value = CrdtSingleton(
      initialVersion = vm1,
      initialData = CrdtEntity.Reference.buildReference("xyz".toReferencable())
    )
    val data = CrdtEntity.Data(
      versionMap = vm1,
      singletons = mapOf(
        "field" to value
      )
    )

    // Attempt to trigger a child store setup race
    coroutineScope {
      launch { directStoreMuxer.getLocalData("a", callbackId) }
      launch {
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("a", ProxyMessage.ModelUpdate(data, 1))
        )
      }
      launch { directStoreMuxer.getLocalData("a", callbackId) }
      launch {
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("a", ProxyMessage.ModelUpdate(data, 1))
        )
      }
      launch { directStoreMuxer.getLocalData("a", callbackId) }
      launch {
        directStoreMuxer.onProxyMessage(
          MuxedProxyMessage("a", ProxyMessage.ModelUpdate(data, 1))
        )
      }
    }

    val otherStore = DirectStore.create<CrdtEntity.Data, CrdtEntity.Operation, CrdtEntity>(
      StoreOptions(
        storageKey = storageKey.childKeyWithComponent("a"),
        type = EntityType(schema)
      ),
      null
    )

    val newValue = CrdtSingleton(
      initialVersion = VersionMap("other" to 2),
      initialData = CrdtEntity.Reference.buildReference("asdfadf".toReferencable())
    )
    val newData = CrdtEntity.Data(
      versionMap = VersionMap("other" to 2),
      singletons = mapOf(
        "field" to newValue
      )
    )

    coroutineScope {
      otherStore.onProxyMessage(
        ProxyMessage.ModelUpdate(
          newData, 1
        )
      )
    }
    assertThat(callbacks).isEqualTo(1)
  }
}
