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
 * Provides a platform-independent version of [ArcsDuration]
 * from java.time.Duration.
 */
class ArcsDuration private constructor(
  val platformDuration: PlatformDuration
) : Comparable<ArcsDuration> {
  @Suppress("NewApi") // See b/167491554
  constructor(millis: Long) : this(PlatformDuration.ofMillis(millis))

  @Suppress("NewApi") // See b/167491554
  fun toMillis(): Long = platformDuration.toMillis()

  @Suppress("NewApi") // See b/167491554
  override operator fun compareTo(other: ArcsDuration): Int =
    platformDuration.compareTo(other.platformDuration)

  @Suppress("NewApi") // See b/167491554
  override fun toString(): String = platformDuration.toString()

  @Suppress("NewApi") // See b/167491554
  override fun equals(other: Any?): Boolean {
    if (other == null || other !is ArcsDuration) return false
    return platformDuration.equals(other.platformDuration)
  }

  fun toPlatform() = platformDuration

  companion object {
    fun valueOf(long: Long): ArcsDuration = ArcsDuration(long)

    @Suppress("NewApi") // See b/167491554
    fun ofDays(days: Long): ArcsDuration = ArcsDuration(PlatformDuration.ofDays(days))

    @Suppress("NewApi") // See b/167491554
    fun ofHours(days: Long): ArcsDuration = ArcsDuration(PlatformDuration.ofHours(days))

    @Suppress("NewApi") // See b/167491554
    fun ofMillis(millis: Long): ArcsDuration = ArcsDuration(PlatformDuration.ofMillis(millis))
  }
}
