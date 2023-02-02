package arcs.core.storage.testutil

import arcs.core.crdt.CrdtCount
import arcs.core.crdt.CrdtOperation
import arcs.core.storage.Driver
import arcs.core.storage.StorageKey
import kotlin.reflect.KClass

@Suppress("UNCHECKED_CAST")
class FakeDriver<T : Any>(
  override val storageKey: StorageKey,
  override val dataClass: KClass<T> = CrdtCount.Data::class as KClass<T>
) : Driver<T> {
  override var token: String? = null

  var throwOnSend: Boolean = false
  var doOnSend: ((data: T, version: Int) -> Boolean)? = null
  var sendReturnValue: Boolean = true
  var lastReceiver: (suspend (data: T, version: Int) -> Unit)? = null
  var callLastReceiver: Boolean = true
  var lastData: T? = null
  var lastVersion: Int? = null
  var closed: Boolean = false
  val ops = mutableListOf<CrdtOperation>()

  override suspend fun registerReceiver(
    token: String?,
    receiver: suspend (data: T, version: Int) -> Unit
  ) {
    lastReceiver = receiver
    if (lastData != null && callLastReceiver) {
      receiver(lastData!!, lastVersion!!)
    }
  }

  override suspend fun send(data: T, version: Int): Boolean {
    if (throwOnSend) throw UnsupportedOperationException("Not supposed to be called")
    lastData = data
    lastVersion = version
    val response = doOnSend?.invoke(data, version) ?: sendReturnValue
    if (response && callLastReceiver) {
      lastReceiver?.invoke(data, version)
    }
    return response
  }

  override suspend fun applyOps(ops: List<CrdtOperation>) {
    this.ops.addAll(ops)
  }

  override suspend fun close() {
    closed = true
  }

  override suspend fun clone(): FakeDriver<T> {
    val driver = FakeDriver(storageKey, dataClass)
    driver.lastVersion = lastVersion
    driver.lastData = lastData
    return driver
  }
}
