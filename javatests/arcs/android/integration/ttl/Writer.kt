package arcs.android.integration.ttl

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext

@OptIn(ExperimentalCoroutinesApi::class)
class Writer : AbstractWriter() {

  suspend fun write(entity: FixtureEntity) = withContext(handles.output.dispatcher) {
    handles.output.store(entity)
  }.join()

  suspend fun writeCollection(entity: FixtureEntity) {
    withContext(handles.collection.dispatcher) {
      handles.collection.store(entity)
    }.join()
  }

  suspend fun writeCollectionNoTtl(entity: FixtureEntity) {
    withContext(handles.collectionNoTtl.dispatcher) {
      handles.collectionNoTtl.store(entity)
    }.join()
  }
}
