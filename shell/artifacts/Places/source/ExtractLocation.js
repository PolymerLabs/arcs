// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

"use strict";

defineParticle(({DomParticle}) => {
  return class ExtractLocation extends DomParticle {
    _willReceiveProps(props, state, lastProps) {
      if (props.person && props.person.name && props.person.location
          && JSON.stringify(props.person.location) !==
          JSON.stringify(lastProps.person && lastProps.person.location)) {
        const {latitude, longitude} = props.person.location;
        const location = this._views.get('location');
        location.set(new location.entityClass({latitude, longitude}));
      }
    }
  }
});
