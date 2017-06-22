// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategy, Strategizer} = require('../strategizer/strategizer.js');

class AssignViewsByTagAndType extends Strategy {
  async activate(strategizer) {
    // activate if there are views
    // and there are view connections that are not assigned
    // and tags or types match
  }
  async generate(strategizer, n) {
    let results = [];
    for (let recipe of strategizer.generated) {
      // assume that we have already tested that recipe has gaps we can fill
      let result = recipe.clone();
      for (let i = 0; i < recipe.viewConnections.length; i++) {
        let viewConnection = recipe.viewConnections[i];
        if (viewConnection.view) {
          let view = viewConnection.view;
          if (view.resolved()) {
            continue;
          }
          // TODO: there should be some sort of relevance score per found view.
          for (let matchingView of recipe.findView(view.type, view.tags)) {
            let result = recipe.clone();
            let resultView = result.viewConnections[i].view;
            let replacementView = matchingView.clone();
            resultView.replaceWith(replacementView);
            results.push(result);
          }
        }
    // for each recipe
    // for each viewConnection that doesn't have a view
    //     and for each view that is unresolved
    // search for a view in recipe.views that has a matching tag and type
    // generate a result
    // assign the view to the viewConnection

  }
}

class CreateViews extends Strategy {
  async activate(strategizer) {
    let shouldGenerate = strategizer.generated.find(recipe => {
      for (let view of recipe.views) {
        if (!view.id && !view.create) {
          return true;
        }
      }
      return false;
    });
    return {generate: shouldGenerate == 0 ? 1 : 0, evaluate: 0};
  }
  // TODO: move generation to use an async generator.
  async generate(strategizer, n) {
    let candidates = strategizer.generated.filter(recipe => {
      for (let view of recipe.views) {
        if (!view.id && !view.create) {
          return true;
        }
      }
    });

    let results = candidates.map(recipe => {
      let result = recipe.clone();
      let n = 0;
      for (let view of result.views) {
        if (!view.id && !view.create) {
          view.create = true;
          n++;
        }
      }
      // TODO: Somehow also return a local score per result.
      let score = -n;
      return result;
    });

    return results;
  }
}


class Planner {
  async plan(arc) {
    let strategies = [];
    let strategizer = new Strategizer(strategies, {
      maxPopulation: 100,
      generationSize: 1000,
      discardSize: 20,
    });
    // TODO: Repeat until...?
    await strategizer.generate();
    return strategizer.population.filter(possiblePlan => possiblePlan.ready);
  }
}
