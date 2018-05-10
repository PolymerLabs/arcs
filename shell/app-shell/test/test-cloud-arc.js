import {MockDb} from './mock-db.js';
import '../elements/cloud-data/cloud-arc.js';

const assert = chai.assert;
const expect = chai.expect;
const Firebase = window.Firebase;

let cloudArc;

describe('CloudArc', function() {
  beforeEach(() => {
    Firebase.db = new MockDb();
    cloudArc = document.createElement('cloud-arc');
    // TODO(sjmiles): attempt to initialize elements without
    // actually atttaching them to DOM
    cloudArc._mount();
    //assert.equal(window.Firebase.db, Firebase.db);
    assert.equal(Firebase.db, cloudArc._state.db);
  });
  it('can be tested', () => {
    assert(cloudArc);
  });
  it(`given key='*', generates a new meta arc`, function(done) {
    Firebase.db.push = ({metadata}) => {
      expect(metadata).to.have.property('description');
      expect(metadata).to.have.property('color');
      expect(metadata).to.have.property('bg');
      expect(metadata).to.have.property('externalManifest');
      console.log(metadata);
      return {key: 'KEY'};
    };
    const listener = cloudArc.addEventListener('key', e => {
      cloudArc.removeEventListener('key', listener);
      assert.equal(e.detail, 'KEY');
      done();
    });
    cloudArc.key = '*';
  });
  it(`given a key, watches arcs/[key]/metadata and arcs/[key]/serialization`, done => {
    let count = 0;
    let path = '';
    Firebase.db.child = _path => {
      path = _path;
      return Firebase.db;
    };
    const paths = ['arcs/KEY/metadata', 'arcs/KEY/serialization'];
    let error;
    Firebase.db.on = (name, callback) => {
      try {
        assert.equal(paths[count++], path);
        if (count == paths.length && !error) {
          done();
        }
      } catch (x) {
        done(error = x);
      }
    };
    cloudArc.key = 'KEY';
  });
  it(`given metadata, updates db`, function(done) {
    Firebase.db.update = metadata => {
      try {
        assert.deepEqual(metadata, cloudArc.metadata);
        done();
      } catch (x) {
        done(x);
      }
    };
    cloudArc.key = 'key';
    cloudArc.metadata = {fake: true};
  });
});
