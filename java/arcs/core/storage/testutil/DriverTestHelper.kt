package arcs.core.storage.testutil

import arcs.core.storage.Driver
import kotlinx.coroutines.CompletableJob
import kotlinx.coroutines.Job

/**
 * Wraps a [Driver] with logic to allow the driver to be synchronously driven (i.e.
 * provides get and set methods instead of send and receive methods).
 */
class DriverTestHelper<Data : Any> private constructor(private val driver: Driver<Data>) {
  private var data: Data? = null
  private var version: Int = -1
  private val dataAvailable: CompletableJob = Job()

  suspend fun get(): Data {
    dataAvailable.join()
    return data!!
  }

  suspend fun set(data: Data): Boolean {
    dataAvailable.join()
    return driver.send(data, version + 1)
  }

  companion object {
    suspend fun <Data : Any> create(driver: Driver<Data>): DriverTestHelper<Data> {
      val helper = DriverTestHelper(driver)
      driver.registerReceiver(token = null) { data: Data, i: Int ->
        helper.data = data
        helper.version = i
        if (!helper.dataAvailable.isCompleted) {
          helper.dataAvailable.complete()
        }
      }
      return helper
    }
  }
}

suspend fun <Data : Any> Driver<Data>.getStoredDataForTesting(): Data {
  return DriverTestHelper.create(clone()).get()
}
