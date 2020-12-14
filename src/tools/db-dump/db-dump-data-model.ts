/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import Database from 'better-sqlite3';
import {exit} from 'process';
import {assert} from 'console';
import {Dictionary, NumberDictionary} from '../../utils/lib-utils.js';

// Note that the types below match SQL tables in our data representation, and the
// snake_case_named fields in each case match SQL fields. This match has to be exact
// so that the type lines up with the output of better-sqlite3.
type Entity = {
  storage_key_id: number;
  entity_id: string;

  // A "cleaned-up" entity_id, with random sections replaced with minimal representations.
  // Useful for quick comparisons with other entity IDs.
  clean_entity_id: string;
  storageKey: StorageKey;
};

type StorageKey = {
  id: number,
  storage_key: string;
  data_type: number;
  value_id: number;

  // A "cleaned-up" storage_key, with random sections replaced with minimal representations.
  // Useful for quick comparisons with other storage keys.
  clean_storage_key: string;
}

type Type = {
  id: number,
  name: string,
  is_primitive: number,

  // A list of fields that have this type.
  fields?: Field[],
  // A list of fields that are fields of this type (only populated when this type is an Entity)
  subFields?: Field[]
}

type Field = {
  id: number,
  type_id: number,
  parent_type_id: number,
  name: string,
  is_collection: number,

  subFields?: Field[]
}

type FieldValue = {
  entity_storage_key_id: number,
  field_id: number,
  value_id: number
}

type TextPrimitiveValue = {
  id: number,
  value: string
}

type CollectionEntries = {
  collection_id: number,
  value_id: number,
  version_map: string
}

type EntityRef = {
  id: number,
  entity_id: string,
  creation_timestamp: number,
  expiration_timestamp: number,
  backing_storage_key: string,
  version_map: string,
  entity_storage_key: string
}

const expected = [
  'types',
  'storage_keys',
  'entities',
  'entity_refs',
  'collections',
  'collection_entries',
  'fields',
  'field_values',
  'text_primitive_values',
  'number_primitive_values'
];

const TEXT_FIELDS = ['Text', 'BigInt', 'Instant'];

const SINGLETON = 0;
const COLLECTION = 1;
const LIST = 2;
const INLINE_ENTITY = 3;
const INLINE_ENTITY_COLLECTION = 4;
const INLINE_ENTITY_LIST = 5;

export class DbDumpDataModel {
  db: Database.Database;

  entities: Dictionary<Entity>;
  storageKeys: Dictionary<StorageKey>;
  types: Dictionary<Type>;
  fields: Dictionary<Field>;
  fieldValues: Dictionary<FieldValue>;
  textPrimitiveValues: Dictionary<TextPrimitiveValue>;
  collectionEntries: Dictionary<CollectionEntries[]>;
  entityRefs: Dictionary<EntityRef>;

  fieldsByType: Dictionary<Field[]>;
  fieldsByParentType: Dictionary<Field[]>;

  constructor(fileName: string) {
    this.db = new Database(fileName, {readonly: true});

    const tableNames = this.tables();
    expected.forEach(e => {
      if (!tableNames.includes(e)) {
        console.error(`Missing table ${e} - this may not be an arcs DB!`);
        exit(1);
      }
    });

    this.entities = this.mkTable('entities', 'storage_key_id');
    this.storageKeys = this.mkTable('storage_keys', 'id');
    this.types = this.mkTable('types', 'id');
    this.adjustTypes();
    this.fields = this.mkTable('fields', 'id');
    this.fieldsByType = this.index(this.fields, 'type_id');
    this.fieldsByParentType = this.index(this.fields, 'parent_type_id');
    this.fieldValues = this.mkTable('field_values', ['entity_storage_key_id', 'field_id']);
    this.textPrimitiveValues = this.mkTable('text_primitive_values', 'id');
    this.collectionEntries = this.mkSummaryTable('collection_entries', 'collection_id');
    this.entityRefs = this.mkTable('entity_refs', 'id');


    this.markupDictionary(this.entities, 'entity_id', 'clean_entity_id', processEntityId);
    this.markupDictionary(this.storageKeys, 'storage_key', 'clean_storage_key', processStorageKey);

    this.resolveForeignKeys(this.entities, 'storage_key_id', 'storageKey', this.storageKeys);

    Object.values(this.types).forEach(type => this.populateType(type));

  }

  printEntities(prettyIds: boolean, toplevel: boolean) {
    for (const entity of Object.values(this.entities)) {
      const entityId = prettyIds ? entity.clean_entity_id : entity.entity_id;
      const storageKey = prettyIds ? entity.storageKey.clean_storage_key : entity.storageKey.storage_key;
      if (toplevel && storageKey.startsWith('inline')) {
        continue;
      }
      let entityString = `EntityId: ${entityId} StorageKey: ${storageKey} ${entity.storageKey.data_type} ${entity.storageKey.value_id}`;
      const type = this.types[entity.storageKey.value_id];
      if (type.subFields) {
        const values = type.subFields.map(field => this.fieldValues[`${entity.storage_key_id}.${field.id}`]);
        if ((values.filter(value => value !== undefined)).length === 0) {
          entityString += ' ' + bold('<deleted>');
        } else {
          for (let i = 0; i < values.length; i++) {
            const fieldName = type.subFields[i].name;
            const fieldType = this.types[type.subFields[i].type_id];
            const fieldTypeName = fieldType.is_primitive === 1 ? fieldType.name : bold(fieldType.id + '');
            const valueSpec = values[i];
            let value;
            if (valueSpec == undefined) {
              value = bold('null');
            } else if (fieldType.is_primitive && TEXT_FIELDS.includes(fieldType.name)) {
              const textPrimitive = this.textPrimitiveValues[valueSpec.value_id];
              value = textPrimitive ? `'${textPrimitive.value}'` : bold(`ERR: ${valueSpec.value_id} not in text_primitive_values`);
            } else if (fieldType.is_primitive === 0 && type.subFields[i].is_collection === INLINE_ENTITY) {
              const storageKey = this.storageKeys[valueSpec.value_id];
              if (storageKey == undefined) {
                value = blink(`ERR: no storageKey for inline entity ${valueSpec.value_id}`);
              } else {
                value = storageKey.clean_storage_key;
              }
            } else if (fieldType.is_primitive === 0 && type.subFields[i].is_collection === INLINE_ENTITY_COLLECTION || type.subFields[i].is_collection === INLINE_ENTITY_LIST) {
              const valueEntries = this.collectionEntries[valueSpec.value_id] || [];
              const values = valueEntries.map(entry => entry.value_id);
              value = values.map(id => {
                const storageKey = this.storageKeys[id];
                if (storageKey == undefined) {
                  return blink(`ERR: no storageKey for inline entity ${id}`);
                }
                const entity = this.entities[id];
                if (entity == undefined) {
                  return blink(`ERR: no entity table entry for inline entity ${id}`);
                }
                return storageKey.clean_storage_key;
              }).join(',');
              value = `[${value}]`;
            } else {
              value = valueSpec.value_id;
            }
            entityString += `\n  ${fieldName}(${fieldTypeName}): ${value}`;
          }
        }
      }
      console.log(entityString);
    }
  }

  printTypes() {
    const usedTypeIds = new Set<number>();
    Object.values(this.entities).forEach(entity => usedTypeIds.add(entity.storageKey.value_id));
    const usedTypes = [...usedTypeIds.values()].map(idx => this.types[idx]);

    const reachable = new Set<Type>();
    const addFieldsToReachable = (t: {subFields?: Field[]}) => t.subFields && t.subFields.forEach(field => {
        reachable.add(this.types[field.type_id]);
        addFieldsToReachable(field);
      });

    usedTypes.forEach(addFieldsToReachable);

    usedTypes.forEach(type => {
      if (type.is_primitive === 1) {
        return;
      }
      if (reachable.has(type)) {
        return;
      }
      console.log(`\n${bold(type.id + '')}(${type.name}):`);
      type.subFields.forEach(field => this.printField(field, '  '));
    });
  }

  printStorageKeys(prettyIds: boolean, toplevel: boolean) {
    Object.values(this.storageKeys).forEach(key => {
      if (toplevel && key.storage_key.startsWith('inline')) {
        return;
      }
      const dataType = ['Entity', 'Singleton', 'Collection'][key.data_type];
      console.log(`${key.id}: ${prettyIds ? key.clean_storage_key : key.storage_key} (${dataType} of ${bold(key.value_id + '')})`);
    });
  }

  printCollections() {
    Object.values(this.storageKeys).forEach(key => {
      if (key.data_type === 0) {
        return;
      }
      const collection = this.collectionEntries[key.value_id] || [];
      console.log(key.clean_storage_key);
      console.log(collection.map(entry => entry.value_id));
    });
  }

  printEntityRefs() {
    Object.values(this.entityRefs).forEach(entityRef => {
      console.log(`${entityRef.id}: ${entityRef.entity_id} ${entityRef.entity_storage_key}`);
    });
  }

  private printField(field: Field, indent: string) {
    const type = this.types[field.type_id];
    let name = type.name;
    if (type.is_primitive === 0) {
      name = `${bold(type.id + '')}(${name})`;
    }
    switch (field.is_collection) {
      case SINGLETON:
        break;
      case COLLECTION:
        name = `[${name}]`;
        break;
      case LIST:
        name = `List<${name}>`;
        break;
      case INLINE_ENTITY:
        name = `inline ${name}`;
        break;
      case INLINE_ENTITY_COLLECTION:
        name = `[inline ${name}]`;
        break;
      case INLINE_ENTITY_LIST:
        name = `List<inline ${name}>`;
        break;
    }
    console.log(`${indent}${field.name}: ${name}`);
    field.subFields && field.subFields.forEach(field => this.printField(field, indent + '  '));
  }

  // Generate fake entries for primitive Types because this is what we used to have.
  private adjustTypes() {
    if (!this.types[0]) {
      const primitives = ['Boolean', 'Number', 'Text', 'Byte', 'Short', 'Int', 'Long', 'Char', 'Float', 'Double', 'BigInt', 'Instant'];
      for (let i = 0; i < primitives.length; i++) {
        assert(!this.types[i]);
        this.types[i] = {id: i, name: primitives[i], is_primitive: 1};
      }

      // b/170674301 Back when we were adding primitive types to the DB, they sometimes got left out (b/170674301). If that has happened
      // then the sentinel type needs to be reconstructed.
      if (!this.types[1000000]) {
        console.warn(`sentinel type record missing! This suggests that this is an older DB that has had b/170674301 happen.`);
      }
      this.types[1000000] = {id: 1000000, name: 'SENTINEL TYPE FOR REFERENCES', is_primitive: 1};
    }
  }

  private resolveForeignKeys(dict: {}, field: string, reference: string, foreigns: {})  {
    Object.values(dict).forEach(item => item[reference] = foreigns[item[field]]);
  }

  private markupDictionary<T, U extends keyof T, V extends keyof T>(dict: Dictionary<T>, inField: U, outField: V, update: (i: T[U]) => T[V]) {
    Object.values(dict).forEach(item => this.markup(item, inField, outField, update));
  }

  private markup<T, U extends keyof T, V extends keyof T>(element: T, inField: U, outField: V, update: (i: T[U]) => T[V]) {
    element[outField] = update(element[inField]);
  }

  private populateType(type: Type) {
    type.fields = [];
    type.subFields = [];
    if (this.fieldsByType[type.id]) {
      this.fieldsByType[type.id].forEach(field => {
        type.fields.push(field);
        if (field.subFields == null) {
          this.populateField(field);
        }
      });
    }
    if (this.fieldsByParentType[type.id]) {
      this.fieldsByParentType[type.id].forEach(field => {
        type.subFields.push(field);
        if (field.subFields == null) {
          this.populateField(field);
        }
      });
    }
  }

  private populateField(field: Field) {
    const t = this.types[field.type_id];
    if (t.is_primitive === 1) {
      return;
    }
    field.subFields = [];
    this.fieldsByParentType[t.id].forEach(child => {
      field.subFields.push(child);
      if (child.subFields == null) {
        this.populateField(child);
      }
    });
  }

  private mkTable<T>(table: string, keyName: string | string[]): Dictionary<T> {
    const result: Dictionary<T> = {};
    this.get(`select * from ${table}`).forEach(item => {
      let key;
      if (typeof(keyName) === 'string') {
        key = item[keyName];
      } else {
        key = keyName.map(component => item[component]).join('.');
      }
      result[key] = item;
    });
    return result;
  }

  private mkSummaryTable<T>(table: string, keyName: string): Dictionary<T[]> {
    const result: Dictionary<T[]> = {};
    this.get(`select * from ${table}`).forEach(item => {
      const key = item[keyName];
      if (result[key] == undefined) {
        result[key] = [];
      }
      result[key].push(item);
    });
    return result;
  }

  private index<T>(table: Dictionary<T>, field: string): Dictionary<T[]> {
    const index: Dictionary<T[]> = {};
    Object.values(table).forEach(entry => {
      const key = entry[field];
      if (index[key] == undefined) {
        index[key] = [];
      }
      index[key].push(entry);
    });
    return index;
  }

  private tables(): string[] {
    return this.get(`select name from sqlite_master where type='table'`).map(row => row.name);
  }

  private get(query: string) {
    return this.db.prepare(query).all();
  }
}

const firstBit = {parts: {}, next: 0, id: '#'};
const secondBit = {parts: {}, next: 0, id: '@'};
const thirdBit = {parts: {}, next: 0, id: '$'};
const hexBit = {parts: {}, next: 0, id: '0x'};
const entityIdParts = {0: firstBit, 2: firstBit, 4: secondBit};
const postAmbleParts = {0: thirdBit};
const dbParts = {0: hexBit, 3: firstBit, 5: firstBit, 7: secondBit};
const collectionParts = {0: hexBit};

function processStorageKey(key: string): string {
  if (key.startsWith('inline://{')) {
    let innerKey = key.substring(10, key.lastIndexOf('}'));
    while (innerKey.startsWith('{')) {
      innerKey = innerKey.substring(1, innerKey.length - 1);
    }
    innerKey = processStorageKey(innerKey);
    const postAmble = key.substring(key.lastIndexOf('}') + 1);
    const parts = postAmble.split('/');
    const id0 = processPart(postAmbleParts, parts, 0);
    return `inline-{${innerKey}}/${id0}/${bold(parts[1])}`;
  } else if (key.startsWith('db://')) {
    const hexBit = key.substring(5, key.indexOf('@'));
    const rest = key.substring(key.indexOf('@') + 1);
    let parts = rest.split(':');
    parts = [hexBit, ...parts[0].split('/'), ...parts.slice(1)];
    if (parts[2] === '!') {
      // this is a collection key
      parts = [parts[0], parts[1], ...parts[3].split('/')];
      const ids = mapParts(collectionParts, parts);
      return `db-${ids[0]}@${ids[1]}/!:${ids[2]}/${ids[3]}/${ids[4]}`;
    } else {
      const ids = mapParts(dbParts, parts);
      return `db-${ids[0]}@${ids[1]}/${ids[2]}:${ids[3]}:${ids[4]}:${ids[5]}:${ids[6]}:${ids[7]}:${ids[8]}`;
    }
  }
  return key;
}

function processEntityId(id: string): string {
  const parts = id.split(':');
  if (parts.length === 0) {
    // inline hash or "NO REFERENCE ID"
    return id;
  }
  if (parts.length !== 6) {
    // ???
    return id;
  }
  const ids = mapParts(entityIdParts, parts);
  return `${ids[0]}:${ids[1]}:${ids[2]}:${ids[3]}:${ids[4]}:${ids[5]}`;
}

function mapParts(partSpec: NumberDictionary<{parts: Dictionary<string>, next: number, id: string}>, parts: string[]) {
  const result = [];
  for (let i = 0; i < parts.length; i++) {
    if (i in partSpec) {
      result.push(processPart(partSpec, parts, i));
    } else {
      result.push(bold(parts[i]));
    }
  }
  return result;
}

function processPart(idParts: NumberDictionary<{parts: Dictionary<string>, next: number, id: string}>, parts: string[], id: number) {
  if (!idParts[id].parts[parts[id]]) {
    idParts[id].parts[parts[id]] = color(idParts[id].id + (idParts[id].next++), idParts[id].next);
  }
  return idParts[id].parts[parts[id]];
}

function color(st: string, id: number) {
  return `\x1b[${30 + id % 8}m${st}\x1b[0m`;
}

function bold(st: string) {
  return `\x1b[1m${st}\x1b[0m`;
}

function blink(st: string) {
  return `\x1b[1;6;31m${st}\x1b[0m`;
}
