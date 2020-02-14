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
import {ArcId} from '../id.js';
import {CapabilitiesResolver, StorageKeyOptions} from '../capabilities-resolver.js';
import {Capabilities} from '../capabilities.js';
import {RamDiskStorageDriverProvider, RamDiskStorageKey} from '../storageNG/drivers/ramdisk.js';
import {TestVolatileMemoryProvider} from '../testing/test-volatile-memory-provider.js';
import {VolatileStorageKey} from '../storageNG/drivers/volatile.js';
import {DriverFactory} from '../storageNG/drivers/driver-factory.js';
import {Runtime} from '../runtime.js';
import {MockFirebaseStorageDriverProvider} from '../storageNG/testing/mock-firebase.js';

describe('Capabilities Resolver', () => {
  it('creates storage keys', () => {
    const resolver1 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    assert.isTrue(resolver1.createStorageKey(Capabilities.tiedToArc) instanceof VolatileStorageKey);
    assert.throws(() => resolver1.createStorageKey(Capabilities.tiedToRuntime));
    assert.throws(() => resolver1.createStorageKey(Capabilities.persistent));
    
    const resolver2 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')},
        new Map([
            [RamDiskStorageKey.protocol, {
                capabilities: Capabilities.tiedToRuntime,
                create: ({arcId}: StorageKeyOptions) => new RamDiskStorageKey(arcId.toString())
    }]]));
    assert.throws(() => resolver2.createStorageKey(Capabilities.tiedToArc));
    assert.isTrue(resolver2.createStorageKey(Capabilities.tiedToRuntime) instanceof RamDiskStorageKey);

    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const resolver3 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    assert.isTrue(resolver3.createStorageKey(Capabilities.tiedToArc) instanceof VolatileStorageKey);
    assert.isTrue(resolver3.createStorageKey(Capabilities.tiedToRuntime) instanceof RamDiskStorageKey);

    CapabilitiesResolver.reset();
    const resolver4 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    assert.isTrue(resolver4.createStorageKey(Capabilities.tiedToArc) instanceof VolatileStorageKey);
    assert.throws(() => resolver4.createStorageKey(Capabilities.tiedToRuntime));
  });

  it('fails for unsupported capabilities', () => {
    const capabilitiesResolver = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    assert.throws(
        () => capabilitiesResolver.createStorageKey(Capabilities.tiedToRuntime));

    assert.throws(() => capabilitiesResolver.createStorageKey(
        new Capabilities(['persistent', 'tied-to-arc'])));
  });

  it('verifies static creators', () => {
    assert.equal(CapabilitiesResolver.getDefaultCreators().size, 1);
    assert.isTrue(
        CapabilitiesResolver.getDefaultCreators().has(VolatileStorageKey.protocol));
  });

  it('finds storage key protocols for capabilities', () => {
    const resolver1 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    assert.sameMembers([...resolver1.findStorageKeyProtocols(Capabilities.tiedToArc)], ['volatile']);
    assert.equal(resolver1.findStorageKeyProtocols(Capabilities.tiedToRuntime).size, 0);
    assert.equal(resolver1.findStorageKeyProtocols(Capabilities.persistent).size, 0);

    DriverFactory.clearRegistrationsForTesting();
    const memoryProvider = new TestVolatileMemoryProvider();
    RamDiskStorageDriverProvider.register(memoryProvider);
    const runtime = new Runtime();
    MockFirebaseStorageDriverProvider.register(runtime.getCacheService());

    const resolver2 = new CapabilitiesResolver({arcId: ArcId.newForTest('test')});
    assert.sameMembers([...resolver2.findStorageKeyProtocols(Capabilities.tiedToArc)], ['volatile']);
    assert.sameMembers([...resolver2.findStorageKeyProtocols(Capabilities.tiedToRuntime)], ['ramdisk']);
    assert.sameMembers([...resolver2.findStorageKeyProtocols(Capabilities.persistent)], ['firebase']);
  });
});
