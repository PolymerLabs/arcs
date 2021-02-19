package arcs.android.crdt

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.crdt.testutil.freeEntityGenerator
import arcs.core.testutil.runFuzzTest
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class CrdtParcelablesFuzzTest {
  @Test
  fun crdtData_preservedDuring_parcelRoundTrip() = runFuzzTest {
    val crdtEntity = freeEntityGenerator(it)
    invariant_CrdtData_preservedDuring_parcelRoundTrip(crdtEntity().data)
  }
}
