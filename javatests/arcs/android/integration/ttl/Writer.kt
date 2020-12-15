package arcs.android.integration.ttl

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext

@OptIn(ExperimentalCoroutinesApi::class)
class Writer : AbstractWriter() {

  suspend fun write(entity: FixtureEntity) = withContext(handles.output.dispatcher) {
    handles.output.store(entity)
  }.join()
}
