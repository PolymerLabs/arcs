/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

 import {Flags} from './flags.js';
import {UnifiedStore} from './storageNG/unified-store.js';
import {InterfaceType} from './type.js';
import {StorageKey} from './storageNG/storage-key.js';
import {KeyBase} from './storage/key-base.js';
import {StorageProviderBase} from './storage/storage-provider-base.js';
import {ParticleSpec} from './particle-spec.js';
import {Recipe} from './recipe/recipe.js';
import {StorageProviderFactory} from './storage/storage-provider-factory.js';
import {Manifest} from './manifest.js';
import {Id} from './id.js';
import {VolatileMemory, VolatileStorageKey} from './storageNG/drivers/volatile.js';

/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export interface ArcInterface {
  activeRecipe: Recipe;
  storageProviderFactory: StorageProviderFactory;
  id: Id;
  storeTags: Map<UnifiedStore, Set<string>>;
  context: Manifest;
  _stores: UnifiedStore[];
  storageKey?: string | StorageKey;
  volatileMemory: VolatileMemory;
}

export class ArcSerializer {
  private arc: ArcInterface;

  private handles = '';
  private resources = '';
  private interfaces = '';
  private dataResources = new Map<string, string>();
  private memoryResourceNames = new Map<string, string>();

  constructor(arc: ArcInterface) {
    this.arc = arc;
  }

  async serialize(): Promise<string> {
    return `
meta
  name: '${this.arc.id}'
  ${this.serializeStorageKey()}

${await this.serializeVolatileMemory()}

${await this.serializeHandles()}

${this.serializeParticles()}

@active
${this.arc.activeRecipe.toString()}`;
  }

  private async serializeVolatileMemory(): Promise<string> {
    let resourceNum = 0;
    let serialization = '';
    const indent = '  ';
    if (Flags.useNewStorageStack) {
      for (const [key, value] of this.arc.volatileMemory.entries.entries()) {
        this.memoryResourceNames.set(key, `VolatileMemoryResource${resourceNum}`);
        const data = {root: value.root.data, locations: {}};
        for (const [key, entry] of Object.entries(value.locations)) {
          data.locations[key] = entry.data;
        }
        serialization +=
          `resource VolatileMemoryResource${resourceNum++} // ${key}\n` +
          indent + 'start\n' +
          JSON.stringify(data).split('\n').map(line => indent + line).join('\n') + '\n';
      }

      return serialization;
    } else {
      return '';
    }
  }

  private async _serializeStore(store: UnifiedStore, name: string): Promise<void> {
    const type = store.type.getContainedType() || store.type;
    if (type instanceof InterfaceType) {
      this.interfaces += type.interfaceInfo.toString() + '\n';
    }
    let key: StorageKey | KeyBase;
    if (typeof store.storageKey === 'string') {
      key = this.arc.storageProviderFactory.parseStringAsKey(store.storageKey);
    } else {
      key = store.storageKey;
    }
    const tags: Set<string> = this.arc.storeTags.get(store) || new Set();
    const handleTags = [...tags];

    const actualHandle = this.arc.activeRecipe.findHandle(store.id);
    const originalId = actualHandle ? actualHandle.originalId : null;
    let combinedId = `'${store.id}'`;
    if (originalId) {
      combinedId += `!!'${originalId}'`;
    }

    switch (key.protocol) {
      case 'reference-mode':
      case 'firebase':
      case 'pouchdb':
        this.handles += store.toManifestString({handleTags, overrides: {name}}) + '\n';
        break;
      case 'volatile':
        if (Flags.useNewStorageStack) {
          const storageKey = store.storageKey as VolatileStorageKey;
          this.handles += store.toManifestString({handleTags, overrides: {name, source: this.memoryResourceNames.get(storageKey.unique), origin: 'resource', includeKey: storageKey.toString()}}) + '\n';
        } else {
          // TODO(sjmiles): emit empty data for stores marked `volatile`: shell will supply data
          const volatile = handleTags.includes('volatile');
          let serializedData: {storageKey: string}[] | null = [];
          if (!volatile) {
            // TODO: include keys in serialized [big]collections?
            const activeStore = await store.activate();
            const model = await activeStore.serializeContents();
            serializedData = model.model.map((model) => {
              const {id, value} = model;
              const index = model['index']; // TODO: Invalid Type

              if (value == null) {
                return null;
              }

              let result;
              if (value.rawData) {
                result = {$id: id};
                for (const field of Object.keys(value.rawData)) {
                  result[field] = value.rawData[field];
                }
              } else {
                result = value;
              }
              if (index !== undefined) {
                result.$index = index;
              }
              return result;
            });
          }

          if (store.referenceMode && serializedData.length > 0) {
            const storageKey = serializedData[0].storageKey;
            if (!this.dataResources.has(storageKey)) {
              const storeId = `${name}_Data`;
              this.dataResources.set(storageKey, storeId);
              // TODO: can't just reach into the store for the backing Store like this, should be an
              // accessor that loads-on-demand in the storage objects.
              if (store instanceof StorageProviderBase) {
                await store.ensureBackingStore();
                await this._serializeStore(store.backingStore, storeId);
              }
            }
            const storeId = this.dataResources.get(storageKey);
            serializedData.forEach(a => {a.storageKey = storeId;});
          }

          const indent = '  ';
          const data = JSON.stringify(serializedData);
          const resourceName = `${name}Resource`;

          this.resources += `resource ${resourceName}\n`
            + indent + 'start\n'
            + data.split('\n').map(line => indent + line).join('\n')
            + '\n';

          this.handles += store.toManifestString({handleTags, overrides: {name, source: resourceName, origin: 'resource'}}) + '\n';
        }
        break;
      default:
        throw new Error(`unknown storageKey protocol ${key.protocol}`);
    }
  }

  private async serializeHandles(): Promise<string> {
    let id = 0;
    const importSet: Set<string> = new Set();
    const handlesToSerialize: Set<string> = new Set();
    const contextSet = new Set(this.arc.context.stores.map(store => store.id));
    for (const handle of this.arc.activeRecipe.handles) {
      if (handle.fate === 'map') {
        importSet.add(this.arc.context.findManifestUrlForHandleId(handle.id));
      } else {
        // Immediate value handles have values inlined in the recipe and are not serialized.
        if (handle.immediateValue) continue;

        handlesToSerialize.add(handle.id);
      }
    }
    for (const url of importSet.values()) {
      this.resources += `import '${url}'\n`;
    }

    for (const store of this.arc._stores) {

      if (Flags.useNewStorageStack || (handlesToSerialize.has(store.id) && !contextSet.has(store.id))) {
        await this._serializeStore(store, `Store${id++}`);
      }
    }

    return this.resources + this.interfaces + this.handles;
  }

  private serializeParticles(): string {
    const particleSpecs = <ParticleSpec[]>[];
    // Particles used directly.
    particleSpecs.push(...this.arc.activeRecipe.particles.map(entry => entry.spec));
    // Particles referenced in an immediate mode.
    particleSpecs.push(...this.arc.activeRecipe.handles
        .filter(h => h.immediateValue)
        .map(h => h.immediateValue));

    const results: string[] = [];
    particleSpecs.forEach(spec => {
      for (const connection of spec.handleConnections) {
        if (connection.type instanceof InterfaceType) {
          results.push(connection.type.interfaceInfo.toString());
        }
      }
      results.push(spec.toString());
    });
    return results.join('\n');
  }

  private serializeStorageKey(): string {
    if (this.arc.storageKey) {
      return `storageKey: '${this.arc.storageKey}'\n`;
    }
    return '';
  }
}
