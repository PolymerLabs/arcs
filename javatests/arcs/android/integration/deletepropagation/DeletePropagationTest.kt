package arcs.android.integration.deletepropagation

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.integration.IntegrationEnvironment
import arcs.core.allocator.Arc
import arcs.core.entity.ForeignReferenceChecker
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.Reference
import arcs.core.host.toRegistration
import arcs.core.storage.testutil.waitForEntity
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

class Reader : AbstractReader() {
  suspend fun read() = withContext(handles.input.dispatcher) {
    handles.input.fetchAll()
  }
}
class Writer : AbstractWriter() {
  suspend fun write(entity: Entity) {
    withContext(handles.output.dispatcher) {
      handles.output.store(entity)
    }.join()
  }

  suspend fun createForeignReference(id: String): Reference<Foreign> {
    return checkNotNull(handles.createForeignReference(Foreign, id))
  }

  suspend fun createFooReference(foo: Foo) = withContext(handles.foos.dispatcher) {
    handles.foos.store(foo)
    handles.foos.createReference(foo)
  }
}

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
// Tells Robolectric to intercept the calls to JvmTime.
@Config(instrumentedPackages = ["arcs.jvm.util"])
class DeletePropagationTest {

  @get:Rule
  val env = IntegrationEnvironment(
    ::Reader.toRegistration(),
    ::Writer.toRegistration(),
    foreignReferenceChecker = FOREIGN_REFERENCE_CHECKER
  )

  private lateinit var writer: Writer
  private lateinit var reader: Reader
  private lateinit var arc: Arc

  @Before
  fun setUp() = runBlocking {
    arc = env.startArc(ReadWriteRecipePlan)
    writer = env.getParticle(arc)
    reader = env.getParticle(arc)
  }

  @Test
  fun hardReference_writtenHardReference_isReadBackAsSameHardReference() = runBlocking {
    val foo = Writer_Foos(5)
    val reference = writer.createFooReference(foo)
    val entity1 = Writer_Output(hard = reference)

    writer.write(entity1)
    waitForEntity(writer.handles.foos, foo)
    env.waitForIdle(arc)
    val entityOut = reader.read().single()

    assertThat(entity1.hard!!.isHardReference).isTrue()
    assertThat(entityOut.hard!!.isHardReference).isTrue()
    assertThat(entityOut.hard!!.dereference()).isEqualTo(foo)
  }

  @Test
  fun foreignReference_writtenForeignReference_isReadBackAsSameForeignReference() = runBlocking {
    val reference = writer.createForeignReference(ID1)
    val entity1 = Writer_Output(foreign = reference)

    writer.write(entity1)
    val entityOut = reader.read().single()
    val referenceOut = entityOut.foreign!!

    assertThat(reference.dereference()).isNotNull()
    assertThat(referenceOut.entityId).isEqualTo(ID1)
    assertThat(referenceOut.dereference()).isNotNull()
  }

  @Test
  fun hardForeignReference_delete_removesEntity() = runBlocking {
    val entity1 = Writer_Output(hardForeign = writer.createForeignReference(ID1))
    val entity2 = Writer_Output(hardForeign = writer.createForeignReference(ID2))
    writer.write(entity1)
    writer.write(entity2)
    waitForEntity(writer.handles.output, entity1)
    waitForEntity(writer.handles.output, entity2)

    env.triggerHardReferenceDelete(AbstractWriter.Foreign.SCHEMA, ID1)
    env.triggerCleanupWork()

    assertThat(reader.read()).containsExactly(entity2.toReaderEntity())
    assertThat(env.getEntitiesCount()).isEqualTo(ENTITIES_PER_ITEM)
  }

  @Test
  fun hardForeignReference_reconcile_removesEntity() = runBlocking {
    val entity1 = Writer_Output(hardForeign = writer.createForeignReference(ID1))
    val entity2 = Writer_Output(hardForeign = writer.createForeignReference(ID2))
    writer.write(entity1)
    writer.write(entity2)
    waitForEntity(writer.handles.output, entity1)
    waitForEntity(writer.handles.output, entity2)

    env.reconcileHardReference(AbstractWriter.Foreign.SCHEMA, setOf(ID2))
    env.triggerCleanupWork()

    assertThat(reader.read()).containsExactly(entity2.toReaderEntity())
    assertThat(env.getEntitiesCount()).isEqualTo(ENTITIES_PER_ITEM)
  }

  @Test
  fun hardForeignReference_inInlineEntity_parentIsRemovedByDelete() = runBlocking {
    val entity = Writer_Output(
      inner_ = Writer_Output_Inner(ref = writer.createForeignReference(ID1))
    )
    writer.write(entity)
    waitForEntity(writer.handles.output, entity)

    env.triggerHardReferenceDelete(AbstractWriter.Foreign.SCHEMA, ID1)
    env.triggerCleanupWork()

    assertThat(reader.read()).isEmpty()
    assertThat(env.getEntitiesCount()).isEqualTo(0)
  }

  @Test
  fun hardForeignReference_inNestedInlineEntity_parentIsRemovedByDelete() = runBlocking {
    val entity = Writer_Output(
      nested = Writer_Output_Nested(
        inner_ = Writer_Output_Inner(ref = writer.createForeignReference(ID1))
      )
    )
    writer.write(entity)
    waitForEntity(writer.handles.output, entity)

    env.triggerHardReferenceDelete(AbstractWriter.Foreign.SCHEMA, ID1)
    env.triggerCleanupWork()

    assertThat(reader.read()).isEmpty()
    assertThat(env.getEntitiesCount()).isEqualTo(0)
  }

  @Test
  fun hardForeignReference_inInlineCollection_parentIsRemovedByDelete() = runBlocking {
    val entity = Writer_Output(
      inners = setOf(Writer_Output_Inner(ref = writer.createForeignReference(ID1)))
    )
    writer.write(entity)
    waitForEntity(writer.handles.output, entity)

    env.triggerHardReferenceDelete(AbstractWriter.Foreign.SCHEMA, ID1)
    env.triggerCleanupWork()

    assertThat(reader.read()).isEmpty()
    assertThat(env.getEntitiesCount()).isEqualTo(0)
  }

  @Test
  fun hardForeignReference_inReferenceCollection_parentIsRemovedByDelete() = runBlocking {
    val entity = Writer_Output(refs = setOf(writer.createForeignReference(ID1)))
    writer.write(entity)
    waitForEntity(writer.handles.output, entity)

    env.triggerHardReferenceDelete(AbstractWriter.Foreign.SCHEMA, ID1)
    env.triggerCleanupWork()

    assertThat(reader.read()).isEmpty()
    assertThat(env.getEntitiesCount()).isEqualTo(0)
  }

  @Test
  fun hardForeignReference_inListOfInlines_parentIsRemovedByDelete() = runBlocking {
    val entity = Writer_Output(
      list = listOf(Writer_Output_Inner(ref = writer.createForeignReference(ID1)))
    )
    writer.write(entity)
    waitForEntity(writer.handles.output, entity)

    env.triggerHardReferenceDelete(AbstractWriter.Foreign.SCHEMA, ID1)
    env.triggerCleanupWork()

    assertThat(reader.read()).isEmpty()
    assertThat(env.getEntitiesCount()).isEqualTo(0)
  }

  @Test
  fun hardForeignReference_inListOfReferences_parentIsRemovedByDelete() = runBlocking {
    val entity = Writer_Output(reflist = listOf(writer.createForeignReference(ID1)))
    writer.write(entity)
    waitForEntity(writer.handles.output, entity)

    env.triggerHardReferenceDelete(AbstractWriter.Foreign.SCHEMA, ID1)
    env.triggerCleanupWork()

    assertThat(reader.read()).isEmpty()
    assertThat(env.getEntitiesCount()).isEqualTo(0)
  }

  private fun Writer_Output.toReaderEntity(): Reader_Input {
    return Reader_Input.deserialize(serialize())
  }

  companion object {
    // One top level entity + 3 inlines.
    private const val ENTITIES_PER_ITEM = 4

    private const val ID1 = "id1"
    private const val ID2 = "id2"
    private val FOREIGN_REFERENCE_CHECKER: ForeignReferenceChecker =
      ForeignReferenceCheckerImpl(
        mapOf(
          AbstractWriter.Foreign.SCHEMA to {
            it == ID1 || it == ID2
          }
        )
      )
  }
}
