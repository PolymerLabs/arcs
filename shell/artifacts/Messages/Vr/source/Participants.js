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
        let participants = new Set([
          ...state.participants,
          ...props.participants.map(p => p.name)
        ]);
        this._setState({participants});
        let changes = new Set();
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
        let changes = state.changes;
        state.participants = new Set([...state.participants, ...state.changes]);
        state.changes = undefined;
        let Person = this.handles.get('participants').entityClass;
        changes.forEach(name => {
          this.handles.get('participants').store(new Person({name}));
        });
      }
    }
  };
});
