/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.android.host.parcelables

import android.os.Parcel
import android.os.Parcelable
import arcs.android.type.readType
import arcs.android.type.writeType
import arcs.core.data.HandleMode
import arcs.core.data.Plan
import arcs.core.data.expression.deserializeExpression
import arcs.core.data.expression.serialize

/** [Parcelable] variant of [Plan.HandleConnection]. */
data class ParcelableHandleConnection(
  override val actual: Plan.HandleConnection
) : ActualParcelable<Plan.HandleConnection> {
  override fun writeToParcel(parcel: Parcel, flags: Int) {
    // TODO(b/161819104): Avoid duplicate serialization, Handles are serialized as part of the
    // Plan object.
    parcel.writeHandle(actual.handle, flags)
    parcel.writeType(actual.type, flags)
    parcel.writeInt(actual.mode.ordinal)
    parcel.writeString(actual.expression?.serialize() ?: "")
  }

  override fun describeContents(): Int = 0

  companion object CREATOR : Parcelable.Creator<ParcelableHandleConnection> {
    override fun createFromParcel(parcel: Parcel): ParcelableHandleConnection {
      // TODO(b/161819104): Use Handle from Plan, instead of creating a new Handle object.
      val handle = requireNotNull(parcel.readHandle()) {
        "No Handle found in Parcel"
      }
      val type = requireNotNull(parcel.readType()) {
        "No type found in Parcel"
      }

      val handleModeOrdinal = requireNotNull(parcel.readInt()) {
        "No handleMode found in Parcel"
      }

      val handleMode = requireNotNull(HandleMode.values().getOrNull(handleModeOrdinal)) {
        "HandleMode ordinal unknown value $handleModeOrdinal"
      }

      val expression = parcel.readString()?.ifEmpty { null }

      return ParcelableHandleConnection(
        Plan.HandleConnection(
          handle,
          handleMode,
          type,
          emptyList(),
          expression?.deserializeExpression()
        )
      )
    }

    override fun newArray(size: Int): Array<ParcelableHandleConnection?> =
      arrayOfNulls(size)
  }
}

/** Wraps a [Plan.HandleConnection] as a [ParcelableHandleConnection]. */
fun Plan.HandleConnection.toParcelable(): ParcelableHandleConnection =
  ParcelableHandleConnection(this)

/** Writes a [Plan.HandleConnection] to a [Parcel]. */
fun Parcel.writeHandleConnectionSpec(handleConnection: Plan.HandleConnection, flags: Int) =
  writeTypedObject(handleConnection.toParcelable(), flags)

/** Reads a [Plan.HandleConnection] from a [Parcel]. */
fun Parcel.readHandleConnectionSpec(): Plan.HandleConnection? =
  readTypedObject(ParcelableHandleConnection)?.actual
