/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import { Entity } from '../../../../build/runtime/entity.js';
import { CollectionHandle, SingletonHandle } from '../../../../build/runtime/storage/handle.js';
import { Particle } from '../../../../build/runtime/particle.js';
/**
 * Particle that can render and process events.
 */
export class UiParticleBase extends Particle {
    /**
     * Override if necessary, to modify superclass config.
     */
    get config() {
        return {
            handleNames: this.spec.inputs.map(i => i.name),
            // TODO(mmandlis): this.spec needs to be replaced with a particle-spec loaded from
            // .arcs files, instead of .ptcl ones.
            slotNames: this.spec.slandleConnectionNames()
        };
    }
    /**
     * Override to return a template.
     */
    get template() {
        return '';
    }
    /**
     * Override to return false if the Particle isn't ready to `render()`
     */
    shouldRender(...args) {
        return true;
    }
    renderOutput(...args) {
        const renderModel = this.render(...args);
        if (renderModel) {
            this.renderModel(renderModel);
        }
    }
    // This is the default output 'packet', other implementations (modalities) could
    // output other things, or choose different output packets based on hints from 'model'
    renderModel(model) {
        this.output({
            template: this.template,
            model
        });
    }
    /**
     * Override to return a dictionary to map into the template.
     */
    render(...args) {
        return {};
    }
    fireEvent(slotName, { handler, data }) {
        if (this[handler]) {
            this[handler]({ data });
        }
    }
    async setParticleDescription(pattern) {
        if (typeof pattern === 'string') {
            return super.setParticleDescription(pattern);
        }
        if (pattern.template && pattern.model) {
            await super.setDescriptionPattern('_template_', pattern.template);
            await super.setDescriptionPattern('_model_', JSON.stringify(pattern.model));
            return undefined;
        }
        else {
            throw new Error('Description pattern must either be string or have template and model');
        }
    }
    /**
     * Invoke async function `task` with Particle busy-guard.
     */
    // tslint:disable-next-line: no-any
    async await(task) {
        return this.invokeSafely(task, this.onError);
    }
    /**
     * Set a singleton value. Value can be an Entity or a POJO.
     */
    async set(handleName, value) {
        const handle = this._requireHandle(handleName);
        if (!(handle instanceof SingletonHandle)) {
            throw new Error(`Cannot set non-Singleton handle [${handleName}]`);
        }
        if (Array.isArray(value)) {
            throw new Error(`Cannot set an Array to Singleton handle [${handleName}]`);
        }
        return this.await(async (p) => handle.set(this.requireEntity(value, handle.entityClass)));
    }
    /**
     * Add to a collection. Value can be an Entity or a POJO (or an Array of such values).
     */
    async add(handleName, value) {
        const handle = this._requireHandle(handleName);
        if (!(handle instanceof CollectionHandle)) {
            throw new Error(`Cannot add to non-Collection handle [${handleName}]`);
        }
        const entityClass = handle.entityClass;
        const data = Array.isArray(value) ? value : [value];
        for (const i in data) {
            if (data[i].constructor.name !== entityClass.name) {
                data[i] = new entityClass(data[i]);
            }
        }
        return this.await(async (p) => {
            // remove pre-existing Entities (we will then re-add them, which is the mutation cycle)
            await this._remove(handle, data);
            // add (store) Entities, or Entities created from values
            await handle.addMultiple(data);
        });
    }
    requireEntity(value, entityClass, id) {
        return (value instanceof Entity) ? value : new (entityClass)(value);
    }
    /**
     * Remove from a collection. Value must be an Entity or an array of Entities.
     */
    async remove(handleName, value) {
        const handle = this._requireHandle(handleName);
        if (!(handle instanceof CollectionHandle)) {
            throw new Error(`Cannot remove from a non-Collection handle [${handleName}]`);
        }
        return this._remove(handle, value);
    }
    // tslint:disable-next-line: no-any
    async _remove(handle, value) {
        const data = Array.isArray(value) ? value : [value];
        return this.await(async (p) => Promise.all(data.map(async (value) => {
            if (value instanceof Entity && Entity.isIdentified(value)) {
                await handle.remove(value);
            }
        })));
    }
    /**
     * Remove all entities from named handle.
     */
    async clear(handleName) {
        const handle = this._requireHandle(handleName);
        if (!(handle instanceof SingletonHandle) && !(handle instanceof CollectionHandle)) {
            throw new Error('Can only clear Singleton or Collection handles');
        }
        return this.await(p => handle.clear());
    }
    /**
     * Return the named handle or throw.
     */
    _requireHandle(handleName) {
        const handle = this.handles.get(handleName);
        if (!handle) {
            throw new Error(`Could not find handle [${handleName}]`);
        }
        return handle;
    }
    /**
     * Return array of Entities dereferenced from array of Share-Type Entities
     */
    async derefShares(shares) {
        return this.await(async (p) => {
            const derefPromises = shares.map(async (share) => share.ref.dereference());
            return Promise.all(derefPromises);
        });
    }
    /**
     * Returns array of Entities found in BOXED data `box` that are owned by `userid`
     */
    async boxQuery(box, userid) {
        if (!box) {
            return [];
        }
        const matches = box.filter(item => userid === item.fromKey);
        return this.derefShares(matches);
    }
}
//# sourceMappingURL=ui-particle-base.js.map