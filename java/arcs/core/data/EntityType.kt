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

package arcs.core.data

import arcs.core.crdt.CrdtEntity
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtModelType
import arcs.core.type.Tag
import arcs.core.type.Type
import kotlin.reflect.KClass

/** [Type] representation of an entity. */
data class EntityType(override val entitySchema: Schema) :
  Type,
  EntitySchemaProviderType,
  CrdtModelType<CrdtEntity.Data, CrdtEntity.Operation, RawEntity> {

  override val tag = Tag.Entity

  override val crdtModelDataClass: KClass<*> = CrdtEntity.Data::class

  override fun createCrdtModel(): CrdtModel<CrdtEntity.Data, CrdtEntity.Operation, RawEntity> =
    entitySchema.createCrdtEntityModel()

  override fun toStringWithOptions(options: Type.ToStringOptions): String {
    return entitySchema.toString(options)
  }
}
