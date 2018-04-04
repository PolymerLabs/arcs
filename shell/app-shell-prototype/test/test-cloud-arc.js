import '../elements/cloud-data/cloud-arc.js';

const nop = () => {};

window.db = {
  child: () => window.db,
  ref: () => window.db,
  on: nop,
  once: nop,
  set: nop,
  store: nop,
  push: nop
};

const cloudArc = document.createElement('cloud-arc');

describe('CloudArc', function() {
  describe('#canBeTested', function() {
    it('can be tested', function() {
      assert(cloudArc);
    });
  });
});
