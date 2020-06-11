package arcs.core.entity

import arcs.core.common.Referencable
import arcs.core.data.FieldName
import arcs.core.data.RawEntity
import arcs.core.data.Schema

open class VariableEntityBase(
    entityClassName: String,
    schema: Schema,
    entityId: String? = null,
    creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
    expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
) : EntityBase(entityClassName, schema, entityId, creationTimestamp, expirationTimestamp) {

    private val rawSingletons = mutableMapOf<FieldName, Referencable?>()
    private val rawCollections = mutableMapOf<FieldName, Set<Referencable>>()

    override fun serialize(): RawEntity  {
        val rawEntity = super.serialize()
        return rawEntity.copy(
            singletons = rawSingletons + rawEntity.singletons,
            collections = rawCollections + rawEntity.collections
        )
    }

    override fun deserialize(rawEntity: RawEntity,
                             nestedEntitySpecs: Map<SchemaHash, EntitySpec<out Entity>>) {
        rawEntity.singletons
            .filter { !hasSingletonField(it.key) }
            .forEach { rawSingletons[it.key] = it.value }

        rawEntity.collections
            .filter { !hasCollectionField(it.key) }
            .forEach { rawCollections[it.key] = it.value }

        super.deserialize(rawEntity, nestedEntitySpecs)
    }
}
