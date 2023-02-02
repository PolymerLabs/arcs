package arcs.android.crdt

import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.core.data.FieldType
import arcs.core.data.testutil.PrimitiveFieldTypeGenerator
import arcs.core.data.testutil.ReferencablePrimitiveFromPrimitiveType
import arcs.core.testutil.freeEntityGenerator
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

  @Test
  fun referencablePrimitives_preservedDuring_parcelRoundTrip() = runFuzzTest {
    val type = PrimitiveFieldTypeGenerator(it)().fieldType as FieldType.Primitive
    val primitive = ReferencablePrimitiveFromPrimitiveType(it)(type.primitiveType)
    invariant_ReferencablePrimitives_preservedDuring_parcelRoundTrip(primitive)
  }
}
