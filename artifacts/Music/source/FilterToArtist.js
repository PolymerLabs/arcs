// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle}) => {
  return class FilterToArtist extends DomParticle {
    async willReceiveProps(props, state, lastProps) {
      if (props.artist && props.fullPlayHistory
          // Below check is good enough for now.
          && (!lastProps.fullPlayHistory
              || lastProps.fullPlayHistory.length !== props.fullPlayHistory.length)) {
        
        const artistPlayHistory = this.handles.get('artistPlayHistory');

        let entities = await artistPlayHistory.toList();
        entities.forEach(e => artistPlayHistory.remove(e));
        
        for (const entry of props.fullPlayHistory) {
          if (entry.artist === props.artist.name) {
            await artistPlayHistory.store(entry);
          }
        }
      }
    }
  };
});
