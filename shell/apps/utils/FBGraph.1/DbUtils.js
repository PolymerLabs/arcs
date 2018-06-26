import Firebase from '../../common/firebase-config.js';

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

const DbValue = class extends Eventer {
  constructor(path, listener) {
    super(listener);
    this.path = path;
    this._tryAttach();
  }
  dispose() {
    this._detach && this._detach();
  }
  _tryAttach() {
    try {
      this._attach(Firebase.db.child(this.path));
    } catch (x) {
      //
    }
  }
  _attach(db) {
    let started;
    const value = db.on('value', snap => {
      this.initialized = true;
      this.value = snap.val();
      //console.log('value-changed', snap.key, this.value);
      this._fire('changed', this.value);
    });
    this._detach = () => {
      db.off('value', value);
    };
  }
};

const DbSet = class extends Eventer {
  constructor(path, data, listener) {
    super(listener);
    this.path = path;
    this.data = data;
    // TODO(sjmiles): BC, deprecated
    this.set = data;
    // remember that firebase can fire events synchronously to listener attachment
    this._tryAttach();
  }
  dispose() {
    //console.warn(`DbSet: detaching from [${this.path}]`);
    this._detach && this._detach();
  }
  _tryAttach() {
    //console.log(`DbSet: attaching to [${this.path}]`);
    try {
      this._attach(Firebase.db.child(this.path));
    } catch (x) {
      //
    }
  }
  _attach(db) {
    let started;
    const added = db.on('child_added', (snap, prevKey) => {
      this._replaceSubProperties(this.set, snap.key, snap.val());
      //console.log('FireBase: child-added', snap.key);
      this._fire('child-added', snap.key);
    });
    const changed = db.on('child_changed', (snap, prevKey) => {
      //console.log('FireBase: child-changed', this.path, snap.key, snap.val());
      this._replaceSubProperties(this.set, snap.key, snap.val());
      this._fire('child-changed', snap.key);
    });
    const removed = db.on('child_removed', snap => {
      //console.warn('FireBase: child-removed', this.path, snap.key);
      this.set[snap.key] = null;
      this._fire('child-removed', snap.key);
    });
    this._detach = () => {
      db.off('child_added', added);
      db.off('child_changed', changed);
      db.off('child_removed', removed);
    };
    // db.once('value', snap => {
    //   this.initialized = true;
    //   this._replaceProperties(this.set, snap.val());
    //   this._fire('initial', this.set);
    // });
  }
  _replaceProperties(object, neo) {
    for (let field in neo) {
      this._replaceSubProperties(object, field, neo[field]);
    }
    for (let field in object) {
      if (!(field in neo)) {
        delete object[field];
      }
    }
  }
  _replaceSubProperties(object, key, neo) {
    if (typeof neo !== 'object') {
      object[key] = neo;
    } else {
      let data = object[key];
      if (data) {
        this._replaceProperties(data, neo);
      } else {
        object[key] = Object.assign(Object.create(null), neo);
      }
    }
  }
};

export {
  Eventer,
  DbValue,
  DbSet
};
