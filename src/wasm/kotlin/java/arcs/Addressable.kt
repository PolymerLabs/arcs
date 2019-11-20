package arcs

/**
 * Any object implementing this interface can be converted into a stable identifier. This
 * could a platform specific pointer, identity hashcode, or id as long as it is guaranteed unique.
 */
interface Addressable

typealias Address = Int

internal val address2Addressable = kotlin.collections.mutableMapOf<Address, Addressable>()
internal val addressable2Address = kotlin.collections.mutableMapOf<Addressable, Address>()

internal var nextAddress = 1;

fun Addressable.toAddress(): Address {
    if (addressable2Address[this] != null) {
        return addressable2Address[this]!!
    }
    val address =  nextAddress++
    address2Addressable[address] = this
    addressable2Address[this] = address
    return address
}

// Convert an Address back into a Kotlin Object reference
fun <T : Addressable> Address.toObject(): T? {
    return address2Addressable[this] as T ?: null
}

