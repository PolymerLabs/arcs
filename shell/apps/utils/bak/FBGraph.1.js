import {Eventer, DbValue, DbSet} from './DbUtils.js';

const FieldBase = class extends Eventer {
  constructor(path, schema, listener, parent) {
    super(listener);
    this.schema = schema;
    this.path = path;
    this.parent = parent;
    this.key = this.path.split('/').pop();
  }
  _handler({type, detail}) {
    this._fire(type, detail);
    //console.warn(`FieldBase: doesn't handle well`);
  }
  value(results) {
    console.warn(`FieldBase: don't know how to get value`);
  }
};

const FieldValue = class extends FieldBase {
  constructor(path, schema, listener, parent) {
    super(path, schema, listener, parent);
    //console.log(`observing [${path}] as a FieldValue`);
    this.dbvalue = new DbValue(path, ({type, detail}) => {
      //console.log(`...${path} simple value`, detail);
      this._handler(this.key, schema, {type, detail, sender: this});
      this._fire('value', detail);
    });
  }
  _handler(key, schema, event) {
    //console.warn(key, handler, event);
    const handler = schema && (schema.handler || (typeof schema === 'function' && schema));
    if (handler) {
      handler(key, event);
    }
    super._handler(event);
  }
  value(results) {
    results = results || Object.create(null);
    Object.assign(results, this.dbvalue.value);
    return results;
  }
};

const FieldCollection = class extends FieldBase {
  constructor(path, schema, listener, parent) {
    super(path, schema, listener, parent);
    this.fields = {};
  }
  value(results) {
    results = results || Object.create(null);
    Object.keys(this.fields).forEach(key => {
      if (key in this.fields) {
        switch (key) {
          case '$fields':
          case '$key':
            this.fields[key].value(results);
            break;
          default:
            results[key] = this.fields[key].value();
            break;
        }
      }
    });
    return results;
  }
};

const FieldMap = class extends FieldCollection {
  constructor(path, schema, listener, parent) {
    super(path, schema, listener, parent);
    Object.keys(schema).forEach(key => {
      const field = schema[key];
      //const localHandler = event => this._handler(key, field, event);
      const localHandler = event => this._handler(event);
      switch (key) {
        case '$key':
          this.fields.$key = FieldFactory(field.join, this.key, field.schema, localHandler, this);
          break;
        case '$fields':
          this.fields.$fields = new FieldValue(path, null, localHandler, this);
          break;
        default: {
          this.fields[key] = FieldFactory(path, key, field, localHandler, this);
          break;
        }
      }
    });
  }
};

const FieldSet = class extends FieldCollection {
  constructor(path, schema, listener, parent) {
    super(path, schema, listener, parent);
    //console.log(`observing [${path}] as a FieldSet`);
    this.dbset = new DbSet(path, event => this._handler(path, schema, event));
  }
  value(results) {
    results = results || Object.create(null);
    Object.assign(results, this.dbset.set);
    const join = super.value();
    Object.keys(join).forEach(key => results[key].$join = join[key]);
    return results;
  }
  _handler(path, schema, {type, detail}) {
    switch (type) {
      case 'added':
        if (this.schema && this.schema.$key) {
          const field = this.schema.$key;
          console.log(`joining field for ${path}/${detail}`, field);
          const joinHandler = ({type, detail}) => {
            const subfield = field.schema[detail];
            if (subfield && subfield.handler) {
              subfield.handler({type, detail});
            }
            this._fire(type, detail);
          };
          this.fields[detail] = FieldFactory(field.join, detail, field.schema, joinHandler, this);
          //this.fields[detail] = FieldFactory(path, detail, schema);
        //this.fields[detail] = FieldFactory(path, detail, schema, event => {
          //console.log('thingSet:', event);
        //}, this);
        }
        break;
    }
    this._fire(type, detail);
  }
};

export const FieldFactory = (path, key, schema, listener, parent) => {
  path = `${path}/${key}`;
  if (Array.isArray(schema)) {
    return new FieldSet(path, schema[0], listener, parent);
  }
  if (typeof schema !== 'object') {
    return new FieldValue(path, schema, listener, parent);
  }
  return new FieldMap(path, schema, listener, parent);
};


