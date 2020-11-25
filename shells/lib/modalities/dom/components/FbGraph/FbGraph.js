/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const changeDebounceMs = 16;

const debounce = (key, action, delay) => {
  if (key) {
    clearTimeout(key);
  }
  if (action && delay) {
    return setTimeout(action, delay);
  }
};

export const FbGraph = Firedb => {

  const Eventer = class {
    constructor(listener) {
      this.listener = listener;
    }
    _fire(type, detail) {
      if (this.listener) {
        this.listener({type, detail, sender: this});
      }
    }
  };

  const FbSet = class extends Eventer {
    constructor(path, data, listener) {
      super(listener);
      this.path = path;
      this.data = data;
      // remember that firebase can fire events synchronously on listener attachment
      this._tryAttach();
    }
    dispose() {
      this._detach && this._detach();
    }
    _tryAttach() {
      try {
        this._attach(Firedb.child(this.path));
      } catch (x) {
        //
      }
    }
    _attach(db) {
      let started;
      const added = db.on('child_added', (snap, prevKey) => {
        //console.log('+*+*+*+*+*+ Firebase: child-added', snap.key);
        this._replaceSubProperties(this.data, snap.key, snap.val());
        this._fire('child-added', snap.key);
      });
      const changed = db.on('child_changed', (snap, prevKey) => {
        //console.log('+*+*+*+*+*+ Firebase: child-changed', this.path, snap.key); //, snap.val());
        this._replaceSubProperties(this.data, snap.key, snap.val());
        this._fire('child-changed', snap.key);
      });
      const removed = db.on('child_removed', snap => {
        //console.log('+*+*+*+*+*+ Firebase: child-removed', this.path, snap.key);
        delete this.data[snap.key];
        this._fire('child-removed', snap.key);
      });
      this._detach = () => {
        db.off('child_added', added);
        db.off('child_changed', changed);
        db.off('child_removed', removed);
      };
      // db.once('value', snap => {
      //   this.initialized = true;
      //   this._replaceProperties(this.data, snap.val());
      //   this._fire('initial', this.data);
      // });
    }
    // TODO(sjmiles): These methods preserve Object identity while modulating
    // properties. (1) Do we need this preservation still? (2) Use Map instead of Object.
    _replaceProperties(object, neo) {
      for (const field in neo) {
        this._replaceSubProperties(object, field, neo[field]);
      }
      for (const field in object) {
        if (!(field in neo)) {
          delete object[field];
        }
      }
    }
    _replaceSubProperties(object, key, neo) {
      if (typeof neo !== 'object') {
        object[key] = neo;
      } else {
        const data = object[key];
        if (data) {
          this._replaceProperties(data, neo);
        } else {
          object[key] = Object.assign(Object.create(null), neo);
        }
      }
    }
  };

  const Field = class extends Eventer {
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
      this.fbset = new FbSet(this.path, this.data, event => this._onSetEvent(event));
      // TODO(sjmiles): after init?
      this._notifySchema();
    }
    dispose() {
      this.disposed = true;
      this.fbset && this.fbset.dispose();
      Object.values(this.fields).forEach(field => field.dispose());
      this._notifySchema();
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
    _notifySchema() {
      this._debounceNotify = debounce(this._debounceNotify, () => {
        if (this.schema && this.schema.$changed) {
          this.schema.$changed(this);
        }
      }, changeDebounceMs);
    }
    _onSetEvent({type, detail}) {
      switch (type) {
        case 'child-changed': {
          const field = this.fields[detail];
          field && field._notifySchema();
        } break;
        case 'child-added':
          this._addField(detail);
          break;
        case 'child-removed':
          this._removeField(detail);
          break;
      }
      // if we are $fromJoin:
      // 1. there is no parent to see a 'child-changed' on us
      // 2. there is no notification to the parent that it's `value` has changed
      // we simulate those effects here
      if (this.$fromJoin) {
        this._notifySchema();
        this._fire('change');
      }
    }
    _onEvent(event) {
      // only event is 'change', propagate all the way up
      this._notifySchema();
      this._fire(event);
    }
    _addField(fieldName) {
      if (this.schema && (fieldName === '$key' || fieldName[0] !== '$')) {
        const datum = this.data[fieldName];
        let fieldSchema = this.schema[fieldName] || this.schema['*'];
        if (typeof fieldSchema === 'function') {
          fieldSchema = fieldSchema(this.key, fieldName, datum, this);
        }
        if (fieldSchema) {
          const field = this._createField(fieldName, fieldSchema, datum);
          this.fields[fieldName] = field;
          field.activate();
        }
      }
    }
    _removeField(key) {
      const field = this.fields[key];
      if (field) {
        field.dispose();
        delete this.fields[key];
      }
    }
    _createField(fieldName, fieldSchema) {
      let fieldPath = `${this.path}/${fieldName}`;
      let fromJoin = false;
      if (fieldSchema.$join) {
        fieldPath = fieldSchema.$join.path;
        fieldSchema = fieldSchema.$join.schema;
        fromJoin = true;
      }
      const field = new Field(this, fieldPath, fieldName, fieldSchema, event => this._onEvent(event));
      field.$fromJoin = fromJoin;
      return field;
    }
  };

  return {Field};

};
