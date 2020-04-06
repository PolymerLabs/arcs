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

package arcs.core.host

import arcs.core.util.Scheduler

/**
 * Responsible for provisioning [Scheduler]s for [ArcHost]s on an arc-by-arc basis.
 *
 * The [Scheduler]s will be used to choreograph particle/handle callback behavior from the
 * [StorageProxy] instances created by the [ArcHost].
 */
interface SchedulerProvider {
    operator fun invoke(arcId: String): Scheduler
}
