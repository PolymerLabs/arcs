// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle}) => {
  const size = 8;
  const template = `
    <style>
    hex-board {
      --hex-side: 26px;
      --hex-border: 1px;
      --hex-width: calc(1.73205080757 * var(--hex-side));
      --hex-height: calc(2 * var(--hex-side));
      --hex-x-offset: calc(0.5 * var(--hex-width));
      --hex-y-offset: calc(0.25 * var(--hex-height));
      display: grid;
      grid-template-columns: repeat(${size * 2 - 3}, calc(var(--hex-width) - var(--hex-border)));
      grid-template-rows: repeat(${size}, calc(0.75 * var(--hex-height) - var(--hex-border)));
    }
    
    hexa-gon[offset] {
      margin-left: calc(1 * var(--hex-x-offset) - var(--hex-border)/2);
    }

    hexa-gon[padding] {
      visibility: hidden;
    }
    
    /* This actually paints the border. */
    hexa-gon {
      display: inline-block;
      width: var(--hex-width);
      height: var(--hex-height);
      background: black;
      clip-path: polygon(
          0% 25%,
          50% 0%,
          100% 25%,
          100% 75%,
          50% 100%,
          0% 75%);
    }

    /* The real contents of the cell. */
    hexa-gon:before {
      display: inline-block;
      content: '';
      width: var(--hex-width);
      height: var(--hex-height);
      --0: calc(var(--hex-border) + 0%);
      --25: calc(var(--hex-border) + (100% - 2 * var(--hex-border)) * 0.25);
      --75: calc(var(--hex-border) + (100% - 2 * var(--hex-border)) * 0.75);
      --100: calc(100% - var(--hex-border));
      clip-path: polygon(
          var(--0) var(--25),
          50% var(--0),
          var(--100) var(--25),
          var(--100) var(--75),
          50% var(--100),
          var(--0) var(--75));
      background: white;
    }
    
    hexa-gon:hover:before {
      background: #F44336;
    }
    </style>
    <hex-board>
      ${(() => {
        let result = [];
        for (let row = 0; row < size; row++) {
          // Every second row is offset by half the width of a tile (by setting
          // the [offset] attribute). After every two rows we need to add an
          // additional padding element. We must also add padding elements at
          // the end so that each row has the same number of elements.
          // eg. (Xx is a hex tile, . is the offset applied to every second
          //     row, Pp is padding)
          // XxXxXxXxXxXxPpPp
          // .XxXxXxXxXxXxPpPp
          // PpXxXxXxXxXxXxPp
          // .PpXxXxXxXxXxXxPp
          // PpPpXxXxXxXxXxXx
          // .PpPpXxXxXxXxXxXx
          let offset = row % 2;
          for (let i = 0; i < (row - offset) / 2; i++) {
            result.push(`<hexa-gon padding${offset ? ' offset' : ''}></hexa-gon>`);
          }
          for (let col = 0; col < size; col++) {
            result.push(`<hexa-gon${offset ? ' offset' : ''}></hexa-gon>`);
          }
          for (let i = (row - offset) / 2; i < size - 3; i++) {
            result.push(`<hexa-gon padding${offset ? ' offset' : ''}></hexa-gon>`);
          }
        }
        return result.join('');
      })()}
    </hex-board>`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    update(props, state, lastProps, lastState) {
    }
    render(props, state) {
    }
  };
});