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

import arcs.core.common.Referencable
import arcs.core.crdt.CrdtModel
import arcs.core.crdt.CrdtModelType
import arcs.core.crdt.CrdtSet
import arcs.core.crdt.CrdtSet.Data
import arcs.core.crdt.CrdtSet.IOperation
import arcs.core.type.Tag
import arcs.core.type.Type
import kotlin.reflect.KClass

/** Extension function to wrap any type in a collection type. */
fun <T : Type> T?.collectionOf(): CollectionType<T>? =
  if (this == null) null else CollectionType(this)

/** [Type] representation of a collection. */
data class CollectionType<T : Type>(
  val collectionType: T
) : Type,
  Type.TypeContainer<T>,
  EntitySchemaProviderType,
  CrdtModelType<Data<Referencable>, IOperation<Referencable>, Set<Referencable>> {

  override val tag = Tag.Collection
  override val containedType: T
    get() = collectionType
  override val entitySchema: Schema?
    get() = (collectionType as? EntitySchemaProviderType)?.entitySchema

  override val crdtModelDataClass: KClass<*> = CrdtSet.DataImpl::class

  override fun createCrdtModel():
    CrdtModel<Data<Referencable>, IOperation<Referencable>, Set<Referencable>> {
      return CrdtSet()
    }

  override fun toStringWithOptions(options: Type.ToStringOptions): String {
    return if (options.pretty) {
      "${collectionType.toStringWithOptions(options)} Collection"
    } else {
      "[${collectionType.toStringWithOptions(options)}]"
    }
  }
}
