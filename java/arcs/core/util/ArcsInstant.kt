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
 * Provides a platform-independent version of [ArcsInstant]
 * from java.time.Instant.
 */
class ArcsInstant private constructor(
  val platformInstant: PlatformInstant
) : Number(), Comparable<ArcsInstant> {
  @Suppress("NewApi") // See b/167491554
  fun toEpochMilli(): Long = platformInstant.toEpochMilli()

  @Suppress("NewApi") // See b/167491554
  override operator fun compareTo(other: ArcsInstant): Int =
    platformInstant.compareTo(other.platformInstant)

  @Suppress("NewApi") // See b/167491554
  override fun toString(): String = platformInstant.toString()

  @Suppress("NewApi") // See b/167491554
  override fun equals(other: Any?): Boolean {
    if (other == null || other !is ArcsInstant) return false
    return platformInstant == other.platformInstant
  }

  override fun hashCode(): Int {
    return platformInstant.hashCode()
  }

  @Suppress("NewApi") // See b/167491554
  fun plus(time: ArcsDuration): ArcsInstant =
    ArcsInstant(platformInstant.plus(time.toPlatform()))

  @Suppress("NewApi") // See b/167491554
  fun minus(time: ArcsDuration): ArcsInstant =
    ArcsInstant(platformInstant.minus(time.toPlatform()))

  fun toPlatform() = platformInstant

  companion object {
    @Suppress("NewApi") // See b/167491554
    fun ofEpochMilli(millis: Long): ArcsInstant =
      ArcsInstant(PlatformInstant.ofEpochMilli(millis))

    @Suppress("NewApi") // See b/167491554
    fun now(): ArcsInstant = ArcsInstant(PlatformInstant.now())
  }

  @Suppress("NewApi") // See b/167491554
  override fun toByte(): Byte = platformInstant.toEpochMilli().toByte()

  @Suppress("NewApi") // See b/167491554
  override fun toChar(): Char = platformInstant.toEpochMilli().toChar()

  @Suppress("NewApi") // See b/167491554
  override fun toDouble(): Double = platformInstant.toEpochMilli().toDouble()

  @Suppress("NewApi") // See b/167491554
  override fun toFloat(): Float = platformInstant.toEpochMilli().toFloat()

  @Suppress("NewApi") // See b/167491554
  override fun toInt(): Int = platformInstant.toEpochMilli().toInt()

  @Suppress("NewApi") // See b/167491554
  override fun toLong(): Long = platformInstant.toEpochMilli().toLong()

  @Suppress("NewApi") // See b/167491554
  override fun toShort(): Short = platformInstant.toEpochMilli().toShort()
}
