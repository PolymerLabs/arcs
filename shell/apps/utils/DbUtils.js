import Firebase from '../common/firebase-config.js';

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
    // TODO(sjmiles): force Firebase to be async so we can capture the value of this
    // object before it's starts firing events
    //setTimeout(() => {
      try {
        this._attach(Firebase.db.child(path));
      } catch (x) {
        //
      }
    //}, 0);
  }
  dispose() {
    this._detach && this._detach();
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
  constructor(path, listener, set) {
    super(listener);
    this.path = path;
    this.set = set;
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
    const added = db.on('child_added', (snap, prevKey) => {
      this.set[snap.key] = snap.val();
      //console.log('FireBase: child-added', snap.key);
      this._fire('added', snap.key);
    });
    const changed = db.on('child_changed', (snap, prevKey) => {
      this.set[snap.key] = snap.val();
      console.log('FireBase: child-changed', snap.key);
      this._fire('changed', snap.key);
    });
    const removed = db.on('child_removed', snap => {
      this.set[snap.key] = null;
      console.log('FireBase: child-removed', snap.key);
      this._fire('removed', snap.key);
    });
    this._detach = () => {
      db.off('child_added', added);
      db.off('child_changed', changed);
      db.off('child_removed', removed);
    };
    db.once('value', snap => {
      this.initialized = true;
      Object.assign(this.set, snap.val());
      this._fire('initial', this.set);
    });
  }
};

export {
  Eventer,
  DbValue,
  DbSet
};
