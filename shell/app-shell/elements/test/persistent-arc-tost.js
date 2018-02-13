// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

var assert = chai.assert;

afterEach(function() {
  target.innerHTML = '';
  db.reset();
});

describe('PersistentArc', function() {
  class TestPersistentArc extends PersistentArc {
    constructor(element) {
      super(element);
      this._searchParams = new URLSearchParams(document.location.search);
    }

    _getSearchParams() {
      return this._searchParams;
    }

    setSearchParam(key, value) {
      this._searchParams.set(key, value);
    }
  }

  customElements.define('test-persistent-arc', TestPersistentArc);

  describe('#update', function() {
    function createTestArc() {
      const arc = document.createElement('test-persistent-arc');
      target.appendChild(arc);

      // Create the arc's database key.
      const props = { key: '*' };
      const state = { db: db, watch: {} };
      const lastProps = {};
      arc._update(props, state, lastProps);

      return arc;
    }

    it('should incorporate an external manifest specified via solo', function() {
      const arc = createTestArc();
      const soloPath = 'http://www.foo.com/solo.recipes';
      arc.setSearchParam('solo', soloPath);

      const state = arc._state;
      const props = { key: state.key, metadata: {} };
      assert.isUndefined(
        state.db.child(state.key).child('metadata').lastUpdate
      );
      arc._update(props, state, {});
      assert.equal(
        state.db.child(state.key).child('metadata').lastUpdate.externalManifest,
        soloPath
      );
    });

    it('should incorporate an external manifest specified via manifest', function() {
      const arc = createTestArc();
      const manifestPath = 'http://www.foo.com/manifest.recipes';
      arc.setSearchParam('manifest', manifestPath);

      const state = arc._state;
      const props = { key: state.key, metadata: {} };
      assert.isUndefined(
        state.db.child(state.key).child('metadata').lastUpdate
      );
      arc._update(props, state, {});
      assert.equal(
        state.db.child(state.key).child('metadata').lastUpdate.externalManifest,
        manifestPath
      );
    });

    it('should incorporate an external manifest prioritizing solo over manifest param', function() {
      const arc = createTestArc();
      const soloPath = 'http://www.foo.com/solo.recipes';
      arc.setSearchParam('solo', soloPath);
      const manifestPath = 'http://www.foo.com/manifest.recipes';
      arc.setSearchParam('manifest', manifestPath);

      const state = arc._state;
      const props = { key: state.key, metadata: {} };
      assert.isUndefined(
        state.db.child(state.key).child('metadata').lastUpdate
      );
      arc._update(props, state, {});
      assert.equal(
        state.db.child(state.key).child('metadata').lastUpdate.externalManifest,
        soloPath
      );
    });

    it('should set a null external manifest when there is no solo or manifest param', function() {
      const arc = createTestArc();

      const state = arc._state;
      const props = { key: state.key, metadata: {} };
      assert.isUndefined(
        state.db.child(state.key).child('metadata').lastUpdate
      );
      arc._update(props, state, {});
      assert.isNull(
        state.db.child(state.key).child('metadata').lastUpdate.externalManifest
      );
    });
  });
});
