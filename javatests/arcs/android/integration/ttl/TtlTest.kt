package arcs.android.integration.ttl

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.integration.IntegrationEnvironment
import arcs.core.allocator.Arc
import arcs.core.host.toRegistration
import arcs.core.util.testutil.LogRule
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.delay
import kotlinx.coroutines.runBlocking
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config
import kotlin.time.minutes

@OptIn(ExperimentalCoroutinesApi::class, kotlin.time.ExperimentalTime::class)
@RunWith(AndroidJUnit4::class)
@Config(instrumentedPackages = ["arcs.jvm.util"]) // TODO: inject Time into DatabaseImpl
class TtlTest {

  @get:Rule
  val log = LogRule()

  @get:Rule
  val env = IntegrationEnvironment(
    ::Reader.toRegistration(),
    ::Writer.toRegistration()
  )

  // TODO(b/172498981) workaround. This currently doesn't actually guarantee WriteBack, but adds
  // a delay that makes the test work, it could be flaky
  private suspend fun Arc.waitForWritebackAndStop() {
    env.waitForIdle(this)
    this.stop()
    delay(1000)
  }

  @Test
  fun freshlyStartArc_hasNoDBEntities() = runBlocking {
    env.startArc(ReadWriteRecipePlan)
    assertThat(env.getEntitiesCount()).isEqualTo(0)
  }

  @Test
  fun writingOneItem_createsOneDBEntity() = runBlocking {
    val arc = env.startArc(ReadWriteRecipePlan)
    val writer = env.getParticle<Writer>(arc)

    writer.write("foo")

    val reader = env.getParticle<Reader>(arc)
    assertThat(reader.read()).isEqualTo("foo")

    arc.waitForWritebackAndStop()
    assertThat(env.getEntitiesCount()).isEqualTo(1)
  }

  @Test
  fun advancingTimePastTTL_removesEntitiesFromProxies_butNotDB() = runBlocking {
    val arc = env.startArc(ReadWriteRecipePlan)
    val writer = env.getParticle<Writer>(arc)
    writer.write("foo")

    env.advanceClock(10.minutes)

    val reader = env.getParticle<Reader>(arc)
    assertThat(reader.read()).isEqualTo("")

    arc.waitForWritebackAndStop()
    assertThat(env.getEntitiesCount()).isEqualTo(1)
  }

  @Test
  fun advancing49Hours_removesWrittenEntities() = runBlocking {
    var arc = env.startArc(ReadWriteRecipePlan)
    val writer = env.getParticle<Writer>(arc)
    writer.write("foo")
    env.advanceClock(10.minutes)
    arc.waitForWritebackAndStop()

    // verify that the number of entities is 1 before we test if it is removed
    assertThat(env.getEntitiesCount()).isEqualTo(1)
    env.triggerCleanupWork()

    // This creates a fresh EntityHandleManager/StorageProxy, and so it doesn't read from a cache
    // but loads direct from the database. Just a double check the entity doesn't show, although
    // it is still being filtered, it does test if the DB hasn't been corrupted.
    arc = env.startArc(ReadWriteRecipePlan)
    val reader2 = env.getParticle<Reader>(arc)
    assertThat(reader2.read()).isEqualTo("")
    assertThat(env.getEntitiesCount()).isEqualTo(0)
  }
}
