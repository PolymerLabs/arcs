@file:Suppress("EXPERIMENTAL_FEATURE_WARNING", "EXPERIMENTAL_API_USAGE")

package arcs.android.integration.ttl

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext

@OptIn(ExperimentalCoroutinesApi::class)
class Reader : AbstractReader() {

  suspend fun read(): FixtureEntity? = withContext(handles.input.dispatcher) {
    handles.input.fetch()
  }

  suspend fun readCollection(): Set<FixtureEntity> = withContext(handles.collection.dispatcher) {
    handles.collection.fetchAll()
  }

  suspend fun readCollectionNoTtl(): Set<FixtureEntity> {
    return withContext(handles.collectionNoTtl.dispatcher) {
      handles.collectionNoTtl.fetchAll()
    }
  }
}
