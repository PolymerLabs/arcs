/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {Persistence, PersistenceType, Ttl, TtlUnits, Capabilities} from '../capabilities-new.js';
import {Manifest} from '../manifest.js';

describe('Persistence Capability', () => {
  const none = new Persistence();
  const inMemory = Persistence.inMemory();
  const onDisk = Persistence.onDisk();
  const unrestricted = Persistence.unrestricted();

  it('compares persistence capability', () => {
    assert.equal(none.type, PersistenceType.None);
    assert.isTrue(none.isEquivalent(Persistence.none()));
    assert.isTrue(none.isSameOrLessStrict(Persistence.none()));
    assert.isTrue(none.isSameOrStricter(Persistence.none()));
    assert.isFalse(none.isLessStrict(Persistence.none()));
    assert.isFalse(none.isStricter(Persistence.none()));

    assert.isFalse(onDisk.isEquivalent(none));
    assert.isTrue(onDisk.isSameOrLessStrict(none));
    assert.isTrue(onDisk.isLessStrict(none));
    assert.isFalse(onDisk.isSameOrStricter(none));
    assert.isFalse(onDisk.isStricter(none));
    assert.isFalse(none.isLessStrict(onDisk));

    assert.isFalse(onDisk.isEquivalent(inMemory));
    assert.isTrue(onDisk.isSameOrLessStrict(inMemory));
    assert.isTrue(onDisk.isLessStrict(inMemory));
    assert.isFalse(onDisk.isSameOrStricter(inMemory));
    assert.isFalse(onDisk.isStricter(inMemory));
    assert.isFalse(inMemory.isLessStrict(onDisk));
    assert.isFalse(inMemory.isSameOrLessStrict(onDisk));

    assert.isFalse(onDisk.isEquivalent(unrestricted));
    assert.isFalse(onDisk.isSameOrLessStrict(unrestricted));
    assert.isFalse(onDisk.isLessStrict(unrestricted));
    assert.isTrue(onDisk.isSameOrStricter(unrestricted));
    assert.isTrue(onDisk.isStricter(unrestricted));
    assert.isTrue(unrestricted.isLessStrict(onDisk));
  });

  it('sets more or less strict', () => {
    const persisence = new Persistence();

    persisence.setMostRestrictive(onDisk);
    assert.isTrue(persisence.isEquivalent(none));

    persisence.setMostRestrictive(inMemory);
    assert.isTrue(persisence.isEquivalent(none));

    persisence.setLeastRestrictive(onDisk);
    assert.isTrue(persisence.isEquivalent(onDisk));

    persisence.setMostRestrictive(inMemory);
    assert.isTrue(persisence.isEquivalent(inMemory));

    persisence.setLeastRestrictive(unrestricted);
    assert.isTrue(persisence.isEquivalent(unrestricted));

    persisence.setMostRestrictive(onDisk);
    assert.isTrue(persisence.isEquivalent(onDisk));
  });

  it('initializes from annotations', async () => {
    const manifestStr = `
        recipe
          h0: create @persistent @ttl('3d')
          h1: create @tiedToArc
          h2: create
    `;
    const recipe = (await Manifest.parse(manifestStr)).recipes[0];
    const handle0 = recipe.handles[0];
    const persisence0 = Persistence.fromAnnotations(handle0.annotations);
    assert.isTrue(persisence0.isEquivalent(onDisk));

    const handle1 = recipe.handles[1];
    const persisence1 = Persistence.fromAnnotations(handle1.annotations);
    assert.isTrue(persisence1.isEquivalent(inMemory));

    const handle2 = recipe.handles[2];
    const persisence2 = Persistence.fromAnnotations(handle2.annotations);
    assert.isTrue(persisence2.isEquivalent(unrestricted));
  });

  it('fails initializing from multiple conflicting', async () => {
    const manifestStr = `
        recipe
          h0: create @persistent @tiedToArc @ttl('3d')
    `;
    const handle = (await Manifest.parse(manifestStr)).recipes[0].handles[0];
    assert.throws(() => Persistence.fromAnnotations(handle.annotations));
  });
});

describe('Ttl Capability', () => {
  it('compares ttls', () => {
    const ttl3Days = Ttl.days(3);
    const ttl10Hours = Ttl.hours(10);
    assert.isTrue(ttl3Days.isLessStrict(ttl10Hours));
    assert.isTrue(ttl3Days.isSameOrLessStrict(ttl10Hours));
    assert.isFalse(ttl3Days.isStricter(ttl10Hours));
    assert.isFalse(ttl3Days.isSameOrStricter(ttl10Hours));
    assert.isFalse(ttl3Days.isEquivalent(ttl10Hours));
    assert.isTrue(ttl10Hours.isStricter(ttl3Days));

    assert.isTrue(Ttl.infinite().isEquivalent(Ttl.infinite()));
    assert.isTrue(Ttl.infinite().isSameOrLessStrict(Ttl.infinite()));
    assert.isTrue(Ttl.infinite().isSameOrStricter(Ttl.infinite()));
    assert.isFalse(Ttl.infinite().isStricter(Ttl.infinite()));
    assert.isFalse(Ttl.infinite().isLessStrict(Ttl.infinite()));

    assert.isTrue(ttl3Days.isStricter(Ttl.infinite()));
    assert.isFalse(Ttl.infinite().isStricter(ttl3Days));
    assert.isTrue(Ttl.infinite().isLessStrict(ttl3Days));
    assert.isFalse(ttl3Days.isLessStrict(Ttl.infinite()));
    assert.isFalse(Ttl.infinite().isEquivalent(ttl3Days));
  });

  it('sets more or less strict ttls', () => {
    const ttl = Ttl.infinite();
    const ttl1Day = Ttl.days(1);
    ttl.setLeastRestrictive(ttl1Day);
    assert.isTrue(ttl.isEquivalent(Ttl.infinite()));

    ttl.setMostRestrictive(ttl1Day);
    assert.isTrue(ttl.isEquivalent(ttl1Day));
    assert.isFalse(ttl.isEquivalent(Ttl.infinite()));
  });

  it('initializes from annotations', async () => {
    const manifestStr = `
        recipe
          h0: create @persistent @ttl('30m')
          h1: create @ttl('2h')
          h2: create
    `;
    const recipe = (await Manifest.parse(manifestStr)).recipes[0];
    const ttl0 = Ttl.fromAnnotations(recipe.handles[0].annotations);
    assert.isTrue(ttl0.isEquivalent(Ttl.minutes(30)));
    const ttl1 = Ttl.fromAnnotations(recipe.handles[1].annotations);
    assert.isTrue(ttl1.isEquivalent(Ttl.hours(2)));
    const ttl2 = Ttl.fromAnnotations(recipe.handles[2].annotations);
    assert.isTrue(ttl2.isEquivalent(Ttl.infinite()));
  });
  it('roundtrips ttl', () => {
    const ttl3m = Ttl.fromString('3m');
    assert.equal(ttl3m.count, 3);
    assert.equal(ttl3m.units, TtlUnits.Minutes);
    assert.equal(ttl3m.count, 3);
    assert.equal(ttl3m.units, TtlUnits.Minutes);
    assert.equal(Ttl.days(5).toString(),
                 Ttl.fromString('5d').toString());
  });

  it('calculates ttl', () => {
    const start = new Date();
    const ttl2dStr = '2d';
    const ttl2d = Ttl.fromString(ttl2dStr);
    assert.equal(ttl2d.count, 2);
    assert.equal(ttl2d.units, TtlUnits.Days);
    const exp2d = ttl2d.calculateExpiration(start);
    assert.isTrue(start.getTime() < exp2d.getTime());

    const ttl48hStr = '48h';
    const ttl48h = Ttl.fromString(ttl48hStr);
    assert.equal(ttl48h.count, 48);
    assert.equal(ttl48h.units, TtlUnits.Hours);
    const exp48h = ttl48h.calculateExpiration(start);
    assert.equal(exp2d.getTime(), exp48h.getTime());

    const ttl60mStr = '60m';
    const ttl60m = Ttl.fromString(ttl60mStr);
    assert.equal(ttl60m.count, 60);
    assert.equal(ttl60m.units, TtlUnits.Minutes);
    assert.equal(
      Ttl.fromString('2h').calculateExpiration(start).getTime(),
      ttl60m.calculateExpiration(ttl60m.calculateExpiration(start)).getTime());
  });
});

describe('Capabilities', () => {
  it('initializes from annotations', async () => {
    const manifestStr = `
        recipe
          h0: create
          h1: create @ttl('2h')
          h2: create @persistent
          h3: create @persistent @ttl('30m')
          h4: create @persistent @ttl('30m') @encrypted
          h5: create @queryable @ttl('30m')
          h6: create @queryable @ttl('30m') @encrypted @persistent
    `;
    const recipe = (await Manifest.parse(manifestStr)).recipes[0];
    const capabilities0 = Capabilities.fromAnnotations(recipe.handles[0].annotations);
    assert.isTrue(capabilities0.getPersistence().isEquivalent(Persistence.unrestricted()));
    assert.isTrue(capabilities0.getTtl().isEquivalent(Ttl.infinite()));
    assert.isFalse(capabilities0.isEncrypted());
    assert.isFalse(capabilities0.isQueryable());

    const capabilities1 = Capabilities.fromAnnotations(recipe.handles[1].annotations);
    assert.isTrue(capabilities1.getPersistence().isEquivalent(Persistence.unrestricted()));
    assert.isTrue(capabilities1.getTtl().isEquivalent(Ttl.hours(2)));
    assert.isFalse(capabilities1.isEncrypted());
    assert.isFalse(capabilities1.isQueryable());

    const capabilities2 = Capabilities.fromAnnotations(recipe.handles[2].annotations);
    assert.isTrue(capabilities2.getPersistence().isEquivalent(Persistence.onDisk()));
    assert.isTrue(capabilities2.getTtl().isEquivalent(Ttl.infinite()));
    assert.isFalse(capabilities2.isEncrypted());
    assert.isFalse(capabilities2.isQueryable());

    const capabilities3 = Capabilities.fromAnnotations(recipe.handles[3].annotations);
    assert.isTrue(capabilities3.getPersistence().isEquivalent(Persistence.onDisk()));
    assert.isTrue(capabilities3.getTtl().isEquivalent(Ttl.minutes(30)));
    assert.isFalse(capabilities3.isEncrypted());
    assert.isFalse(capabilities3.isQueryable());

    const capabilities4 = Capabilities.fromAnnotations(recipe.handles[4].annotations);
    assert.isTrue(capabilities4.getPersistence().isEquivalent(Persistence.onDisk()));
    assert.isTrue(capabilities4.getTtl().isEquivalent(Ttl.minutes(30)));
    assert.isTrue(capabilities4.isEncrypted());
    assert.isFalse(capabilities4.isQueryable());

    const capabilities5 = Capabilities.fromAnnotations(recipe.handles[5].annotations);
    assert.isTrue(capabilities5.getPersistence().isEquivalent(Persistence.unrestricted()));
    assert.isTrue(capabilities5.getTtl().isEquivalent(Ttl.minutes(30)));
    assert.isFalse(capabilities5.isEncrypted());
    assert.isTrue(capabilities5.isQueryable());

    const capabilities6 = Capabilities.fromAnnotations(recipe.handles[6].annotations);
    assert.isTrue(capabilities6.getPersistence().isEquivalent(Persistence.onDisk()));
    assert.isTrue(capabilities6.getTtl().isEquivalent(Ttl.minutes(30)));
    assert.isTrue(capabilities6.isEncrypted());
    assert.isTrue(capabilities6.isQueryable());
  });

  async function init() {
    const handles = (await Manifest.parse(`
        recipe
          h0: create @persistent @ttl('1h')
          h1: create @ttl('2h')
          h2: create
          h3: create @ttl('10m')`)).recipes[0].handles;
    return  {
      capabilities0: Capabilities.fromAnnotations(handles[0].annotations),
      capabilities1: Capabilities.fromAnnotations(handles[1].annotations),
      capabilities2: Capabilities.fromAnnotations(handles[2].annotations),
      capabilities3: Capabilities.fromAnnotations(handles[3].annotations)
    };
  }

  it('sets most restrictive', async () => {
    const {capabilities0, capabilities1} = await init();
    // capabilites0 is more restrictive, so remains unchanged.
    assert.isTrue(capabilities0.setMostRestrictive(capabilities1));
    assert.isTrue(capabilities0.getPersistence().isEquivalent(Persistence.onDisk()));
    assert.isTrue(capabilities0.getTtl().isEquivalent(Ttl.hours(1)));
  });

  it('sets least restrictive', async () => {
    const {capabilities0, capabilities1} = await init();
    // capabilites0 is more restrictive, so it is updated to capabilities1
    assert.isTrue(capabilities0.setLeastRestrictive(capabilities1));
    assert.isTrue(capabilities0.getPersistence().isEquivalent(Persistence.unrestricted()));
    assert.isTrue(capabilities0.getTtl().isEquivalent(Ttl.hours(2)));
  });
  it('sets most restrictive with unrestricted capabilities', async () => {
    const {capabilities0, capabilities2} = await init();
    // capabilities2 are unrestricted for anything, capabilities0 remains unchanged
    assert.isTrue(capabilities0.setMostRestrictive(capabilities2));
    assert.isTrue(capabilities0.getPersistence().isEquivalent(Persistence.onDisk()));
    assert.isTrue(capabilities0.getTtl().isEquivalent(Ttl.hours(1)));
  });
  it('sets least restrictive with unrestricted capabilities', async () => {
    const {capabilities0, capabilities2} = await init();
    // capabilities2 are unrestricted, capabilities0 is updated.
    assert.isTrue(capabilities0.setLeastRestrictive(capabilities2));
    assert.isTrue(capabilities0.getPersistence().isEquivalent(Persistence.unrestricted()));
    assert.isTrue(capabilities0.getTtl().isEquivalent(Ttl.infinite()));
  });
  it('fails setting most or least restrictive with incompatible capabilities', async () => {
    const {capabilities0, capabilities3} = await init();
    // capabilities0 is disk, 2hours and capabilities3 is in-memory, 10minutes.
    assert.isFalse(capabilities0.setLeastRestrictive(capabilities3));
    assert.isFalse(capabilities0.setMostRestrictive(capabilities3));
  });
  it('sets most restrictive on none and unrestricted', () => {
    const capabilities0 = Capabilities.none();
    capabilities0.setMostRestrictive(Capabilities.unrestricted());
    assert.isTrue(capabilities0.isEquivalent(Capabilities.none()));

    const capabilities1 = Capabilities.unrestricted();
    capabilities1.setMostRestrictive(Capabilities.none());
    assert.isTrue(capabilities1.isEquivalent(Capabilities.none()));
  });
  it('sets least restrictive on none and unrestricted', () => {
    const capabilities0 = Capabilities.none();
    capabilities0.setLeastRestrictive(Capabilities.unrestricted());
    assert.isTrue(capabilities0.isEquivalent(Capabilities.unrestricted()));

    const capabilities1 = Capabilities.unrestricted();
    capabilities1.setLeastRestrictive(Capabilities.none());
    assert.isTrue(capabilities1.isEquivalent(Capabilities.unrestricted()));
  });
});
