package arcs.android.crdt

import android.os.Parcel

/**
 * Returns the result of writing data into a Parcel using write, then reading back out
 * using read.
 */
fun <T, U> roundTripThroughParcel(
  data: T,
  write: Parcel.(T) -> Unit,
  read: Parcel.() -> U
): U {
  val marshalled = with(Parcel.obtain()) {
    write(data)
    marshall()
  }

  val unmarshalled = with(Parcel.obtain()) {
    unmarshall(marshalled, 0, marshalled.size)
    setDataPosition(0)
    read()
  }

  return unmarshalled
}
