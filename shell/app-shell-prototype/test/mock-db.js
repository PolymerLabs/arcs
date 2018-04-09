// TODO(sjmiles): using db off window is bad news
const nop = () => {};
const db = {
  child: (path) => {
    db.lastPath = path;
    return db;
  },
  ref: (path) => {
    db.lastRef = path;
    return db;
  },
  on: (name, callback) => {
  },
  once: nop,
  set: nop,
  store: nop,
  push: () => ({key: 'KEY'})
};
window.db = db;

export default db;
