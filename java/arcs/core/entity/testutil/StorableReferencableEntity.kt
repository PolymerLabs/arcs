package arcs.core.entity.testutil

import arcs.core.common.Id
import arcs.core.common.Referencable
import arcs.core.common.ReferenceId
import arcs.core.data.Capability.Ttl
import arcs.core.data.RawEntity
import arcs.core.data.Schema
import arcs.core.data.SchemaFields
import arcs.core.data.SchemaName
import arcs.core.entity.Entity
import arcs.core.entity.EntitySpec
import arcs.core.entity.Storable
import arcs.core.util.Time

/**
 * A fake entity class, that implements both - [Storable] and [Referencable] interfaces and used for
 * Handles classes tests.
 */
class StorableReferencableEntity(
  override val id: ReferenceId,
  override val entityId: String? = null,
  override val creationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP,
  override val expirationTimestamp: Long = RawEntity.UNINITIALIZED_TIMESTAMP
) : Entity, Storable, Referencable {
  override fun ensureEntityFields(
    idGenerator: Id.Generator,
    handleName: String,
    time: Time,
    ttl: Ttl
  ) {}

  final override fun reset() {}

  override fun serialize(storeSchema: Schema?) = RawEntity()

  companion object : EntitySpec<StorableReferencableEntity> {
    override val SCHEMA = Schema(
      setOf(SchemaName("StorableReferencableEntity")),
      SchemaFields(emptyMap(), emptyMap()),
      "abc123"
    )

    override fun deserialize(data: RawEntity) = StorableReferencableEntity("fake")
  }
}
