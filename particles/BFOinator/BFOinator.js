// @license
// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

let template = "<div>Hi!</div>"

defineParticle(({DomParticle}) => {

  return class Chooser extends DomParticle {
    get template() {
      return template;
    }
    get config() {
      return {
        views: this.spec.inputs.map(i => i.name),
        slotName: this.spec.renders.length && this.spec.renders[0].name.name
      };
    }    
    _willReceiveProps(props) {
      this._views.get('dueBy').set(props.importantDates[0]);
      this._setState({});
    }
    _render(props, state) {
      return { };
    }
  };
});