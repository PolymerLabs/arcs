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

package arcs.core.data.expression

import arcs.core.data.CollectionType
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.data.SingletonType
import arcs.core.entity.EntitySpec
import arcs.core.host.toSchema
import arcs.sdk.BaseParticle
import arcs.sdk.Entity
import arcs.sdk.EntityBase
import arcs.sdk.HandleHolderBase
import arcs.sdk.ReadCollectionHandle
import arcs.sdk.ReadSingletonHandle
import arcs.sdk.WriteCollectionHandle
import arcs.sdk.WriteSingletonHandle

/**
 * A Particle instantiated for [Expression]-based particles declared in Arcs manifests.
 *
 * This particle uses the [Plan.Particle] instance provided at runtime to reflect on the declared
 * handle connections and their [Expression]s.
 */
class EvaluatorParticle(planParticle: Plan.Particle?) : BaseParticle() {

    private val metadata = requireNotNull(planParticle)
    private val schemaMap = metadata.handles.mapValues { (_, hc) -> hc.type.toSchema() }

    override val handles = HandleHolderBase(
        metadata.particleName,
        schemaMap.mapValues {
            (_, schema) ->
            setOf(object : EntitySpec<Entity> {
                override val SCHEMA = schema

                override fun deserialize(data: arcs.core.data.RawEntity) =
                    EntityBase(SCHEMA.name.toString(), SCHEMA).apply {
                        // TODO: Take nested entities into account.
                        deserialize(data)
                    }
            })
        }
    )

    override fun onReady() {
        val scope = scopeFromReadHandles()
        evaluateWriteHandleExpressions(scope)
    }

    private fun scopeFromReadHandles(): CurrentScope<Any> {
        val scopeMap = mutableMapOf<String, Any>()

        metadata.handles.filterValues { hc -> hc.mode.canRead }.mapValues { (name, hc) ->
            val handle = handles.handles[name]
            val schema = requireNotNull(schemaMap[name])
            when (hc.type) {
                is SingletonType<*> -> {
                    val singletonHandle = handle as ReadSingletonHandle<EntityBase>
                    val entity = singletonHandle.fetch()
                    if (entity != null) {
                        scopeMap[name] = entityAsScope(entity, schema)
                    }
                }
                is CollectionType<*> -> {
                    val collectionHandle = handle as ReadCollectionHandle<EntityBase>
                    val entities = collectionHandle.fetchAll()
                    scopeMap[name] = entities.map { entityAsScope(it, schema) }
                }
            }
        }

        return CurrentScope(scopeMap)
    }

    private fun evaluateWriteHandleExpressions(handlesScope: CurrentScope<Any>) {
        metadata.handles.filterValues { hc -> hc.mode.canWrite }.forEach { (name, hc) ->
            val handle = handles.handles[name]
            val schema = requireNotNull(schemaMap[name])
            val expression = requireNotNull(metadata.handles[name]).expression!!
            val result = evalExpression(expression, handlesScope)
            when (hc.type) {
                is SingletonType<*> -> {
                    val singletonHandle = handle as WriteSingletonHandle<EntityBase>
                    singletonHandle.store(entityFromScope(result as MapScope<*>, schema))
                }
                is CollectionType<*> -> {
                    val collectionHandle = handle as WriteCollectionHandle<EntityBase>
                    (result as Sequence<MapScope<*>>).forEach {
                        collectionHandle.store(entityFromScope(it, schema))
                    }
                }
            }
        }
    }

    // TODO: eventually Scope.lookup  will be able to delegate to EntityBase directly.
    private fun entityAsScope(entity: EntityBase, schema: Schema): MapScope<*> =
        // TODO: Support collection fields.
        schema.fields.singletons.mapValues { (name, _) ->
            entity.getSingletonValue(name)
        }.asScope()

    // TODO: We will replace this by supplying a ScopeBuilder to the Evaluator that can set the
    //       fields directly without an intermediate map.
    private fun entityFromScope(scope: MapScope<*>, schema: Schema) =
        // TODO: Support collection fields.
        EntityBase(schema.name.toString(), schema).also {
            schema.fields.singletons.forEach { (name, _) ->
                it.setSingletonValue(name, scope.map[name])
            }
        }
}
