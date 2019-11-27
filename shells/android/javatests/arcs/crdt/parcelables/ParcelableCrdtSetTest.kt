package arcs.crdt.parcelables

import android.os.Parcel
import androidx.test.ext.junit.runners.AndroidJUnit4
import arcs.common.Referencable
import arcs.crdt.CrdtSet
import arcs.crdt.internal.VersionMap
import arcs.data.RawEntity
import com.google.common.truth.Truth.assertThat
import org.junit.Test
import org.junit.runner.RunWith

@RunWith(AndroidJUnit4::class)
class ParcelableCrdtSetTest {
    private val versionMap: VersionMap = VersionMap("alice" to 1, "bob" to 2)
    private val entity1: Referencable = RawEntity("ref-id-1", setOf("a"), setOf())
    private val entity2: Referencable = RawEntity("ref-id-2", setOf(), setOf("b"))

    @Test
    fun dataValue_parcelableRoundTrip_works() {
        val dataValue = CrdtSet.DataValue(versionMap, entity1)

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(ParcelableCrdtSet.DataValue(dataValue), 0)
            marshall()
        }
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readTypedObject(requireNotNull(ParcelableCrdtSet.DataValue.CREATOR))
        }

        assertThat(unmarshalled?.actual).isEqualTo(dataValue)
    }

    @Test
    fun data_parcelableRoundTrip_works() {
        val data = CrdtSet.DataImpl(versionMap, mutableMapOf(
            entity1.id to CrdtSet.DataValue(VersionMap("alice" to 1), entity1),
            entity2.id to CrdtSet.DataValue(VersionMap("alice" to 1), entity2)
        ))

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(ParcelableCrdtSet.Data(data), 0)
            marshall()
        }
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readTypedObject(requireNotNull(ParcelableCrdtType.Set.crdtDataCreator))
        }

        assertThat(unmarshalled?.actual).isEqualTo(data)
    }

    @Test
    fun operationAdd_parcelableRoundTrip_works() {
        val op = CrdtSet.Operation.Add(versionMap, "alice", entity1)

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(op.toParcelable(), 0)
            marshall()
        }
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readTypedObject(requireNotNull(ParcelableCrdtType.Set.crdtOperationCreator))
        }

        assertThat(unmarshalled?.actual).isEqualTo(op)
    }

    @Test
    fun operationRemove_parcelableRoundTrip_works() {
        val op = CrdtSet.Operation.Remove(versionMap, "alice", entity1)

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(op.toParcelable(), 0)
            marshall()
        }
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readTypedObject(requireNotNull(ParcelableCrdtType.Set.crdtOperationCreator))
        }

        assertThat(unmarshalled?.actual).isEqualTo(op)
    }

    @Test
    fun operationFastForward_parcelableRoundTrip_works() {
        val oldClock = VersionMap("alice" to 1)
        val newClock = VersionMap("alice" to 1, "bob" to 1)
        val op = CrdtSet.Operation.FastForward(
            oldClock,
            newClock,
            added = mutableListOf(CrdtSet.DataValue(newClock, entity1)),
            removed = mutableListOf(entity2)
        )

        val marshalled = with(Parcel.obtain()) {
            writeTypedObject(op.toParcelable(), 0)
            marshall()
        }
        val unmarshalled = with(Parcel.obtain()) {
            unmarshall(marshalled, 0, marshalled.size)
            readTypedObject(requireNotNull(ParcelableCrdtType.Set.crdtOperationCreator))
        }

        assertThat(unmarshalled?.actual).isEqualTo(op)
    }
}
