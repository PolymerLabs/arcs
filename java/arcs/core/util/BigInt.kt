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

package arcs.core.util

/**
 * Provides a platform-independent version of [BigInt]
 * based on java.math.BigInteger.
 */
class BigInt private constructor(
  val platformBigInt: PlatformBigInt
) : Number(), Comparable<BigInt> {
  @Suppress("NewApi") // See b/167491554
  constructor(bigint: String) : this(PlatformBigInt(bigint))

  @Suppress("NewApi") // See b/167491554
  fun add(other: BigInt): BigInt =
    BigInt(platformBigInt.add(other.platformBigInt))

  @Suppress("NewApi") // See b/167491554
  fun multiply(other: BigInt): BigInt =
    BigInt(platformBigInt.multiply(other.platformBigInt))

  @Suppress("NewApi") // See b/167491554
  fun subtract(other: BigInt): BigInt =
    BigInt(platformBigInt.subtract(other.platformBigInt))

  @Suppress("NewApi") // See b/167491554
  fun divide(other: BigInt): BigInt =
    BigInt(platformBigInt.divide(other.platformBigInt))

  @Suppress("NewApi") // See b/167491554
  override fun compareTo(other: BigInt): Int =
    platformBigInt.compareTo(other.platformBigInt)

  @Suppress("NewApi") // See b/167491554
  override fun toString(): String = platformBigInt.toString()

  @Suppress("NewApi") // See b/167491554
  override fun equals(other: Any?): Boolean {
    if (other == null || other !is BigInt) return false
    return platformBigInt.equals(other.platformBigInt)
  }

  override fun hashCode(): Int {
    return platformBigInt.hashCode()
  }

  companion object {
    fun valueOf(long: Long): BigInt = BigInt(long.toString())
    fun valueOf(str: String): BigInt = BigInt(str)
    fun fromString(str: String): BigInt = BigInt(str)

    val ZERO = BigInt("0")
    val ONE = BigInt("1")
    val TEN = BigInt("10")
  }

  @Suppress("NewApi") // See b/167491554
  override fun toByte(): Byte = platformBigInt.toByte()

  @Suppress("NewApi") // See b/167491554
  override fun toChar(): Char = platformBigInt.toInt().toChar()

  @Suppress("NewApi") // See b/167491554
  override fun toDouble(): Double = platformBigInt.toDouble()

  @Suppress("NewApi") // See b/167491554
  override fun toFloat(): Float = platformBigInt.toFloat()

  @Suppress("NewApi") // See b/167491554
  override fun toInt(): Int = platformBigInt.toInt()

  @Suppress("NewApi") // See b/167491554
  override fun toLong(): Long = platformBigInt.toLong()

  @Suppress("NewApi") // See b/167491554
  override fun toShort(): Short = platformBigInt.toShort()
}

fun String.toBigInt(): BigInt = BigInt(this)

fun Number.toBigInt(): BigInt = when (this) {
  is BigInt -> this
  else -> BigInt.valueOf(this.toLong())
}
