  import {Eventer, DbValue, DbSet} from './DbUtils.js';
  //
  const scott = `-LBXevFOcUyM-TvYr5oq`;
  const somebody = `-L-8Hr1jivDeJid-oZbx`;
  const userid = scott;
  //
  const Thing = class extends Eventer {
    constructor(path, joins, cb) {
      super(cb);
      console.log(`...thing for ${path}`);
      this.dbvalue = new DbValue(path, ({type, detail}) => {
        console.log(`...${path}:`, detail);
        this._fire('value', detail);
      });
      this.path = path;
      this.refThings = {};
      const join = joins && joins.shift();
      if (join) {
        console.log(`joining [${path}/*] to [${join.path}] using [${join.key}]`);
        this.refJoin = new DbSet(`${path}/${join.key}`, event => this._handleJoin(join, event));
      }
    }
    _handleJoin(join, {sender, type, detail}) {
      switch (type) {
        case 'added':
          console.log('.....', this.path, detail, sender.set[detail]);
          console.log(`joining ${join.path}/${detail}`);
          this.refThings[detail] = new Thing(`${join.path}/${detail}`, join.joins, ({event, detail}) => {
            if (this._initialized()) {
              this._fire('initialized');
            }
          });
          break;
      }
      this._fire(type, detail);
    }
    _initialized() {
      return this.dbvalue.initialized
        && (!this.refJoin || this.refJoin.initialized)
        && !Object.values(this.refThings).some(thing => !thing._initialized())
      ;
    }
  };

  //
  // window.user = new Thing(`users/${scottid}`, [{key: `arcs`, path: `arcs`}/*, 'shim_handles'*/], ({type, detail}) => {
  //   if (type === 'initialized') {
  //     console.warn('wow, unexpected!');
  //   }
  // });
  //

  const ThingSet = class extends Eventer {
    constructor(path, schema, handler) {
      super(handler);
      this.things = {};
      console.log(`observing [${path}] as a set of`, schema);
      this.dbset = new DbSet(path, event => this._handle(path, schema, event));
    }
    _handle(path, schema, {type, detail}) {
      switch (type) {
        case 'added':
          console.log(`adding Thing for ${path}/${detail}`, schema);
          this.things[detail] = new Thing2(`${path}/${detail}`, schema, event => {
            console.log('thingSet:', event);
          });
          break;
      }
      //this._fire(type, detail);
    }
    dump() {
      Object.values(this.things).forEach(value => value.dump());
    }
  };

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
      }
    }],
    info: true
  };

  const arcs = {
    users: [user]
  };

  //window.thing = new Thing2(``, arcs);
  window.thing = new Thing2(`users/${userid}`, user);
