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

@file:Suppress("FunctionName") // Allow pseudo-constructors.

package arcs.sdk

import arcs.core.data.RawEntity
import arcs.sdk.common.ReferenceId
import arcs.sdk.storage.StorageKey

/** Represents a reference (ie. pointer) to an [Entity]. */
typealias Reference = arcs.core.storage.Reference

/**
 * Creates a new [Reference] to an [Entity] with the given [entityId] within the region identified
 * by [regionKey].
 */
fun Reference(entityId: ReferenceId, regionKey: StorageKey) =
    Reference(
        entityId as arcs.core.common.ReferenceId,
        regionKey.toCoreStorageKey(),
        version = null
    )

/**
 * Dereferences a [Reference] into a [RawEntity] or `null` if the [Reference] is invalid.
 */
@ExperimentalReferenceApi
suspend fun Reference.dereferenceRaw(): RawEntity? = TODO("not implemented")

/**
 * Dereferences a [Reference] into an [Entity] of type [T], or `null` if the [Reference] is invalid.
 */
@ExperimentalReferenceApi
suspend fun <T : Entity> Reference.dereference(entitySpec: EntitySpec<T>): T? =
    dereferenceRaw()?.let {
        TODO("Use the entitySpec to convert the rawEntity into the actual entity")
    }
