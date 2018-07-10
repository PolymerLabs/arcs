// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

defineParticle(({DomParticle, html}) => {
  const size = 11;
  const padding = (size - 1) / 2 |0;
  const rows = size;
  const columns = size + padding;
  const ratio = 1 / Math.sqrt(3) * 1.5 * rows / columns;
  const template = html`
    <style>
    hex-board-ratio {
      position: relative;
      display: block;
      width: 100%;
    }
    hex-board-ratio:before {
      display: block;
      content: '';
      /* % in padding is based on width, this lets us size height relative to width */
      padding-top: ${ratio * 100}%;
    }
    hex-board {
      position: absolute;
      top: 0;
      left: 0;
      bottom: 0;
      right: 0;
      --hex-border: 1px;
      display: grid;
      grid-template-columns: repeat(${columns}, 1fr);
      grid-template-rows: repeat(${rows}, 1fr);
    }
    
    hexa-gon[offset] {
      margin-left: calc(50% - var(--hex-border)/2);
    }

    hexa-gon[padding] {
      visibility: hidden;
    }
    
    /* Clipped hexagon tile. */
    hexa-gon {
      position: relative;
      display: inline-block;
      width: calc(100% + var(--hex-border));
      height: calc(4/3 * 100% + var(--hex-border));
      clip-path: polygon(
          0% 25%,
          50% 0%,
          100% 25%,
          100% 75%,
          50% 100%,
          0% 75%);
    }

    /* Border on top of the tile. */
    hexa-gon:before {
      position: absolute;
      content: '';
      width: 100%;
      height: 100%;
      --0: calc(var(--hex-border) + 0%);
      --25: calc(var(--hex-border) + (100% - 2 * var(--hex-border)) * 0.25);
      --75: calc(var(--hex-border) + (100% - 2 * var(--hex-border)) * 0.75);
      --100: calc(100% - var(--hex-border));
      clip-path: polygon(
        0% 25%,
        50% 0%,
        100% 25%,
        100% 75%,
        50% 100%,
        0% 75%,
        0% 25%,
        var(--0) var(--25),
        var(--0) var(--75),
        50% var(--100),
        var(--100) var(--75),
        var(--100) var(--25),
        50% var(--0),
        var(--0) var(--25));
      background: black;
    }
    </style>
    <hex-board-ratio>
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
            result.push(html`<hexa-gon padding${offset ? ' offset' : ''}></hexa-gon>`);
          }
          for (let col = 0; col < size; col++) {
            result.push(html`<hexa-gon${offset ? ' offset' : ''} slotid="cell" subid="${col}-${row}"></hexa-gon>`);
          }
          for (let i = (row - offset) / 2; i < padding; i++) {
            result.push(html`<hexa-gon padding${offset ? ' offset' : ''}></hexa-gon>`);
          }
        }
        return result.join('');
      })()}
    </hex-board>
    </hex-board-ratio>`;

  return class extends DomParticle {
    get template() {
      return template;
    }
    render(props, state) {
    }
  };
});