/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

defineParticle(({UiMultiplexerParticle, log}) => {
  return class PostMultiplexer extends UiMultiplexerParticle {
    constructInnerRecipe(hostedParticle, item, itemHandle, slot, other) {
      // log(`PostMuxer input recipe: `, item.renderRecipe);
      let value = item.renderRecipe.replace('{{slot_id}}', slot.id);
      value = value.replace('{{item_id}}', itemHandle._id);
      // TODO(wkorman): Joining other_handles and other_connections is a hack
      // due to unknown required indentation for recipe compatibility.
      value = value.replace('{{other_handles}}', other.handles.join('\n  '));
      value = value.replace('{{other_views}}', other.handles.join('\n  '));
      value =
          value.replace('{{other_connections}}', other.connections.join('\n    '));
      // log(`PostMuxer interpolated recipe: `, value);
      // TODO(sjmiles): artifacts folder moved up one level, use this replace
      // for backward-compatibility with old stores
      value = value.replace(/\.\/\.\.\/\.\.\/artifacts/g, './../../../artifacts');
      return value;
    }

    getListEntries(list) {
      return list.sort((a, b) => a.rank - b.rank).entries();
    }
  };
});
