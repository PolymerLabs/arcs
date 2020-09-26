package arcs.android.host

import arcs.core.host.WritePerson
import arcs.core.host.toRegistration
import kotlinx.coroutines.ExperimentalCoroutinesApi

@ExperimentalCoroutinesApi
class TestWritingExternalHostService : TestExternalArcHostService() {
  override val arcHost = object : TestingAndroidHost(
    this@TestWritingExternalHostService,
    schedulerProvider,
    ::WritePerson.toRegistration()
  ) {}
}
