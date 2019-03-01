import {now} from '../../build/platform/date-web.js';
//import {generateId} from '../../modalities/dom/components/generate-id.js';
import {RamSlotComposer} from '../lib/ram-slot-composer.js';
import {Utils} from '../lib/utils.js';
import {ArcHost} from '../lib/arc-host.js';
import {Stores} from '../lib/stores.js';
import {Schemas} from './schemas.js';

export const Context = class {
  constructor(storage) {
    this.initContext(storage);
  }
  async initContext(storage) {
    this.context = await Utils.parse('');
    await this.initAddressStore(this.context);
    await this.initPipesArc(storage);
  }
  async initAddressStore(context) {
    const store = await Stores.create(context, {
      name: 'pipe-entities',
      id: 'pipe-entities',
      schema: Schemas.PipeEntity,
      isCollection: true,
      tags: null,
      storageKey: null
    });
    this.contextEntityStore = store;
    //console.log(store);
  }
  async initPipesArc(storage) {
    console.log('Context::initPipesArc');
    const id = 'pipes-arc';
    const manifest = `import 'https://$particles/PipeApps/BackgroundPipes.recipes'`;
    const composer = new RamSlotComposer();
    const host = new ArcHost(null, storage, composer);
    this.pipesArc = await host.spawn({id, manifest});
    // TODO(sjmiles): findById would be better,
    // but I can't get the id to materialize via manifest
    this.entityStore = this.pipesArc._stores[0];
    if (this.entityStore) {
      await this.entityStoreChange(await this.getInitialChange(this.entityStore));
      this.entityStore.on('change', info => this.entityStoreChange(info), this);
    } else {
      console.log('Context::initPipesArc: failed to find entityStore');
    }
    dumpStores([this.entityStore]);
  }
  async getInitialChange(store) {
    const change = {add: []};
    const values = await store.toList();
    values.forEach(value => change.add.push({value}));
    return change;
  }
  async entityStoreChange(change) {
    console.log(change);
    await this.cloneStoreChange(change, this.contextEntityStore);
    dumpStores([this.contextEntityStore]);
  }
  async cloneStoreChange(change, store) {
    if (store && change.add) {
      await Promise.all(change.add.map(async add => {
        await store.store(add.value, [now()/*generateId()*/]);
      }));
    }
  }
};

const dumpStores = async stores => {
  //console.log(`stores dump, length = ${stores.length}`);
  await Promise.all(stores.map(async (store, i) => {
    if (store) {
      const accessor = store.type.isCollection ? 'toList' : 'get';
      const value = await store[accessor]();
      console.log(`store #${i}:`, store.id, value);
    }
  }));
};
