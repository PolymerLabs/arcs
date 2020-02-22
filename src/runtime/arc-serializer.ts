/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {UnifiedStore} from './storageNG/unified-store.js';
import {InterfaceType} from './type.js';
import {StorageKey} from './storageNG/storage-key.js';
import {KeyBase} from './storage/key-base.js';
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
  }

  private async _serializeStore(store: UnifiedStore, name: string): Promise<void> {
    const type = store.type.getContainedType() || store.type;
    if (type instanceof InterfaceType) {
      this.interfaces += type.interfaceInfo.toString() + '\n';
    }
    const key = store.storageKey;
    const tags: Set<string> = this.arc.storeTags.get(store) || new Set();
    const handleTags = [...tags];

    switch (key.protocol) {
      case 'reference-mode':
      case 'firebase':
      case 'pouchdb':
        this.handles += store.toManifestString({handleTags, overrides: {name}}) + '\n';
        break;
      case 'volatile': {
        const storageKey = store.storageKey as VolatileStorageKey;
        this.handles += store.toManifestString({handleTags, overrides: {name, source: this.memoryResourceNames.get(storageKey.unique), origin: 'resource', includeKey: storageKey.toString()}}) + '\n';
        break;
      }
      default:
        throw new Error(`unknown storageKey protocol ${key.protocol}`);
    }
  }

  private async serializeHandles(): Promise<string> {
    let id = 0;
    const importSet: Set<string> = new Set();
    const handlesToSerialize: Set<string> = new Set();
    const handlesToSkip: Set<string> = new Set();

    for (const handle of this.arc.activeRecipe.handles) {
      if (handle.fate === 'map') {
        importSet.add(this.arc.context.findManifestUrlForHandleId(handle.id));
      } else {
        // Immediate value handles have values inlined in the recipe and are not serialized.
        if (handle.immediateValue) {
          handlesToSkip.add(handle.id);
          continue;
        }

        handlesToSerialize.add(handle.id);
      }
    }
    for (const url of importSet.values()) {
      this.resources += `import '${url}'\n`;
    }

    for (const store of this.arc._stores) {
      if (handlesToSkip.has(store.id)) {
        continue;
      }
      await this._serializeStore(store, `Store${id++}`);
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
