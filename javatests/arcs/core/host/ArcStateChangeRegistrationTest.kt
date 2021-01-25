package arcs.core.host

import arcs.core.common.ArcId
import com.google.common.truth.Truth.assertThat
import kotlinx.coroutines.ExperimentalCoroutinesApi
import org.junit.Test
import org.junit.runner.RunWith
import org.junit.runners.JUnit4

@RunWith(JUnit4::class)
@OptIn(ExperimentalCoroutinesApi::class)
class ArcStateChangeRegistrationTest {

  @Test
  fun arcStateChangeRegistration_roundTrip() {
    val arcId = ArcId.newForTest("foo")
    val registration = ArcStateChangeRegistration(arcId) { }
    assertThat(registration.arcId()).isEqualTo(arcId.toString())
  }

  @Test
  fun arcStateChangeRegistration_withDifferentCallbacks_givesDifferentRegistrations() {
    val arcId = ArcId.newForTest("foo")
    val registration1 = ArcStateChangeRegistration(arcId) { }
    val registration2 = ArcStateChangeRegistration(arcId) { }

    assertThat(registration1).isNotEqualTo(registration2)
    assertThat(registration1.arcId()).isEqualTo(arcId.toString())
    assertThat(registration2.arcId()).isEqualTo(arcId.toString())
  }

  @Test
  fun arcStateChangeRegistration_withSameCallbacks_givesSameRegistrations() {
    val arcId = ArcId.newForTest("foo")
    val callback = { }
    val registration1 = ArcStateChangeRegistration(arcId, callback)
    val registration2 = ArcStateChangeRegistration(arcId, callback)

    assertThat(registration1).isEqualTo(registration2)
    assertThat(registration1.arcId()).isEqualTo(arcId.toString())
    assertThat(registration2.arcId()).isEqualTo(arcId.toString())
  }
}
