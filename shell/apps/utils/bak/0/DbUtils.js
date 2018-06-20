import Firebase from '../common/firebase-config.js';

const Eventer = class {
  constructor(cb) {
    this.cb = cb;
  }
  _fire(type, detail) {
    if (this.cb) {
      this.cb({type, detail, sender: this});
    }
  }
};

const DbValue = class extends Eventer {
  constructor(path, cb) {
    super(cb);
    this._attach(Firebase.db.child(path));
  }
  _attach(db) {
    let started;
    const value = db.on('value', snap => {
      this.initialized = true;
      this.value = snap.val();
      this._fire('changed', this.value);
    });
    this._detach = () => {
      db.off('value', value);
    };
  }
};

const DbSet = class extends Eventer {
  constructor(path, cb) {
    super(cb);
    this.set = {};
    this._attach(Firebase.db.child(path));
  }
  _attach(db) {
    let started;
    const added = db.on('child_added', (snap, prevKey) => {
      if (!this.set[snap.key]) {
        this.set[snap.key] = snap.val();
      }
      this._fire('added', snap.key)
    });
    const changed = db.on('child_changed', (snap, prevKey) => {
      this.set[snap.key] = snap.val();
      console.log('changed', snap.key);
      this._fire('changed', snap.key)
    });
    const removed = db.on('child_removed', snap => {
      this.set[snap.key] = null;
      console.log('removed', snap.key);
      this._fire('removed', snap.key)
    });
    this._detach = () => {
      db.off('child_added', added);
      db.off('child_changed', changed);
      db.off('child_removed', removed);
    };
    db.once('value', snap => {
      this.initialized = true;
      this.set = snap.val();
      this._fire('initial', this.set);
    });
  }
};

export {
  Eventer,
  DbValue,
  DbSet
};
