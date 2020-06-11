package arcs.core.entity

import arcs.core.common.Referencable
import arcs.core.data.FieldName
import arcs.core.data.RawEntity
import arcs.core.data.Schema

/**
 * A base [Entity] to access data from type variables.
 *
 * This class behaves just like [EntityBase], except for (de)serialization. During deserialization,
 * all the fields from [RawEntity] are stored for later use in serialization.
 *
 * In this way, an entity representing a type variable will pass data through the system without
 * a specific description of the data (an exact match with a [Schema]).
 */
open class VariableEntityBase : EntityBase {

    constructor(entityClassName: String, schema: Schema): super(entityClassName, schema)

    constructor(
        entityClassName: String,
        schema: Schema,
        entityId: String?
    ) : super(entityClassName, schema, entityId)

    constructor(
        entityClassName: String,
        schema: Schema,
        entityId: String?,
        creationTimestamp: Long,
        expirationTimestamp: Long
    ) : super(entityClassName, schema, entityId, creationTimestamp, expirationTimestamp)


    private val rawSingletons = mutableMapOf<FieldName, Referencable?>()
    private val rawCollections = mutableMapOf<FieldName, Set<Referencable>>()

    override fun serialize(): RawEntity {
        val rawEntity = super.serialize()
        return rawEntity.copy(
            singletons = rawSingletons + rawEntity.singletons,
            collections = rawCollections + rawEntity.collections
        )
    }

    override fun deserialize(
        rawEntity: RawEntity,
        nestedEntitySpecs: Map<SchemaHash, EntitySpec<out Entity>>
    ) {
        rawEntity.singletons
            .filter { !hasSingletonField(it.key) }
            .forEach { rawSingletons[it.key] = it.value }

        rawEntity.collections
            .filter { !hasCollectionField(it.key) }
            .forEach { rawCollections[it.key] = it.value }

        super.deserialize(rawEntity, nestedEntitySpecs)
    }
}
