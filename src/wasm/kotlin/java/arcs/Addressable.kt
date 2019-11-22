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
    internal val address2Addressable = mutableMapOf<Address, Addressable>()
    internal val addressable2Address = mutableMapOf<Addressable, Address>()
    internal var nextAddress = 1;
}

/**
 * Convert an [Addressable] object into an [Address]. Null references
 * are converted to the 0 Address.
 */
fun Addressable?.toAddress(): Address {
    // Null pointer maps to 0
    if (this == null) return 0

    return addressable2Address[this]?.let { it } ?: {
        val address = nextAddress++
        address2Addressable[address] = this
        addressable2Address[this] = address
        address
    }()
}

/**
 *  Convert an Address back into a Kotlin Object reference. The
 *  zero Address is converted to null, however any other address
 *  that fails to map to an Adressable throws an exception.
 **/
fun <T : Addressable> Address.toObject(): T? {
    if (this == 0) {
        return null
    }

    return address2Addressable[this] as T
}

