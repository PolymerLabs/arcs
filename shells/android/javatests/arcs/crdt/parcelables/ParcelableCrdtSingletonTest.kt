package arcs.crdt.parcelables

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.common.Referencable
import arcs.crdt.CrdtSet
import arcs.crdt.CrdtSingleton
import arcs.crdt.internal.VersionMap
import arcs.data.RawEntity
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ParcelableCrdtSingletonTest {
    private val versionMap: VersionMap = VersionMap("alice" to 1, "bob" to 2)
    private val entity1: Referencable = RawEntity("ref-id-1", setOf("a"), setOf())
    private val entity2: Referencable = RawEntity("ref-id-2", setOf(), setOf("b"))

    @Test
    fun data_parcelableRoundTrip_works() {
        val data = CrdtSingleton.DataImpl(versionMap, mutableMapOf(
            entity1.id to CrdtSet.DataValue(VersionMap("alice" to 1), entity1),
            entity2.id to CrdtSet.DataValue(VersionMap("alice" to 1), entity2)
        ))

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(data.toParcelable(), 0)
            marshall()
        }
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readTypedObject(requireNotNull(ParcelableCrdtType.Singleton.crdtDataCreator))
        }

        assertThat(unmarshalled?.actual).isEqualTo(data)
    }

    @Test
    fun operationUpdate_parcelableRoundTrip_works() {
        val op = CrdtSingleton.Operation.Update("alice", versionMap, entity1)

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(op.toParcelable(), 0)
            marshall()
        }
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readTypedObject(requireNotNull(ParcelableCrdtType.Singleton.crdtOperationCreator))
        }

        assertThat(unmarshalled?.actual).isEqualTo(op)
    }

    @Test
    fun operationClear_parcelableRoundTrip_works() {
        val op = CrdtSingleton.Operation.Clear<Referencable>("alice", versionMap)

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(op.toParcelable(), 0)
            marshall()
        }
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readTypedObject(requireNotNull(ParcelableCrdtType.Singleton.crdtOperationCreator))
        }

        assertThat(unmarshalled?.actual).isEqualTo(op)
    }
}