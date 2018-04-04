import db from './mock-db.js';
import '../elements/cloud-data/cloud-arc.js';

const assert = chai.assert;
const expect = chai.expect;

const mockdb = Object.assign({}, db);

let cloudArc;

describe('CloudArc', function() {
  beforeEach(() => {
    cloudArc = document.createElement('cloud-arc');
    // TODO(sjmiles): attempt to initialize elements without
    // actually atttaching them to DOM
    cloudArc._mount();
    Object.assign(db, mockdb);
  });
  it('can be tested', () => {
    assert(cloudArc);
  });
  it(`given key='*', generates a new meta arc`, function(done) {
    db.push = ({metadata}) => {
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
  it(`given a key, watches arcs/[key]/metadata and arcs/[key]/serialized`, done => {
    let count = 0;
    let path = '';
    db.child = _path => {
      path = _path;
      return db;
    };
    const paths = ['arcs/KEY/metadata', 'arcs/KEY/serialized'];
    let error;
    db.on = (name, callback) => {
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
  it(`given metadata, updates db as needed`, function(done) {
    db.update = metadata => {
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
