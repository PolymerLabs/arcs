package arcs.android.integration.ttl

import arcs.android.integration.IntegrationEnvironment
import arcs.android.util.testutil.AndroidLogRule
import arcs.core.allocator.Arc
import arcs.core.data.EntityType
import arcs.core.entity.testutil.FixtureEntities
import arcs.core.entity.testutil.FixtureEntity
import arcs.core.host.toRegistration
import arcs.core.storage.testutil.waitForEntity
import arcs.sdk.android.storage.service.StorageService.StorageServiceConfig
import com.google.common.truth.Truth.assertThat
import kotlin.time.days
import kotlin.time.minutes
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.ParameterizedRobolectricTestRunner
import org.robolectric.ParameterizedRobolectricTestRunner.Parameters
import org.robolectric.annotation.Config

@OptIn(ExperimentalCoroutinesApi::class, kotlin.time.ExperimentalTime::class)
@RunWith(ParameterizedRobolectricTestRunner::class)
@Config(instrumentedPackages = ["arcs.jvm.util"]) // TODO: inject Time into DatabaseImpl
class TtlTest(garbageCollectionV2Enabled: Boolean) {

  @get:Rule
  val log = AndroidLogRule()

  @get:Rule
  val env = IntegrationEnvironment(
    ::Reader.toRegistration(),
    ::Writer.toRegistration(),
    periodicWorkConfig = StorageServiceConfig(
      ttlJobEnabled = true,
      garbageCollectionJobEnabled = true,
      useGarbageCollectionTaskV2 = garbageCollectionV2Enabled
    )
  )
  private val fixtureEntities = FixtureEntities()
  private lateinit var writer: Writer
  private lateinit var reader: Reader
  private lateinit var arc: Arc

  @Before
  fun setUp() = runBlocking {
    restartArc()
  }

  @Test
  fun freshlyStartArc_hasNoDBEntities() = runBlocking {
    assertDbEntities(0)
  }

  @Test
  fun writingOneItem_createsOneDBEntity() = runBlocking {
    val entity = writeNewEntityToSingleton()

    assertThat(reader.read()).isEqualTo(entity.toReaderEntity())
    assertDbEntities(1)
  }

  @Test
  fun advancingTimePastTTL_removesEntitiesFromProxies_butNotDB() = runBlocking {
    writeNewEntityToSingleton()

    env.advanceClock(10.minutes)

    assertThat(reader.read()).isNull()
    assertDbEntities(1)
  }

  @Test
  fun singleton_removesExpiredEntity() = runBlocking {
    writeNewEntityToSingleton()
    env.advanceClock(10.minutes)

    // Verify the number of entities before we test the removal.
    assertDbEntities(1)
    env.triggerCleanupWork()

    // Just a double check the entity doesn't show, although it is still being filtered, it does
    // test if the DB hasn't been corrupted.
    restartArc()
    assertThat(reader.read()).isNull()
    assertDbEntities(0)

    // Set to another entity to confirm that the singleton is still in a good state.
    val entity2 = writeNewEntityToSingleton()
    assertThat(reader.read()).isEqualTo(entity2.toReaderEntity())
  }

  @Test
  fun collection_removesExpiredEntity() = runBlocking<Unit> {
    writeNewEntityToCollection()
    env.advanceClock(6.days)
    // entity2 is not expired.
    val entity2 = writeNewEntityToCollection()

    // Verify the number of entities before we test the removal.
    assertDbEntities(2)
    env.triggerCleanupWork()

    // Just a double check the entity doesn't show, although it is still being filtered, it does
    // test if the DB hasn't been corrupted.
    restartArc()
    assertThat(reader.readCollection()).containsExactly(entity2.toReaderEntity())
    assertDbEntities(1)

    // Add another entity to confirm that the collection is still in a good state.
    val entity3 = writeNewEntityToCollection()
    assertThat(reader.readCollection()).containsExactly(
      entity2.toReaderEntity(),
      entity3.toReaderEntity()
    )
  }

  @Test
  fun sameEntityInTwoCollections_firstStoredWithTtl() = runBlocking<Unit> {
    val entity = writeNewEntityToCollection()
    writer.writeCollectionNoTtl(entity)

    env.advanceClock(6.days)
    env.triggerCleanupWork()

    assertThat(reader.readCollection()).isEmpty()
    // Entity is gone even though this handle has not TTL, because it was first stored through
    // handles.collection.
    assertThat(reader.readCollectionNoTtl()).isEmpty()
    assertDbEntities(0)
  }

  @Test
  fun sameEntityInTwoCollections_firstStoredNoTtl() = runBlocking<Unit> {
    val entity = writeNewEntityToCollectionNoTtl()
    writer.writeCollection(entity)

    env.advanceClock(6.days)
    env.triggerCleanupWork()

    // Entity is present because it was first stored through handles.collectionNoTtl.
    assertThat(reader.readCollection()).containsExactly(entity.toReaderEntity())
    assertThat(reader.readCollectionNoTtl()).containsExactly(entity.toReaderEntity())
    assertDbEntities(1)
  }

  @Test
  fun handleWithTtl_NoExpiredEntities() = runBlocking<Unit> {
    val entity1 = writeNewEntityToCollection()

    // Advance only one day so that the entity is not yet expired.
    env.advanceClock(1.days)
    env.triggerCleanupWork()

    assertThat(reader.readCollection()).containsExactly(entity1.toReaderEntity())
    assertDbEntities(1)
  }

  @Test
  fun databaseTooLarge_removesEntitiesBeforeExpiration() = runBlocking {
    // Database can only store 20 bytes, hence it will be wiped when we call triggerCleanupWork.
    env.resetDbWithMaxSize(20)
    restartArc()
    writeNewEntityToCollection()

    // We don't advance time, the entity is not expired.
    env.triggerCleanupWork()

    assertThat(reader.readCollection()).isEmpty()
    assertDbEntities(0)
  }

  // This creates a fresh EntityHandleManager/StorageProxy, and so it doesn't read from a cache
  // but loads direct from the database.
  private suspend fun restartArc() {
    arc = env.startArc(ReadWriteRecipePlan)
    writer = env.getParticle(arc)
    reader = env.getParticle(arc)
  }

  private suspend fun writeNewEntityToCollection(): AbstractWriter.FixtureEntity {
    val entity = fixtureEntities.generate().toWriterEntity()
    writer.writeCollection(entity)
    waitForEntity(writer.handles.collection, entity, FIXTURE_ENTITY_TYPE)
    return entity
  }

  private suspend fun writeNewEntityToCollectionNoTtl(): AbstractWriter.FixtureEntity {
    val entity = fixtureEntities.generate().toWriterEntity()
    writer.writeCollectionNoTtl(entity)
    waitForEntity(writer.handles.collectionNoTtl, entity, FIXTURE_ENTITY_TYPE)
    return entity
  }

  private suspend fun writeNewEntityToSingleton(): AbstractWriter.FixtureEntity {
    val entity = fixtureEntities.generate().toWriterEntity()
    writer.write(entity)
    waitForEntity(writer.handles.output, entity, FIXTURE_ENTITY_TYPE)
    return entity
  }

  private fun FixtureEntity.toWriterEntity(): AbstractWriter.FixtureEntity {
    return AbstractWriter.FixtureEntity.deserialize(serialize())
  }

  private fun AbstractWriter.FixtureEntity.toReaderEntity(): AbstractReader.FixtureEntity {
    return AbstractReader.FixtureEntity.deserialize(serialize())
  }

  private suspend fun assertDbEntities(count: Int) {
    assertThat(env.getEntitiesCount())
      .isEqualTo(count * FixtureEntities.DB_ENTITIES_PER_FIXTURE_ENTITY)
  }

  companion object {
    // Run tests with both versions of the GC task.
    @JvmStatic
    @Parameters(name = "garbageCollectionV2Enabled = {0}")
    fun parameters() = listOf(false, true)

    private val FIXTURE_ENTITY_TYPE = EntityType(AbstractWriter.FixtureEntity.SCHEMA)
  }
}
