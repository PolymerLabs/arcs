class MockDb {
  child(path) {
    this.lastPath = path;
    return this;
  }
  ref(path) {
    this.lastRef = path;
    return this;
  }
  push() {
    return {key: 'KEY'};
  }
  on() {}
  once() {}
  set() {}
  store() {}
  update() {}
}

export {
  MockDb
};
