// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

defineParticle(({DomParticle}) => {
  return class extends DomParticle {
    get template() {
      return ' ';
    }
    _getInitialState() {
      return {
        participants: new Set()
      };
    }
    willReceiveProps(props, state) {
      if (props.messages && props.participants) {
        const participants = new Set([
          ...state.participants,
          ...props.participants.map(p => p.name)
        ]);
        this._setState({participants});
        const changes = new Set();
        props.messages.forEach(m => {
          if (!participants.has(m.name)) {
            changes.add(m.name);
          }
        });
        if (changes.size) {
          this._setState({changes});
        }
      }
    }
    update(props, state) {
      if (state.changes) {
        const changes = state.changes;
        state.participants = new Set([...state.participants, ...state.changes]);
        state.changes = undefined;
        const Person = this.handles.get('participants').entityClass;
        changes.forEach(name => {
          this.handles.get('participants').store(new Person({name}));
        });
      }
    }
  };
});
