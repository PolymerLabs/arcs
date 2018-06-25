import {Eventer, DbSet} from './DbUtils.js';
import Xen from '../../../components/xen/xen.js';

const changeDebounceMs = 16;
const debounce = Xen.debounce;

const FieldBase = class extends Eventer {
  constructor(parent, path, key, schema, onevent) {
    super(onevent);
    this.parent = parent;
    this.path = path;
    this.key = key;
    this.schema = schema;
    this.fields = {};
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
        (this.fields[fieldName] = this._createField(fieldName, fieldSchema, datum)).activate();
      }
    }
  }
  _createField(fieldName, fieldSchema, datum) {
    const fieldPath = `${this.path}/${fieldName}`;
    const onevent = dbevent => this._onEvent(dbevent);
    let field;
    if (fieldSchema.$join) {
      field = new DbField(this, fieldSchema.$join.path, fieldName, fieldSchema.$join.schema, onevent);
    } else if (fieldSchema.$changed) {
      field = new DbField(this, fieldPath, fieldName, fieldSchema, onevent);
    } else {
      field = new Field(datum, this, fieldPath, fieldName, fieldSchema, onevent);
    }
    return field;
  }
  getValue() {
    const results = Object.create(null);
    if (this.data) {
      Object.keys(this.data).forEach(
        key => results[key] = this.fields[key] ? this.fields[key].getValue() : this.data[key]
      );
    }
    if (this.fields.$key) {
      results.$key = this.fields.$key.getValue();
    }
    return results;
  }
  _onEvent(dbevent) {
    const {sender, type, detail} = dbevent;
    if (this.schema && this.schema.$changed) {
      this._changeDebounce = debounce(this._changeDebounce, () => {
        this.schema.$changed(this, {type, detail});
      }, changeDebounceMs);
    }
    //this._changeDebounce = debounce(this._changeDebounce, () => {
      this._fire('changed', detail);
    //}, changeDebounceMs);
  }
};

const Field = class extends FieldBase {
  constructor(data, parent, path, key, schema, onevent) {
    super(parent, path, key, schema, onevent);
    this.data = data;
  }
  activate() {
    if (this.data && this.schema) {
      // TODO(sjmiles): create pseudo-field `$key` to map the key of this record
      // into it's data as an affordance for joining against keys.
      // E.g. `arcs` references are of the form `<arcid>: <>` (instead of `<arcidkey>:<arcid>`)
      // and we use `$key` to map `<arcid>` into `data` for joining.
      if (this.schema.$key) {
        this.addField('$key');
      }
      Object.keys(this.data).forEach(key => this.addField(key));
      this._fire('changed');
    }
  }
};

export const DbField = class extends FieldBase {
  constructor(parent, path, key, schema, onevent) {
    super(parent, path, key, schema, onevent);
    this.data = {};
  }
  activate() {
    this.dbset = new DbSet(this.path, dbevent => {
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
    super._onEvent({type: 'changed'});
    //super._onEvent(dbevent);
  }
};
