// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle}) => {
  return class ExtractLocation extends DomParticle {
    update({user}, state, lastProps) {
      if (user && user.location) {
        const {latitude, longitude} = user.location;
        if (state.latitude !== latitude || state.longitude !== longitude) {
          state.latitude = latitude;
          state.longitude = longitude;
          this.updateVariable('location', user.location);
        }
      }
    }
  };
});
