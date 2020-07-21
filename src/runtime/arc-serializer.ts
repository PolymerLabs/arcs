/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {AbstractStore} from './storage/abstract-store.js';
import {InterfaceType} from './type.js';
import {StorageKey} from './storage/storage-key.js';
import {ParticleSpec} from './particle-spec.js';
import {Recipe} from './recipe/recipe.js';
import {Manifest} from './manifest.js';
import {Id} from './id.js';
import {VolatileMemory, VolatileStorageKey} from './storage/drivers/volatile.js';
import {ManifestStringBuilder} from './manifest-string-builder.js';
import {StoreContext} from './storage/store-context.js';

export interface ArcInterface extends StoreContext {
  activeRecipe: Recipe;
  id: Id;
  storeTags: Map<AbstractStore, Set<string>>;
  context: Manifest;
  _stores: AbstractStore[];
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
    const builder = new ManifestStringBuilder();

    for (const [key, value] of this.arc.volatileMemory.entries.entries()) {
      this.memoryResourceNames.set(key, `VolatileMemoryResource${resourceNum}`);
      const data = {root: value.root.data, locations: {}};
      for (const [key, entry] of Object.entries(value.locations)) {
        data.locations[key] = entry.data;
      }
      builder.push(`resource VolatileMemoryResource${resourceNum++} // ${key}`);
      builder.withIndent().push(
        'start',
        ...JSON.stringify(data).split('\n'));
    }

    return builder.toString();
  }

  private async _serializeStore(store: AbstractStore, name: string): Promise<void> {
    const type = store.type.getContainedType() || store.type;
    if (type instanceof InterfaceType) {
      this.interfaces += type.interfaceInfo.toManifestString() + '\n';
    }
    const key = store.storageKey;
    const tags: Set<string> = this.arc.storeTags.get(store) || new Set();
    const handleTags = [...tags];

    // TODO: handle ramdisk stores correctly?
    switch (key.protocol) {
      case 'reference-mode':
      case 'ramdisk':
      case 'firebase':
      case 'pouchdb':
        this.handles += store.toManifestString({handleTags, overrides: {name}}) + '\n';
        break;
      case 'volatile': {
        const storageKey = key as VolatileStorageKey;
        this.handles += store.toManifestString({handleTags, overrides: {name, source: this.memoryResourceNames.get(storageKey.unique), origin: 'resource', includeKey: storageKey.toString()}}) + '\n';
        break;
      }
      default:
        throw new Error(`unknown storageKey protocol ${key.protocol}`);
    }
  }

  private async serializeHandles(): Promise<string> {
    let id = 0;
    const handlesToSkip: Set<string> = new Set();

    for (const handle of this.arc.activeRecipe.handles) {
      if (handle.fate === 'map') {
        const url = this.arc.context.findManifestUrlForHandleId(handle.id);
        this.resources += `import '${url}'\n`;
      } else if (handle.immediateValue) {
        // Immediate value handles have values inlined in the recipe and are not serialized.
        handlesToSkip.add(handle.id);
      }
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
          results.push(connection.type.interfaceInfo.toManifestString());
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
