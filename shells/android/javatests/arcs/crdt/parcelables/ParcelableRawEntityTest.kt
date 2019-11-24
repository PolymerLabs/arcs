package arcs.crdt.parcelables

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.data.RawEntity
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ParcelableRawEntityTest {
    @Test
    fun parcelableRoundTrip_works() {
        val entity = RawEntity(
            id = "reference-id",
            singletonFields = setOf("a"),
            collectionFields = setOf("b", "c")
        )

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(ParcelableRawEntity(entity), 0)
            marshall()
        }
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readTypedObject(ParcelableReferencable.Companion.CREATOR)
        }

        assertThat(unmarshalled?.actual).isEqualTo(entity)
    }
}