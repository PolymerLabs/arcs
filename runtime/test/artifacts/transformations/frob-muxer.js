// @license
// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

'use strict';

// A trivial muxer particle for testing purposes that passes through the
// `renderRecipe` in the input item with muxer knowledge specific substitutions.
defineParticle(({MultiplexerDomParticle}) => {
  return class FrobMuxer extends MultiplexerDomParticle {
    constructInnerRecipe(hostedParticle, item, itemView, slot, other) {
      let value = item.renderRecipe.replace('{{slot_id}}', slot.id);
      value = value.replace('{{item_id}}', itemView._id);
      value = value.replace('{{other_views}}', other.views.join('\n'));
      value =
          value.replace('{{other_connections}}', other.connections.join('\n'));
      return value;
    }
  };
});
