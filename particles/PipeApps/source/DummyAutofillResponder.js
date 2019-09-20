/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

'use strict';

// A dummy particle which handles Autofill requests and returns a hardcoded
// response.
defineParticle(({Particle}) => {
  return class DummyAutofillResponder extends Particle {
    onHandleSync(handle, model) {
      super.onHandleSync(handle, model);
      if (handle.name === 'request') {
        this.request = model;
      }
      if (handle.name == 'recentPeople') {
        this.recentPeople = model;
      }
      this._addResponses();
    }
    _addResponses() {
      if (!this.request || !this.recentPeople) {
        return;
      }
      for (const request of this.request) {
        this._addResponse(request);
      }
    }

    onHandleUpdate(handle, update) {
      super.onHandleUpdate(handle, update);
      if (handle.name !== 'request' || !update.added) {
        return;
      }
      for (const request of update.added) {
        this._addResponse(request);
      }
    }

    _addResponse(request) {
      if (!this.recentPeople || this.recentPeople.length === 0) {
        return;
      }
      const responseHandle = this.handles.get('response');
      let suggestion = `${this.recentPeople[0].firstName} ${this.recentPeople[0].lastName}`;
      if (request.hint) {
        suggestion += ` (${request.hint})`;
      }
      responseHandle.store(new responseHandle.entityClass({suggestion}));
    }
  };
});
