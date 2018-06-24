import {Eventer, DbValue, DbSet} from './DbUtils.js';

/*
  If we watch `arcs` we watch the entire subtree (Firebase protocol).
  If we want granular change data for `arcs\<key>\shim_handles` we must watch
  that node specifically.
  This leads to two mappings for `shim_handles`, one in `field('arcs')[key].shim_handles`
  and one in field('shim_handles').
  Duplication seems unavoidable, but we have to make sure we don't duplicate change events,
  or cause the data objects to diverge.
*/

const changeDebounceMs = 64;

const debounce = (key, action, delay) => {
  if (key) {
    window.clearTimeout(key);
  }
  if (action && delay) {
    return window.setTimeout(action, delay);
  }
};

const FieldBase = class extends Eventer {
  constructor(parent, path, key, schema, onevent) {
    super(onevent);
    this.parent = parent;
    this.path = path;
    this.key = key;
    this.schema = schema;
    this.fields = {};
    this._valueObject = Object.create(null);
  }
  dispose() {
    // detach things that will not GC otherwise
  }
  get value() {
    return this.getValue();
  }
  removeField(fieldName) {
    const field = this.fields[fieldName];
    if (field) {
      field.dispose();
      this.fields[fieldName] = null;
    }
  }
  addField(fieldName) {
    if (this.schema && (fieldName === '$key' || fieldName[0] !== '$')) {
      const datum = this.data[fieldName];
      let fieldSchema = this.schema[fieldName] || this.schema['*'];
      if (typeof fieldSchema === 'function') {
        fieldSchema = fieldSchema(this.key, fieldName, datum);
      }
      if (fieldSchema) {
        this.fields[fieldName] = this._createField(fieldName, fieldSchema, datum);
      }
    }
  }
  _createField(fieldName, fieldSchema, datum) {
    const fieldPath = `${this.path}/${fieldName}`;
    const onevent = dbevent => this._onEvent(dbevent);
    if (fieldSchema.$join) {
      return new DbField(this, fieldSchema.$join.path, fieldName, fieldSchema.$join.schema, onevent);
    } else if (fieldSchema.$changed) {
      return new DbField(this, fieldPath, fieldName, fieldSchema, onevent);
    } else {
      return new Field(datum, this, fieldPath, fieldName, fieldSchema, onevent);
    }
  }
  getValue() {
    const results = this._valueObject;
    if (this.data) {
      Object.keys(this.data).forEach(
        key => results[key] = this.fields[key] ? this.fields[key].getValue() : this.data[key]
      );
      // TODO(sjmiles): `delete` is bad, use a `Map`?
      // also: would prefer to avoid this work somehow
      //   maybe manage set-backed valueObjects via added/removed/changed events
      //   instead of on-demand
      Object.keys(results).forEach(key => {
        if (key !== '$key' && !(key in this.data)) {
          delete results[key];
        }
      });
    } else {
      Object.keys(results).forEach(key => delete results[key]);
    }
    if (this.fields.$key) {
      results.$key = this.fields.$key.getValue();
    }
    return results;
  }
  _onEvent(dbevent) {
    const {sender, type, detail} = dbevent;
    if (this.schema && this.schema.$changed) {
      this.schema.$changed(this, {type, detail});
    }
    this._changeDebounce = debounce(this._changeDebounce, () => {
      this._fire('changed', detail);
    }, changeDebounceMs);
  }
};

const Field = class extends FieldBase {
  constructor(data, parent, path, key, schema, onevent) {
    super(parent, path, key, schema, onevent);
    this.data = data;
    if (data && schema) {
      // TODO(sjmiles): create pseudo-field `$key` to map the key of this record
      // into it's data as an affordance for joining against keys.
      // E.g. `arcs` references are of the form `<arcid>: <>` (instead of `<arcidkey>:<arcid>`)
      // and we use `$key` to map `<arcid>` into `data` for joining.
      if (schema.$key) {
        this.addField('$key');
      }
      Object.keys(data).forEach(key => this.addField(key));
    }
  }
};

export const DbField = class extends FieldBase {
  constructor(parent, path, key, schema, onevent) {
    super(parent, path, key, schema, onevent);
    this.data = {};
    this.dbset = new DbSet(path, dbevent => {
      this._onEvent(dbevent);
    }, this.data);
  }
  dispose() {
    this.dbset.dispose();
    super.dispose();
  }
  _onEvent(dbevent) {
    const {type, detail} = dbevent;
    switch (type) {
      case 'added':
        // TODO(sjmiles): field only created if needed, should it be `maybeAddField`?
        this.addField(detail);
        break;
      case 'removed':
        this.removeField(detail);
        break;
    }
    super._onEvent(dbevent);
  }
};
