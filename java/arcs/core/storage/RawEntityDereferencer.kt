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

package arcs.core.storage

import arcs.core.crdt.CrdtEntity
import arcs.core.data.EntityType
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.util.Scheduler
import arcs.core.util.TaggedLog
import kotlin.coroutines.CoroutineContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * [Dereferencer] to use when de-referencing a [Reference] to an [Entity].
 *
 * [Handle] implementations should inject this into any [Reference] objects they encounter.
 *
 * TODO(jasonwyatt): Use the [Scheduler] here when dereferencing.
 */
class RawEntityDereferencer(
    private val schema: Schema,
    private val storeManager: StoreManager = StoreManager(),
    private val scheduler: Scheduler,
    private val entityActivationFactory: ActivationFactory? = null
) : Dereferencer<RawEntity> {
    private val log = TaggedLog { "Dereferencer(${schema.names})" }

    override suspend fun dereference(
        reference: Reference,
        coroutineContext: CoroutineContext
    ): RawEntity? {
        log.debug { "De-referencing $reference" }

        val storageKey = reference.referencedStorageKey()

        val options = StoreOptions<CrdtEntity.Data, CrdtEntity.Operation, RawEntity>(
            storageKey,
            EntityType(schema),
            StorageMode.Direct
        )

        val store = storeManager.get(options).activate(entityActivationFactory)
        val deferred = CompletableDeferred<RawEntity?>()
        var token = -1
        token = store.on(
            ProxyCallback { message ->
                when (message) {
                    is ProxyMessage.ModelUpdate<*, *, *> -> {
                        val model = (message.model as CrdtEntity.Data)
                            .takeIf { it.versionMap.isNotEmpty() }
                        deferred.complete(model?.toRawEntity())
                        store.off(token)
                    }
                    is ProxyMessage.SyncRequest -> Unit
                    is ProxyMessage.Operations -> Unit
                }
            }
        )

        return withContext(coroutineContext) {
            launch { store.onProxyMessage(ProxyMessage.SyncRequest(token)) }

            // Only return the item if we've actually managed to pull it out of storage, and that
            // it matches the schema we wanted.
            deferred.await()?.takeIf { it matches schema }?.copy(id = reference.id)
        }
    }
}

/* internal */
infix fun RawEntity.matches(schema: Schema): Boolean {
    // Only allow empty to match if the Schema is also empty.
    // TODO: Is this a correct assumption?
    if (singletons.isEmpty() && collections.isEmpty())
        return schema.fields.singletons.isEmpty() && schema.fields.collections.isEmpty()

    // Return true if any of the RawEntity's fields are part of the Schema.
    return (singletons.isEmpty() || singletons.keys.any { it in schema.fields.singletons }) &&
        (collections.isEmpty() || collections.keys.any { it in schema.fields.collections })
}
