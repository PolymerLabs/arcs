package arcs.android.integration.actor

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.android.integration.IntegrationEnvironment
import arcs.core.allocator.Arc
import arcs.core.host.toRegistration
import arcs.flags.BuildFlags
import arcs.flags.testing.BuildFlagsRule
import com.google.common.truth.Truth.assertThat
import kotlin.test.assertFailsWith
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.runBlocking
import kotlinx.coroutines.withContext
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.annotation.Config

class Writer : AbstractWriter() {
  suspend fun write(foo: Foo) {
    withContext(handles.output.dispatcher) {
      handles.output.store(foo)
    }.join()
  }
}

@OptIn(ExperimentalCoroutinesApi::class)
@RunWith(AndroidJUnit4::class)
// Tells Robolectric to intercept the calls to JvmTime.
@Config(instrumentedPackages = ["arcs.jvm.util"])
class ActorTest {

  @get:Rule
  val buildFlagsRule = BuildFlagsRule.create()

  @get:Rule
  val env = IntegrationEnvironment(::Writer.toRegistration())

  private lateinit var writer: Writer
  private lateinit var arc: Arc

  @Before
  fun setUp() = runBlocking {
    BuildFlags.STORAGE_STRING_REDUCTION = true
    arc = env.startArc(ReadWriteRecipePlan)
    writer = env.getParticle(arc)
  }

  @Test
  fun actorAnnotation_setsHandleName() = runBlocking {
    writer.write(AbstractWriter.Foo(5))
    assertThat(writer.handles.getHandle("output").name).isEqualTo("a")
  }

  @Test
  fun actorAnnotation_withColon_fails() = runBlocking {
    val e = assertFailsWith<IllegalArgumentException> {
      val colonPlan = env.startArc(ReadWriteRecipeColonPlan)
    }
    assertThat(e)
      .hasMessageThat()
      .isEqualTo("Actor annotation b: contains illegal character ':' or ';'.")
  }

  @Test
  fun actorAnnotation_withSemicolon_fails() = runBlocking {
    val e = assertFailsWith<IllegalArgumentException> {
      env.startArc(ReadWriteRecipeSemicolonPlan)
    }
    assertThat(e)
      .hasMessageThat()
      .isEqualTo("Actor annotation c; contains illegal character ':' or ';'.")
  }
}
