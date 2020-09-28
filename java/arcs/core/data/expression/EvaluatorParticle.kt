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
import arcs.core.data.FieldType
import arcs.core.data.Plan
import arcs.core.data.Schema
import arcs.core.data.SchemaRegistry
import arcs.core.data.SingletonType
import arcs.core.data.toSchema
import arcs.core.entity.EntitySpec
import arcs.sdk.BaseParticle
import arcs.sdk.Entity
import arcs.sdk.EntityBase
import arcs.sdk.HandleHolderBase
import arcs.sdk.ReadCollectionHandle
import arcs.sdk.ReadSingletonHandle
import arcs.sdk.WriteCollectionHandle
import arcs.sdk.WriteSingletonHandle
import java.lang.IllegalArgumentException

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
    schemaMap.mapValues { (_, schema) ->
      setOf(object : EntitySpec<Entity> {
        override val SCHEMA = schema

        override fun deserialize(data: arcs.core.data.RawEntity) =
          EntityBase(SCHEMA.name.toString(), SCHEMA).apply { deserialize(data) }
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
          @Suppress("UNCHECKED_CAST")
          val singletonHandle = handle as ReadSingletonHandle<EntityBase>
          val entity = singletonHandle.fetch()
          if (entity != null) {
            scopeMap[name] = EntityToScopeTranslator.translateEntity(schema, entity)
          }
        }
        is CollectionType<*> -> {
          @Suppress("UNCHECKED_CAST")
          val collectionHandle = handle as ReadCollectionHandle<EntityBase>
          val entities = collectionHandle.fetchAll()
          scopeMap[name] = entities.map {
            EntityToScopeTranslator.translateEntity(schema, it)
          }
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
      val result = evalExpression(expression, handlesScope) ?: return
      when (hc.type) {
        is SingletonType<*> -> {
          @Suppress("UNCHECKED_CAST")
          val singletonHandle = handle as WriteSingletonHandle<EntityBase>
          singletonHandle.store(
            ScopeToEntityTranslator.translateEntity(schema, result)
          )
        }
        is CollectionType<*> -> {
          @Suppress("UNCHECKED_CAST")
          val collectionHandle = handle as WriteCollectionHandle<EntityBase>
          @Suppress("UNCHECKED_CAST")
          collectionHandle.storeAll(
            ScopeToEntityTranslator.translateCollection(
              // We piggy back on translation of sets of inline entities
              // to translate the expression result for a collection handle.
              CollectionOf(FieldType.InlineEntity(schema.hash)),
              result
            ) as Collection<EntityBase>
          )
        }
      }
    }
  }
}

/** Extension of [FieldType] to represent a collection field. */
private data class CollectionOf(val primitiveType: FieldType)

/**
 * Translator of entity data representations which can recurse down the nested structures
 * while maintaining the mapping to the type description from the schema.
 */
private abstract class SchemaGuidedTranslator {

  fun translateCollection(type: CollectionOf, value: Any): Set<Any> = when (value) {
    is Set<*> -> value
    is Sequence<*> -> value.toSet()
    is Iterable<*> -> value.toSet()
    else -> throw IllegalArgumentException("Unable to interpret $value as a Set")
  }.map { translateSingleton(type.primitiveType, requireNotNull(it)) }.toSet()

  fun translateSingleton(type: FieldType, value: Any): Any = when (type) {
    is FieldType.ListOf -> translateList(type, value)
    is FieldType.InlineEntity -> translateInlineEntity(type, value)
    is FieldType.Primitive -> value
    is FieldType.EntityRef -> TODO("References are not supported")
    is FieldType.Tuple -> TODO("Tuples are not supported")
  }

  fun translateList(type: FieldType.ListOf, value: Any): List<Any> = when (value) {
    is List<*> -> value
    is Sequence<*> -> value.toList()
    is Iterable<*> -> value.toList()
    else -> throw IllegalArgumentException("Unable to interpret $value as a List")
  }.map { translateSingleton(type.primitiveType, requireNotNull(it)) }

  abstract fun translateInlineEntity(type: FieldType.InlineEntity, value: Any): Any
}

/**
 * Translator of [EntityBase] representation to [Expression.Scope] representation.
 */
private object EntityToScopeTranslator : SchemaGuidedTranslator() {

  override fun translateInlineEntity(type: FieldType.InlineEntity, value: Any) = EntityScope(
    value as EntityBase,
    SchemaRegistry.getSchema(type.schemaHash)
  )

  fun translateEntity(schema: Schema, value: EntityBase) = EntityScope(value, schema)
}

/**
 * Translator of [Expression.Scope] to [EntityBase] representation.
 *
 * TODO: Consider replacing it by custom scope builder which creates EntityBase directly during
 *       evaluation. The tricky piece is creating an appropriate schema at that point.
 */
private object ScopeToEntityTranslator : SchemaGuidedTranslator() {
  override fun translateInlineEntity(type: FieldType.InlineEntity, value: Any) =
    translateEntity(SchemaRegistry.getSchema(type.schemaHash), value)

  fun translateEntity(schema: Schema, value: Any) = when (value) {
    is EntityScope -> value.entity
    is MapScope<*> -> EntityBase(schema.name.toString(), schema).also {
      schema.fields.singletons.forEach { (name, type) ->
        it.setSingletonValue(
          name,
          translateSingleton(type, value.lookup(name))
        )
      }
      schema.fields.collections.forEach { (name, type) ->
        it.setCollectionValue(
          name,
          translateCollection(CollectionOf(type), value.lookup(name))
        )
      }
    }
    else -> throw IllegalArgumentException("Unable to interpret $value as an Entity")
  }
}

/**
 * Wrapper for the [EntityBase] that allows it to act as an [Expression.Scope].
 *
 * TODO: Consider an extension mechanism where EntityBase could serve as a scope directly
 *       without wrapping into this object.
 */
class EntityScope(val entity: EntityBase, val schema: Schema) : Expression.Scope {

  override val scopeName = schema.name?.name ?: "Anonymous Entity"

  override fun <T> lookup(param: String): T = when {
    schema.fields.singletons.containsKey(param) ->
      @Suppress("UNCHECKED_CAST")
      EntityToScopeTranslator.translateSingleton(
        requireNotNull(schema.fields.singletons[param]),
        requireNotNull(entity.getSingletonValue(param))
      ) as T
    schema.fields.collections.containsKey(param) ->
      @Suppress("UNCHECKED_CAST")
      EntityToScopeTranslator.translateCollection(
        CollectionOf(requireNotNull(schema.fields.collections[param])),
        requireNotNull(entity.getCollectionValue(param))
      ) as T
    else -> throw IllegalArgumentException(
      "Field '$param' not found in schema '${schema.name?.name}'"
    )
  }

  override fun builder(subName: String?) =
    throw NotImplementedError("Entity Scope is not extensible")
}
