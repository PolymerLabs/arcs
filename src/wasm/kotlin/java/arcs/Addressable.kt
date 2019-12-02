/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs

import arcs.AddressableMap.address2Addressable
import arcs.AddressableMap.addressable2Address
import arcs.AddressableMap.nextAddress

/**
 * Any object implementing this interface can be converted into a stable identifier. This
 * could a platform specific pointer, identity hashcode, or id as long as it is guaranteed unique.
 */
interface Addressable

typealias Address = Int

internal object AddressableMap {
    internal val address2Addressable = mutableMapOf<Address, Any>()
    internal val addressable2Address = mutableMapOf<Any, Address>()
    internal var nextAddress = 1;
}

/**
 * Convert an [Addressable] object into an [Address]. Null references
 * are converted to the 0 Address.
 */
fun Addressable?.toAddress(): Address {
    // Null pointer maps to 0
    if (this == null) return 0

    val existingAddress = addressable2Address[this]
    if (existingAddress != null) return existingAddress

    val address = nextAddress++
    address2Addressable[address] = this
    addressable2Address[this] = address
    return address
}

/**
 *  Convert an Address back into a Kotlin Object reference. The
 *  zero Address is converted to null, however any other address
 *  that fails to map to an Addressable throws an exception.
 **/
@Suppress("UNCHECKED_CAST")
fun  <T : Addressable> Address.toObject(): T? =
    if (this == 0) null else address2Addressable[this] as T?

