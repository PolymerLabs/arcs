package arcs.android.integration.ttl

import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.withContext

@OptIn(ExperimentalCoroutinesApi::class)
class Writer : AbstractWriter() {

  suspend fun write(text: String) = withContext(handles.output.dispatcher) {
    handles.output.store(Foo(text))
  }.join()
}
