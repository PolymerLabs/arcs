// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle}) => {
  const rootTemplate = `hex-game <div slotid="board"></div>`;
  const cellTemplate = `<div>{{test}}</div>`;

  let i = 0;
  return class extends DomParticle {
    getTemplate(slotName) {
      if (slotName == 'root')
        return rootTemplate;
      else if (slotName == 'cell')
        return cellTempalte;
    }
    render(props, state) {
      if (this.currentSlotName == 'cell') {
        return {
          items: [
            {subid: '1-1', test: 'test'},
          ],
        };
      }
    }
  };
});

