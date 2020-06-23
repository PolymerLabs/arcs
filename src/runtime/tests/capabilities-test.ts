/**
 * @license
 * Copyright 2020 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {assertThrowsAsync} from '../../testing/test-util.js';
import {Persistence, PersistenceKind, Ttl, TtlUnits, Capabilities, Encryption, Queryable, CapabilityRange} from '../capabilities.js';
import {Manifest} from '../manifest.js';

describe('Persistence Capability', () => {
  const none = new Persistence();
  const inMemory = Persistence.inMemory();
  const onDisk = Persistence.onDisk();
  const unrestricted = Persistence.unrestricted();

  it('compares persistence capability', () => {
    assert.equal(none.kind, PersistenceKind.None);
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
    assert.isNull(persisence2);
  });

  it('fails initializing from multiple conflicting', async () => {
    const manifestStr = `
        recipe
          h0: create @persistent @tiedToArc @ttl('3d')
    `;
    await assertThrowsAsync(async () => await Manifest.parse(manifestStr));
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
          h3: create @ttl('30 days')
          h4: create @ttl('1 hour')
          h5: create @ttl('15minutes')
    `;
    const recipe = (await Manifest.parse(manifestStr)).recipes[0];
    assert.isTrue(Ttl.fromAnnotations(recipe.handles[0].annotations).isEquivalent(Ttl.minutes(30)));
    assert.isTrue(Ttl.fromAnnotations(recipe.handles[1].annotations).isEquivalent(Ttl.hours(2)));
    assert.isNull(Ttl.fromAnnotations(recipe.handles[2].annotations));
    assert.isTrue(Ttl.fromAnnotations(recipe.handles[3].annotations).isEquivalent(Ttl.days(30)));
    assert.isTrue(Ttl.fromAnnotations(recipe.handles[4].annotations).isEquivalent(Ttl.hours(1)));
    assert.isTrue(Ttl.fromAnnotations(recipe.handles[5].annotations).isEquivalent(Ttl.minutes(15)));
  });

  it('parses ttl from string', () => {
    assert.isTrue(Ttl.fromString('3m').isEquivalent(Ttl.minutes(3)));
    assert.isTrue(Ttl.fromString('3 minutes').isEquivalent(Ttl.minutes(3)));
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

  it('roundtrips to and from literal ttl', () => {
    assert.isTrue(Ttl.infinite().isEquivalent(Ttl.fromLiteral(Ttl.infinite().toLiteral())));
    assert.isTrue(Ttl.days(5).isEquivalent(Ttl.fromLiteral(Ttl.days(5).toLiteral())));
    assert.isTrue(Ttl.zero().isEquivalent(Ttl.fromLiteral(Ttl.zero().toLiteral())));
  });
});

describe('CapabilityRange', () => {
  it('fails creating range with incompatible min and max', () => {
    // different types
    assert.throws(() => new CapabilityRange(Persistence.inMemory(), Ttl.infinite()));
    assert.throws(() => new CapabilityRange(new Encryption(true), Ttl.infinite()));
    // min > max
    assert.throws(() => new CapabilityRange(new Encryption(true), new Encryption(false)));
    assert.throws(() => new CapabilityRange(Ttl.days(1), Ttl.infinite()));
    assert.throws(() => new CapabilityRange(Ttl.hours(1), Ttl.days(1)));
    assert.throws(() => new CapabilityRange(Persistence.inMemory(), Persistence.onDisk()));
  });

  it('compares boolean ranges', () => {
    assert.isTrue(Queryable.any().isEquivalent(Queryable.any()));
    assert.isFalse(Queryable.any().isEquivalent(new Queryable(true)));
    assert.isTrue(Queryable.any().contains(Queryable.any()));
    assert.isTrue(Queryable.any().contains(new Queryable(false)));
    assert.isTrue(Queryable.any().contains(new Queryable(false).toRange()));
    assert.isTrue(Queryable.any().contains(new Queryable(true)));
    assert.isTrue(Queryable.any().contains(new Queryable(true).toRange()));
  });

  it('compares ttl ranges', () => {
    assert.isTrue(Ttl.any().isEquivalent(Ttl.any()));
    assert.isFalse(Ttl.any().isEquivalent(Ttl.infinite()));
    assert.isTrue(Ttl.infinite().toRange().isEquivalent(Ttl.infinite()));
    assert.isTrue(new CapabilityRange(Ttl.hours(10), Ttl.hours(3)).contains(
                  new CapabilityRange(Ttl.hours(10), Ttl.hours(3))));
    assert.isTrue(new CapabilityRange(Ttl.hours(10), Ttl.hours(3)).contains(
                  new CapabilityRange(Ttl.hours(8), Ttl.hours(6))));
    assert.isFalse(new CapabilityRange(Ttl.hours(10), Ttl.hours(3)).contains(
                   new CapabilityRange(Ttl.hours(8), Ttl.hours(2))));
    assert.isTrue(new CapabilityRange(Ttl.infinite(), Ttl.hours(3)).contains(
                  new CapabilityRange(Ttl.hours(8), Ttl.hours(3))));
    assert.isTrue(Ttl.any().contains(Ttl.infinite()));
    assert.isTrue(Ttl.any().contains(new CapabilityRange(Ttl.infinite(), Ttl.hours(3))));
    assert.isTrue(Ttl.any().contains(new CapabilityRange(Ttl.hours(3), Ttl.zero())));
  });

  it('compares persistence ranges', () => {
    assert.isTrue(Persistence.any().isEquivalent(Persistence.any()));
    assert.isFalse(Persistence.any().isEquivalent(Persistence.unrestricted()));
    assert.isTrue(Persistence.unrestricted().toRange().isEquivalent(Persistence.unrestricted()));
    assert.isTrue(Persistence.onDisk().toRange().isEquivalent(Persistence.onDisk().toRange()));

    assert.isTrue(Persistence.onDisk().toRange().contains(Persistence.onDisk().toRange()));
    assert.isTrue(new CapabilityRange(Persistence.onDisk(), Persistence.inMemory()).contains(
                  Persistence.onDisk()));
    assert.isTrue(new CapabilityRange(Persistence.onDisk(), Persistence.inMemory()).contains(
                  Persistence.inMemory().toRange()));
    assert.isFalse(new CapabilityRange(Persistence.onDisk(), Persistence.inMemory()).contains(
                   Persistence.unrestricted()));
    assert.isFalse(new CapabilityRange(Persistence.onDisk(), Persistence.inMemory()).contains(
                   Persistence.any()));
    assert.isTrue(Persistence.any().contains(Persistence.onDisk()));
    assert.isTrue(Persistence.any().contains(Persistence.onDisk().toRange()));
    assert.isTrue(Persistence.any().contains(new CapabilityRange(Persistence.onDisk(), Persistence.inMemory())));
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
    assert.isUndefined(capabilities0.getPersistence());
    assert.isUndefined(capabilities0.getTtl());
    assert.isUndefined(capabilities0.isEncrypted());
    assert.isUndefined(capabilities0.isQueryable());

    const capabilities1 = Capabilities.fromAnnotations(recipe.handles[1].annotations);
    assert.isUndefined(capabilities1.getPersistence());
    assert.isTrue(capabilities1.getTtl().isEquivalent(Ttl.hours(2)));
    assert.isUndefined(capabilities1.isEncrypted());
    assert.isUndefined(capabilities1.isQueryable());

    const capabilities2 = Capabilities.fromAnnotations(recipe.handles[2].annotations);
    assert.isTrue(capabilities2.getPersistence().isEquivalent(Persistence.onDisk()));
    assert.isTrue(capabilities2.hasEquivalent(Persistence.onDisk()));
    assert.isUndefined(capabilities2.getTtl());
    assert.isUndefined(capabilities2.isEncrypted());
    assert.isUndefined(capabilities2.isQueryable());

    const capabilities3 = Capabilities.fromAnnotations(recipe.handles[3].annotations);
    assert.isTrue(capabilities3.hasEquivalent(Persistence.onDisk()));
    assert.isTrue(capabilities3.getTtl().isEquivalent(Ttl.minutes(30)));
    assert.isUndefined(capabilities3.isEncrypted());
    assert.isUndefined(capabilities3.isQueryable());

    const capabilities4 = Capabilities.fromAnnotations(recipe.handles[4].annotations);
    assert.isTrue(capabilities4.hasEquivalent(Persistence.onDisk()));
    assert.isTrue(capabilities4.getTtl().isEquivalent(Ttl.minutes(30)));
    assert.isTrue(capabilities4.isEncrypted());
    assert.isUndefined(capabilities4.isQueryable());

    const capabilities5 = Capabilities.fromAnnotations(recipe.handles[5].annotations);
    assert.isUndefined(capabilities5.getPersistence());
    assert.isTrue(capabilities5.getTtl().isEquivalent(Ttl.minutes(30)));
    assert.isUndefined(capabilities5.isEncrypted());
    assert.isTrue(capabilities5.isQueryable());

    const capabilities6 = Capabilities.fromAnnotations(recipe.handles[6].annotations);
    assert.isTrue(capabilities6.hasEquivalent(Persistence.onDisk()));
    assert.isTrue(capabilities6.contains(Persistence.onDisk()));
    assert.isTrue(capabilities6.getTtl().isEquivalent(Ttl.minutes(30)));
    assert.isTrue(capabilities6.contains(Ttl.minutes(30)));
    assert.isTrue(capabilities6.isEncrypted());
    assert.isTrue(capabilities6.isQueryable());
  });
  // TODO: add tests for contains and hasEquivalent
});
