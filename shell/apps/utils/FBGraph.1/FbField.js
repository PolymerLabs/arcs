import {Eventer, DbSet} from './DbUtils.js';
import Xen from '../../../components/xen/xen.js';

const debounce = Xen.debounce;
const changeDebounceMs = 16;

export const Field = class extends Eventer {
  constructor(parent, path, key, schema, onevent) {
    super(onevent);
    this.parent = parent;
    this.path = path;
    this.key = key;
    this.schema = schema;
    this.fields = {};
    this.data = {};
    this._requiredInits = 0;
  }
  activate() {
    // TODO(sjmiles): create pseudo-field `$key` to map the key of this record
    // into it's data as an affordance for joining against keys.
    // E.g. `arcs` references are of the form `<arcid>: <>` (instead of `<arcidkey>:<arcid>`)
    // and we use `$key` to map `<arcid>` into `data` for joining.
    if (this.schema && this.schema.$key) {
      this._addField('$key');
    }
    this.dbset = new DbSet(this.path, this.data, dbevent => {
      this._onSetEvent(dbevent);
    });
  }
  dispose() {
    this.dbset.dispose();
    Object.values(this.fields).forEach(field => field.dispose());
  }
  get value() {
    const results = Object.create(null);
    if (this.data) {
      Object.keys(this.data).forEach(
        key => results[key] = this.fields[key] ? this.fields[key].value : this.data[key]
      );
    }
    if (this.fields.$key) {
      results.$key = this.fields.$key.value;
    }
    return results;
  }
  _addField(fieldName) {
    if (this.schema && (fieldName === '$key' || fieldName[0] !== '$')) {
      const datum = this.data[fieldName];
      let fieldSchema = this.schema[fieldName] || this.schema['*'];
      if (typeof fieldSchema === 'function') {
        fieldSchema = fieldSchema(this.key, fieldName, datum);
      }
      if (fieldSchema) {
        const field = this.fields[fieldName] = this._createField(fieldName, fieldSchema, datum);
        field.activate();
      }
    }
  }
  _createField(fieldName, fieldSchema) {
    const onEvent = ({type, sender}) => {
      // convert join-changed to child-changed events
      if (type === 'join-changed') {
        this._debounceJoinChanged = debounce(this._debounceJoinChanged, () => {
          this._onSetEvent({type: 'child-changed', detail: sender.key});
        }, changeDebounceMs);
        // propagate upward
        this._fire(type);
      }
    };
    let field;
    if (fieldSchema.$join) {
      this._requiredInits++;
      field = new Field(this, fieldSchema.$join.path, fieldName, fieldSchema.$join.schema, onEvent);
      // hack set-event to convert db events to join-changed events
      const oldSetEvent = field._onSetEvent;
      field._onSetEvent = event => {
        this._fire('join-changed');
        oldSetEvent.call(field, event);
      };
      field._joined = true;
    }
    else {
      const fieldPath = `${this.path}/${fieldName}`;
      field = new Field(this, fieldPath, fieldName, fieldSchema, onEvent);
    }
    return field;
  }
  _removeField(fieldName) {
    const field = this.fields[fieldName];
    if (field) {
      field.dispose();
      delete this.fields[fieldName];
    }
  }
  _notifySchema(event) {
    if (this.schema && this.schema.$changed) {
      // debounce attached schema change notifications
      //const debounceKey =`_debounce_${event.type}`;
      //this[debounceKey] = debounce(this[debounceKey], () => {
        //console.log('notifySchema', event.type);
        this.schema.$changed(event);
      //}, changeDebounceMs);
    }
  }
  _onSetEvent({type, detail}) {
    switch (type) {
      case 'child-added':
        this._addField(detail);
        this._notify(type, detail);
        break;
      case 'child-removed':
        this._notify(type, detail);
        this._removeField(detail);
        break;
      case 'child-changed':
        this._notify(type, detail);
        break;
    }
  }
  _notify(type, key) {
    // TODO(sjmiles): there is no obvious reason not to notify for all child operations,
    // but our app de facto never needs notifications for non-fields.
    // Leave it this way until we discover a use case for the more flexible behavior.
    const field = this.fields[key];
    field && this._notifySchema({type, field});
    //this._notifySchema({type, field: this.fields[key] || this.data[key]});
    //this._fire(type);
  }
};
