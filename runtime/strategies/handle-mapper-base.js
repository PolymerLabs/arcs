// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

import {Strategy} from '../../strategizer/strategizer.js';
import {Walker} from '../recipe/walker.js';
import {Recipe} from '../recipe/recipe.js';
import {RecipeUtil} from '../recipe/recipe-util.js';
import {assert} from '../../platform/assert-web.js';

export class HandleMapperBase extends Strategy {
  async generate(inputParams) {
    let self = this;

    return Recipe.over(this.getResults(inputParams), new class extends Walker {
      onHandle(recipe, handle) {
        if (handle.fate !== self.fate)
          return;

        if (handle.connections.length == 0)
          return;

        if (handle.id)
          return;

        if (!handle.type)
          return;

        // TODO: using the connection to retrieve type information is wrong.
        // Once validation of recipes generates type information on the handle
        // we should switch to using that instead.
        let counts = RecipeUtil.directionCounts(handle);
        return this.mapHandle(handle, handle.tags, handle.type, counts);
      }

      mapHandle(handle, tags, type, counts) {
        let score = -1;
        if (counts.in == 0 || counts.out == 0) {
          if (counts.unknown > 0)
            return;
          if (counts.out == 0)
            score = 1;
          else
            score = 0;
        }

        if (tags.length > 0)
          score += 4;

        let fate = self.fate;
        if (counts.out > 0 && fate == 'map') {
          return;
        }
        let handles = self.getMappableHandles(type, tags, counts);
        if (handles.length < 2)
          return;

        let responses = handles.map(newHandle =>
          ((recipe, clonedHandle) => {
            for (let existingHandle of recipe.handles)
              // TODO: Why don't we link the handle connections to the existingHandle?
              if (existingHandle.id == newHandle.id)
                return 0;
            let tscore = 0;

            assert(newHandle.id);
            clonedHandle.mapToStorage(newHandle);
            if (clonedHandle.fate != 'copy') {
              clonedHandle.fate = fate;
            }
            return score + tscore;
          }));

        responses.push(null); // "do nothing" for this handle.
        return responses;
      }
    }(Walker.Permuted), this);
  }
}
