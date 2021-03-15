/*
 * Copyright 2021 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */
package arcs.core.host

import arcs.core.analytics.Analytics
import arcs.core.entity.ForeignReferenceChecker
import arcs.core.entity.ForeignReferenceCheckerImpl
import arcs.core.entity.Handle
import arcs.core.storage.StorageEndpointManager
import arcs.core.util.Time

/**
 * Builds an instance of [HandleManagerImpl] to be used to create [Handle]s.
 */
class HandleManagerFactory(
  /**
   * Creates a [Scheduler] associated with an arcId. Will be the scheduler for all created
   * [Handle]s.
   */
  private val schedulerProvider: SchedulerProvider,
  /**
   * The [StorageEndpointManager] this [ArcHost] will use to create handles.
   */
  private val storageEndpointManager: StorageEndpointManager,
  /**
   * Until Kotlin Multiplatform adds a common API for retrieving time, each platform that
   * implements an [ArcHost] needs to supply an implementation of the [Time] interface.
   */
  private val platformTime: Time,
  /** (Optional) Add storage-proxy analytics support. */
  private val analytics: Analytics? = null,
  private val foreignReferenceChecker: ForeignReferenceChecker = ForeignReferenceCheckerImpl(
    emptyMap()
  )
) {

  /**
   * Returns an instance of [HandleManagerImpl] to be used to create [Handle]s.
   */
  fun build(arcId: String, hostId: String): HandleManager = HandleManagerImpl(
    arcId = arcId,
    hostId = hostId,
    time = platformTime,
    scheduler = schedulerProvider(arcId),
    storageEndpointManager = storageEndpointManager,
    analytics = analytics,
    foreignReferenceChecker = foreignReferenceChecker
  )

  /** Cancels all [Scheduler]s associated with this factory's [SchedulerProvider]. */
  fun cancel() = schedulerProvider.cancelAll()
}
