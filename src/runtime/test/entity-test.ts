import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../manifest.js';
import {Entity, MutableEntityData} from '../entity.js';

describe('Entity', () => {
  describe('mutability', () => {

    let entityClass;

    before(async () => {
      const manifest = await Manifest.parse(`
        schema Foo
          Text bar
      `);
      entityClass = manifest.findSchemaByName('Foo').entityClass();
    });

    function newFooEntity(bar) {
      return new entityClass({bar});
    }

    it('is mutable by default', () => {
      const entity = newFooEntity('abc');
      assert.isTrue(entity.mutable);
      assert.equal(entity.bar, 'abc');
    });

    it('allows mutations via the mutate method with a callback function', () => {
      const entity = newFooEntity('abc');

      entity.mutate(e => {
        e.bar = 'xyz';
      });
      assert.equal(entity.bar, 'xyz');
    });

    it('allows mutations via the mutate method with new data', () => {
      const entity = newFooEntity('abc');

      entity.mutate({bar: 'xyz'});
      assert.equal(entity.bar, 'xyz');
    });

    it('forbids mutations via setters', () => {
      const entity = newFooEntity('abc');
      assert.throws(() => {
        entity.bar = 'xyz';
      }, "Tried to modify entity field 'bar'");

      assert.equal(entity.bar, 'abc');
    });

    it('rejects mutations when immutable', () => {
      const entity = newFooEntity('abc');

      entity.mutable = false;
      assert.throws(() => {
        entity.mutate(e => {
          e.bar = 'xyz';
        });
      }, 'Entity is immutable');

      assert.throws(() => {
        entity.mutate({bar: 'xyz'});
      }, 'Entity is immutable');

      assert.equal(entity.bar, 'abc');
    });

    it('stays immutable forever', () => {
      const entity = newFooEntity('abc');
      entity.mutable = false;
      assert.throws(() => {
        entity.mutable = true;
      }, 'You cannot make an immutable entity mutable again');
      assert.isFalse(entity.mutable);
    });
  });
});
