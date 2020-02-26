/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {TypeLiteral, Type, EntityType, TypeVariable, CollectionType,
        BigCollectionType, RelationType, InterfaceType, SlotType, ReferenceType,
        HandleType, SingletonType, TypeVariableInfo, InterfaceInfo} from './type.js';
import {Schema} from './schema.js';
import {SlotInfo} from './slot-info.js';

function fromLiteral(literal: TypeLiteral) : Type {
  switch (literal.tag) {
    case 'Entity':
      return new EntityType(Schema.fromLiteral(literal.data));
    case 'TypeVariable':
      return new TypeVariable(TypeVariableInfo.fromLiteral(literal.data));
    case 'Collection':
      return new CollectionType(Type.fromLiteral(literal.data));
    case 'BigCollection':
      return new BigCollectionType(Type.fromLiteral(literal.data));
    case 'Relation':
      return new RelationType(literal.data.map(t => Type.fromLiteral(t)));
    case 'Interface':
      return new InterfaceType(InterfaceInfo.fromLiteral(literal.data));
    case 'Slot':
      return new SlotType(SlotInfo.fromLiteral(literal.data));
    case 'Reference':
      return new ReferenceType(Type.fromLiteral(literal.data));
    case 'Handle':
      return new HandleType();
    case 'Singleton':
      return new SingletonType(Type.fromLiteral(literal.data));
    default:
      throw new Error(`fromLiteral: unknown type ${literal}`);
  }
}

Type.fromLiteral = fromLiteral;
