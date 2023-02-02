package arcs.android.integration.writeonlystack

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.integration.IntegrationEnvironment
import arcs.android.util.testutil.AndroidLogRule
import arcs.core.entity.testutil.FixtureEntities
import arcs.core.entity.testutil.FixtureEntity
import arcs.core.host.toRegistration
import arcs.core.storage.WriteOnlyStorageProxyImpl
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

class Reader : AbstractReader() {
  suspend fun read() = withContext(handles.input.dispatcher) {
    handles.input.fetchAll()
  }
}
class Writer : AbstractWriter() {
  suspend fun write(entity: FixtureEntity) {
    withContext(handles.output.dispatcher) {
      handles.output.store(entity)
    }.join()
  }

  suspend fun remove(entity: FixtureEntity) {
    withContext(handles.output.dispatcher) {
      handles.output.remove(entity)
    }.join()
  }

  suspend fun clear() {
    withContext(handles.output.dispatcher) {
      handles.output.clear()
    }.join()
  }

  fun getStorageProxy() = handles.output.getProxy()
}

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
class WriteOnlyStackTest {

  @get:Rule
  val log = AndroidLogRule()

  @get:Rule
  val env = IntegrationEnvironment(
    ::Reader.toRegistration(),
    ::Writer.toRegistration()
  )
  private val fixtureEntities = FixtureEntities()

  @Test
  fun writeOnlyStack_singleEntityRoundtrip() = runBlocking<Unit> {
    val writeArc = env.startArc(WriteRecipePlan)
    val writer: Writer = env.getParticle(writeArc)
    val entity = fixtureEntities.generate().toWriterEntity()
    writer.write(entity)
    // Check that a write-only stack was instantiated.
    assertThat(writer.getStorageProxy()).isInstanceOf(WriteOnlyStorageProxyImpl::class.java)
    env.waitForIdle(writeArc)

    val readArc = env.startArc(ReadRecipePlan)
    val reader: Reader = env.getParticle(readArc)
    assertThat(reader.read()).containsExactly(entity.toReaderEntity())
  }

  @Test
  fun writeOnlyStack_sequenceOfOperations() = runBlocking<Unit> {
    val writeArc = env.startArc(WriteRecipePlan)
    val writer: Writer = env.getParticle(writeArc)
    // Check that a write-only stack was instantiated.
    assertThat(writer.getStorageProxy()).isInstanceOf(WriteOnlyStorageProxyImpl::class.java)

    val entity1 = fixtureEntities.generate().toWriterEntity()
    val entity2 = fixtureEntities.generate().toWriterEntity()
    val entity3 = fixtureEntities.generate().toWriterEntity()
    writer.write(entity1)
    writer.remove(entity1)
    writer.write(entity2)
    writer.clear()
    writer.write(entity3)
    env.waitForIdle(writeArc)

    val readArc = env.startArc(ReadRecipePlan)
    val reader: Reader = env.getParticle(readArc)
    assertThat(reader.read()).containsExactly(entity3.toReaderEntity())
  }

  private fun FixtureEntity.toWriterEntity(): AbstractWriter.FixtureEntity {
    return AbstractWriter.FixtureEntity.deserialize(serialize())
  }
  private fun AbstractWriter.FixtureEntity.toReaderEntity(): AbstractReader.FixtureEntity {
    return AbstractReader.FixtureEntity.deserialize(serialize())
  }
}
