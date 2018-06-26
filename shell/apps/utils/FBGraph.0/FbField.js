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
    console.log('disposing', this);
    this.disposed = true;
    Object.values(this.fields).forEach(field => field.dispose());
    this._notifySchema('removed');
    //this._fire('removed');
  }
  get value() {
    return this.getValue();
  }
  removeField(fieldName) {
    const field = this.fields[fieldName];
    if (field) {
      field.dispose();
      delete this.fields[fieldName];
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
    }
    // without second clause the field wouldn't be notified of adds
    else { //if (fieldSchema.$changed /*|| (fieldSchema['*'] && fieldSchema['*'].$changed)*/) {
      field = new DbField(this, fieldPath, fieldName, fieldSchema, onevent);
    }
    // else {
    //   field = new Field(datum, this, fieldPath, fieldName, fieldSchema, onevent);
    // }
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
  _notifySchema(type) {
    if (this.schema && this.schema.$changed) {
      // debounce attached schema change notifications
      //this._changeDebounce = debounce(this._changeDebounce, () => {
        //console.log(type);
        this.schema.$changed(this, {type});
      //}, changeDebounceMs);
    }
  }
  _onEvent(dbevent) {
    const {sender, type, detail} = dbevent;
    this._notifySchema(type);
    // do not debounce internal notifcations
    this._fire('changed');
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
    } else {
      this._notifySchema('changed');
      //this._fire('changed');
    }
  }
};

export const DbField = class extends FieldBase {
  constructor(parent, path, key, schema, onevent) {
    super(parent, path, key, schema, onevent);
    this.data = {};
  }
  activate() {
    if (this.schema && this.schema.$key) {
      this.addField('$key');
    }
    this.dbset = new DbSet(this.path, this.data, dbevent => {
      this._onSetEvent(dbevent);
    });
  }
  dispose() {
    this.dbset.dispose();
    super.dispose();
  }
  _onSetEvent(dbevent) {
    const {type, detail} = dbevent;
    switch (type) {
      case 'child-added':
        // TODO(sjmiles): field only created if needed, should it be `maybeAddField`?
        this.addField(detail);
        this._notifySchema('changed');
        break;
      case 'child-removed':
        this.removeField(detail);
        break;
    }
    // any ancestor using $changed has it's own FB listener, so we don't need to
    // forward Set events
    //this._notifySchema('changed');
    //super._onEvent({type: 'changed'});
    //super._onEvent(dbevent);
  }
};
