// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle}) => {
  return class FilterToArtist extends DomParticle {
    constructor() {
      super();
      // We need to mark the particle as busy ASAP to get an opportunity to filter the data before the speculator terminates.
      this.startBusy();
    }

    async willReceiveProps(props, state, lastProps) {
      if (props.artist && props.fullPlayHistory) {
        this.doneBusy();

        if (props.artistPlayHistory.length !== 0)  return;

        const artistPlayHistory = this.handles.get('artistPlayHistory');
        for (const entry of props.fullPlayHistory) {
          if (entry.artist.toLowerCase() === props.artist.name.toLowerCase()) {
            await artistPlayHistory.store(entry);
          }
        }
      }
    }
  };
});
