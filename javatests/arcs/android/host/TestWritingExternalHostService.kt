package arcs.android.host

import arcs.core.host.WritePerson
import arcs.core.host.WritePerson2
import arcs.core.host.toRegistration
import kotlinx.coroutines.ExperimentalCoroutinesApi

@OptIn(ExperimentalCoroutinesApi::class)
class TestWritingExternalHostService : TestExternalArcHostService() {
  override val arcHost = object : TestingAndroidHost(
    this@TestWritingExternalHostService,
    scope,
    schedulerProvider,
    ::WritePerson.toRegistration(),
    ::WritePerson2.toRegistration()
  ) {}
}
