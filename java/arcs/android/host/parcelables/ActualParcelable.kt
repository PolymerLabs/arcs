package arcs.android.host.parcelables

import android.os.Parcelable

/**
 * A [Parcelable] that has a field holding the decoded value.
 *
 * @property actual the value this Parcelable encodes.
 */
interface ActualParcelable<T> : Parcelable {
    val actual: T
}
