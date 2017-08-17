// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategy} = require('../../strategizer/strategizer.js');
let RecipeWalker = require('../recipe/walker.js');
let Recipe = require('../recipe/recipe.js');
let RecipeUtil = require('../recipe/recipe-util.js');
let assert = require('assert');

class ViewMapperBase extends Strategy {
  async generate(strategizer) {
    var self = this;

    var results = Recipe.over(strategizer.generated, new class extends RecipeWalker {
      onViewConnection(recipe, vc) {
        if (vc.view)
          return;
        if (!vc.type)
          return;
        if (vc.direction == 'in')
          var counts = {'in': 1, 'out': 0, 'unknown': 0};
        else if (vc.direction == 'out')
          var counts = {'in': 0, 'out': 1, 'unknown': 0};
        else if (vc.direction == 'inout')
          var counts = {'in': 1, 'out': 1, 'unknown': 0};
        else
          var counts = {'in': 0, 'out': 0, 'unknown': 1};
        return this.mapView(null, vc.tags, vc.type, counts);
      }

      onView(recipe, view) {
        if (view.fate == "create")
          return;

        if (view.connections.length == 0)
          return;

        if (view.id)
          return;

        if (!view.type)
          return;

        // TODO: using the connection to retrieve type information is wrong.
        // Once validation of recipes generates type information on the view
        // we should switch to using that instead.
        var counts = RecipeUtil.directionCounts(view);
        return this.mapView(view, view.tags, view.type, counts);
      }

      mapView(view, tags, type, counts) {
        var score = -1;
        if (counts.in == 0 || counts.out == 0) {
          if (counts.unknown > 0)
            return;
          if (counts.out == 0)
            score = 1;
          else
            score = 0;
        }

        var contextIsViewConnection = view == null;
        if (contextIsViewConnection)
          score -= 2;

        if (tags.length > 0)
          score += 4;

        var fate = self.fate;
        if (counts.out > 0 && fate == 'map') {
          return;
        }
        var views = self.getMappableViews(type, tags);

        if (views.length == 0)
          return;

        var responses = views.map(newView =>
          ((recipe, clonedObject) => {
            for (var existingView of recipe.views)
              // TODO: Why don't we link the view connections to the existingView?
              if (existingView.id == newView.id)
                return 0;
            var tscore = 0;
            if (contextIsViewConnection) {
              var clonedView = recipe.newView();
              clonedObject.connectToView(clonedView);
            } else {
              var clonedView = clonedObject;
            }
            assert(newView.id);
            clonedView.mapToView(newView);
            if (clonedView.fate != 'copy') {
              clonedView.fate = fate;
            }
            return score + tscore;
          }));

        responses.push(null); // "do nothing" for this view.
        return responses;
      }
    }(RecipeWalker.Permuted), this);

    return { results, generate: null };
  }
}

module.exports = ViewMapperBase;
