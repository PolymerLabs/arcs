import {Eventer, DbValue, DbSet} from './DbUtils.js';

const scott = `-LBXevFOcUyM-TvYr5oq`;
const somebody = `-L-8Hr1jivDeJid-oZbx`;
const userid = scott;

const FieldBase = class extends Eventer {
  constructor(path, schema, handler) {
    super(handler);
    this.schema = schema;
    this.path = path;
    this.key = this.path.split('/').pop();
  }
  query(schema, accum) {
    console.warn(`FieldBase: don't know how to query`);
  }
};

const FieldValue = class extends FieldBase {
  constructor(path, schema, handler) {
    super(path, schema, handler);
    console.log(`observing [${path}] as a FieldValue`);
    this.dbvalue = new DbValue(path, ({type, detail}) => {
      console.log(`...${path} simple value`, detail);
      this._handler(this.key, schema, {type, detail, sender: this});
      this._fire('value', detail);
    });
  }
  _handler(key, handler, event) {
    // console.warn(key, handler, event);
    // handler = handler.handler || (typeof handler === 'function' && handler);
    // if (handler) {
    //   handler(key, event);
    // }
  }
  query(schema, accum) {
    const result = accum || Object.create(null);
    const haveSchema = schema && (typeof schema === 'object');
    if (!haveSchema) {
      Object.assign(result, this.dbvalue.value);
    } else {
      const keys = Object.keys(schema);
      keys.forEach(key => {
        if (this.dbvalue) {
          if (key in this.dbvalue.value) {
            result[key] = this.dbvalue.value[key];
          }
        }
      });
    }
    return result;
  }
};

const FieldCollection = class extends FieldBase {
  constructor(path, schema, handler) {
    super(path, schema, handler);
    this.fields = {};
  }
  value() {
    return this.query();
  }
  query(schema, accum) {
    const result = accum || Object.create(null);
    const haveSchema = schema && (typeof schema === 'object');
    let keys = haveSchema ? Object.keys(schema) : Object.keys(this.fields);
    keys.forEach(key => {
      if (key in this.fields) {
        switch (key) {
          case '$fields':
          case '$key':
            this.fields[key].query(schema, result);
            break;
          default:
            result[key] = this.fields[key].query(haveSchema ? schema[key] : null);
            break;
        }
      }
    });
    return result;
  }
};

const FieldMap = class extends FieldCollection {
  constructor(path, schema, handler) {
    super(path, schema, handler);
    Object.keys(schema).forEach(key => {
      const field = schema[key];
      switch (key) {
        case '$key':
          this.fields.$key = FieldFactory(`${field.join}/${this.key}`, field.schema);
          break;
        case '$fields':
          this.fields.$fields = new FieldValue(path);
          break;
        default: {
          this.fields[key] = FieldFactory(`${path}/${key}`, field, event => this._handler(key, field, event));
        }
      }
    });
  }
};

const FieldSet = class extends FieldCollection {
  constructor(path, schema, handler) {
    super(path, schema, handler);
    console.log(`observing [${path}] as a FieldSet`);
    this.dbset = new DbSet(path, event => this._handle(path, schema, event));
  }
  _handle(path, schema, {type, detail}) {
    switch (type) {
      case 'added':
        console.log(`adding Thing for ${path}/${detail}`, schema);
        this.fields[detail] = FieldFactory(`${path}/${detail}`, schema, event => {
          console.log('thingSet:', event);
        });
        break;
    }
    //this._fire(type, detail);
  }
};

const FieldFactory = (path, schema, handler) => {
  if (Array.isArray(schema)) {
    return new FieldSet(path, schema[0]);
  }
  if (typeof schema !== 'object') {
    return new FieldValue(path, schema);
  }
  return new FieldMap(path, schema);
};

//
/*
const Thing2 = class extends Eventer {
  constructor(path, schema, handler) {
    super(handler);
    this.schema = schema;
    this.path = path;
    this.key = this.path.split('/').pop();
    this.things = {};
    if (Array.isArray(schema)) {
      this.thingSet = new ThingSet(path, schema[0], event => this._handler(this.key, schema[0], event));
    } else {
      console.group(`observing [${path}]`);
      let keyCount = Object.keys(schema).length;
      if (schema.$key) {
        keyCount--;
        console.log(`joining [${path}] to [${schema.$key.join}/${this.key}]`);
        this.dbjoin = new Thing2(`${schema.$key.join}/${this.key}`, schema.$key.schema || true);
      }
      if (!(typeof schema === 'object') || schema.$fields || keyCount === 0) {
        console.log('treating fields as atomic');
        this.dbvalue = new DbValue(path, ({type, detail}) => {
          console.log(`...${path} simple value`, detail);
          this._handler(this.key, schema, {type, detail, sender: this});
          this._fire('value', detail);
        });
      } else {
        Object.keys(schema).forEach(key => {
          const field = schema[key];
          this.things[key] = new Thing2(`${path}/${key}`, field, event => this._handler(key, field, event));
        });
      }
      console.groupEnd();
    }
  }
  _handler(key, handler, event) {
    //if (event.sender.schema !== true)
      console.warn(key, handler, event);
    // const field = {
    //   key,
    //   sender
    // };
    handler = handler.handler || (typeof handler === 'function' && handler);
    if (handler) {
      handler(key, event);
    }
    // this._fire(type, detail);
  }
  get value() {
    const result = {};
    const _objectValues = object => Object.assign(result, object);
    const _thingsValues = things => Object.keys(things).forEach(key => result[key] = things[key].value);
    if (this.dbvalue) {
      _objectValues(this.dbvalue.value);
    }
    if (this.thingSet) {
      _thingsValues(this.thingSet.things);
    }
    if (this.things) {
      _thingsValues(this.things);
    }
    if (this.dbjoin) {
      _objectValues(this.dbjoin.value);
    }
    return result;
  }
  query(schema, accum) {
    const result = accum || {};
    const keys = Object.keys(schema);
    if (this.dbjoin) {
      this.dbjoin.query(schema, result);
    }
    keys.forEach(key => {
      if (this.dbvalue) {
        if (key in this.dbvalue.value) {
          result[key] = this.dbvalue.value[key];
        }
      }
      if (key in this.things) {
        result[key] = this.things[key].value;
        //result[key] = this.things[key].query({[key]: true});
      }
    });
    return result;
  }
  dump() {
    console.group(this.key);
    this.dumpFields();
    console.groupEnd();
  }
  dumpFields() {
    if (this.dbvalue) {
      console.log(this.dbvalue.value);
    } else if (this.thingSet) {
      this.thingSet.dump();
    } else if (this.things) {
      Object.values(this.things).forEach(thing => thing.dump());
    }
    if (this.dbjoin) {
      this.dbjoin.dumpFields();
    }
  }
};
*/

const go = () => {

  const profile = {};
  const handler = (field, {type, detail}) => {
    console.log('WATCH:', field, type, detail);
    if (detail.data) {
      if (profile[field]) {
        profile[field].push(detail.data);
      } else {
        profile[field] = [detail.data];
      }
    }
    console.log('PROFILE:', profile);
  };

  const user = {
    arcs: [{
      $key: {
        join: `/arcs`,
        schema: {
          metadata: true,
          serialization: true,
          shim_handles: [handler],
          steps: true
        }
      },
      $fields: true
    }],
    info: true
  };

  const arcs = {
    users: [user]
  };

  window.field = FieldFactory(`users/${userid}`, user);

};

go();
