/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

defineParticle(({UiParticle}) => {
  return class ExtractLocation extends UiParticle {
    willReceiveProps(props, state, lastProps) {
      // possibly undefined.
      const lastLatitude = lastProps.person && lastProps.person.latitude;
      const lastLongitude = lastProps.person && lastProps.person.longitude;

      if (props.person && props.person.name &&
          (props.person.latitude !== lastLatitude || props.person.longitude !== lastLongitude)) {

        const location = this.handles.get('location');
        location.set(new location.entityClass({
          latitude: props.person.latitude,
          longitude: props.person.longitude}));
      }
    }
  };
});
