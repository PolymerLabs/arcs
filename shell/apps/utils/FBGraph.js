import {Eventer, DbValue, DbSet} from './DbUtils.js';

const HANDLER = `$changed`;
const JOIN = `$join`;
const KEYJOIN = `$key`;

const schemaHasFields = schema => {
  const keyCount = schema && Object.keys(schema).filter(key => key !== HANDLER && key !== JOIN).length;
  return schema && keyCount;
};

const FieldBase = class extends Eventer {
  constructor(path, schema, listener) {
    super(listener);
    this.path = path;
    this.schema = schema;
    this.key = path.split('/').pop();
  }
  dispose() {
    console.warn(`FieldBase: don't know how to dispose`);
  }
  get value() {
    return this.getValue();
  }
  getValue(results) {
    return this._value(results || Object.create(null));
  }
  _value(results) {
    console.warn(`FieldBase: don't know how to get value`);
  }
  _handler({type, detail}) {
    this._fire(type, detail);
  }
  // TODO(sjmiles): this is a lot of jumping about just to remove a field from an object :(
  _getJoinSchema(schema) {
    const result = Object.create(null);
    Object.keys(schema).forEach(key => {
      if (key !== JOIN) {
        result[key] = schema[key];
      }
    });
    return result;
  }
};

const FieldValue = class extends FieldBase {
  constructor(path, schema, listener) {
    super(path, schema, listener);
    this._initValue(path, schema);
    //console.log(`FieldValue for ${path}`);
  }
  dispose() {
    this.dbvalue.dispose();
    this.field && this.field.dispose();
  }
  _initValue(path, schema) {
    this.dbvalue = new DbValue(path, event => this._valueHandler(schema, event));
  }
  _valueHandler(schema, {type, detail}) {
    //const handler = schema[HANDLER];
    const join = schema[JOIN];
    if (join) {
      //console.log('got value building join');
      if (this.field && this.field.key !== detail) {
        console.log('disposing old join');
        this.field.dispose();
        this.field = null;
      }
      if (!this.field) {
        const joinSchema = this._getJoinSchema(schema);
        //console.log(`constructing new join: [${join}/${detail}]`, joinSchema);
        this.field = new Field(join, detail, joinSchema, ({type, detail}) => {
          this._changed(schema, detail);
          //console.log('JOIN event', detail, this.field.value);
          //this._handler({type, detail});
          return;
        });
      }
    } else {
      this._changed(schema, detail);
      // TODO(sjmiles): too many `handler`
      //handler && handler(this, {type, detail});
      //this._handler({type, detail});
    }
  }
  _changed(schema, data) {
    //console.log(`FieldValue changed [${this.path}]`, data);
    const event = {type: 'change', detail: data};
    if (schema[HANDLER]) {
      schema[HANDLER](this, event);
    }
    this._handler(event);
  }
  _value(results) {
    const value = this.field ? this.field.value : this.dbvalue.value;
    if (typeof results === 'object') {
      return Object.assign(results, value);
    }
    return value;
  }
};

const FieldSetField = class extends Eventer {
 constructor(path, schema, handler) {
    super(path, schema, handler);
  }
 };

const FieldSet = class extends FieldBase {
  constructor(path, schema, handler) {
    super(path, schema, handler);
    this._initFields(path, schema);
  }
   dispose() {
     if (this.dbset) {
       this.dbset.dispose();
     }
     Object.values(this.fields).forEach(field => field.dispose());
  }
  _initFields(path, schema) {
    this.fields = Object.create(null);
    if (schema['*']) {
      // '*': get all teh things, apply `*.schema` as schema to each record
      this.dbset = new DbSet(path, event => this._setHandler(schema['*'], event));
    } else {
      const handler = schema[HANDLER];
      if (handler) {
        //console.warn(`attached weirdo value listener to handle`, schema);
        //this.dbvalue = new DbValue(path, event => handler(this, event));
      }
      // otherwise: get all records matching keys in schema, apply `schema.key` as schema for each record
      // HANDLER, JOIN are not actual schema keys
      const keys = Object.keys(schema).filter(key => key !== HANDLER && key !== JOIN);
      const join = schema[JOIN];
      if (join) {
        //console.log(path, join);
      }
      // construct a Field for each schema key
      keys.forEach(key => {
        let fieldPath = path;
        let fieldKey = key;
        let fieldSchema = schema[key];
        // TODO(sjmiles): hassle because the join key is not in this record (it's the record's key)
        // ... fix this in the database!
        if (key === KEYJOIN) {
          fieldPath = fieldSchema[JOIN];
          fieldKey = this.key;
          fieldSchema = this._getJoinSchema(fieldSchema);
        }
        this.fields[key] = new Field(fieldPath, fieldKey, fieldSchema, event => {
          if (fieldSchema[JOIN]) {
            //console.log('JOIN', schema, event);
            this._setHandler(schema, event);
          } else {
            const itemKey = event.sender.path.split('/').slice(-2, -1).pop();
            //this._handler(event);
            //console.warn(itemKey);
            this._changed(itemKey);
          }
        });
      });
    }
  }
  _setHandler(schema, {type, detail}) {
    const handler = schema[HANDLER];
    if (handler) {
      switch (type) {
        case 'initial':
          //handler(this, {type, detail});
          return;
        case 'added':
        case 'removed': {
          const value = this.dbset.set[detail];
          handler(this, {type, detail: {key: detail, value}});
        }
      }
    }
    if (schemaHasFields(schema)) {
      switch (type) {
        case 'added':
          this.fields[detail] = new Field(this.path, detail, schema, event => {
            this._changed(detail);
          });
          break;
        case 'removed':
          this.fields[detail].dispose();
          this.fields[detail] = null;
          break;
      }
    }
    this._changed(detail);
  }
  _changed(itemKey) {
    const data = this.value;
    //console.log(`FieldSet field changed [${this.path}]:[${itemKey}]`, data);
    if (this.schema[HANDLER]) {
      this.schema[HANDLER](this, {type: 'changed', detail: {key: itemKey, value: data}});
    }
    this._handler({type: 'changed', detail: data});
  }
  _value(results) {
    if (this.dbset) {
      Object.assign(results, this.dbset.set);
    }
    Object.keys(this.fields).forEach(key => results[key] = this.fields[key].getValue(results[key]));
    return results;
  }
};

export const Field = class {
  constructor(root, key, schema, handler) {
    const path = `${root ? `${root}/` : ''}${key}`;
    const delegate = schemaHasFields(schema) ? FieldSet : FieldValue;
    return new delegate(path, schema, handler);
  }
};
