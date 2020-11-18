package arcs.android.host

import arcs.core.host.ReadPerson
import arcs.core.host.toRegistration
import kotlinx.coroutines.ExperimentalCoroutinesApi

@OptIn(ExperimentalCoroutinesApi::class)
class TestReadingExternalHostService : TestExternalArcHostService() {
  override val arcHost = object : TestingAndroidHost(
    this@TestReadingExternalHostService,
    scope,
    ::ReadPerson.toRegistration()
  ) {}
}
