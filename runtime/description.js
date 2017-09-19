/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
"use strict";

var assert = require('assert');
var Type = require('./type.js');

function getSuggestion(recipe, arc, relevance) {
  let options = createSuggestionsOptions({arc, relevance});
  let selectedParticles = recipe.particles
      .filter(particle => particle.spec.description && particle.spec.description.hasPattern() && particle.spec.slots.size > 0)
      .sort(ParticleDescription.sortParticles.bind(null, options));

  let results = [];
  selectedParticles.forEach(particle => {
    results.push(particle.spec.description.toSuggestion(options, particle));
  });
  return results.join(" and ");
}

function getViewDescription(view   /* Connection*/, arc, relevance) {
  assert(view);
  let options = createViewDescriptionOptions({arc, relevance});
  let viewConnection = _selectViewConnection(view, options) || view.connections[0];
  assert(viewConnection);
  let connectionSpec = viewConnection.spec;
  assert(connectionSpec, `Cannot get view description for a nonexistent connection ${viewConnection.name}`);
  return connectionSpec.description.toSuggestion(options, viewConnection);
}

function createSuggestionsOptions({arc, relevance}) {
  let options = { includeViewValues: true };
  options.findViewById = (viewId) => { return viewId ? (relevance ? relevance.newArc : arc).findViewById(viewId) : null };
  options.getParticleRank = (particle) => { return relevance ? relevance.calcParticleRelevance(particle) : 0 };
  return options;
}

function createViewDescriptionOptions({arc, relevance}) {
  let options = { includeViewValues: false };
  options.findViewById = (viewId) => { return viewId ? (relevance ? relevance.newArc : arc).findViewById(viewId) : null };
  options.getParticleRank = (particle) => { return relevance ? relevance.calcParticleRelevance(particle) : 0 };
  return options;
}

function _selectViewConnection(view, options) {
  let possibleConnections = view.connections.filter(connection => {
    let connectionSpec = connection.spec;
    return connectionSpec.isOutput && connectionSpec.description.hasPattern();
  });

  if (options) {
    possibleConnections.sort((c1, c2) => {
      // Sort by particle's rank in descending order.
      return options.getParticleRank(c2.particle) - options.getParticleRank(c1.particle);
    });
  } else {
    // TODO: sort
  }

  if (possibleConnections.length > 0) {
    return possibleConnections[0];
  }
}

class Description {
  constructor(pattern) {
    this._pattern = pattern || "";
    this._tokens = [];
    this._initTokens(this._pattern);
  }
  hasPattern() {
    return this._tokens.length > 0;
  }
  _initTokens(pattern) {
    while (pattern.length  > 0) {
      let tokens = pattern.match(/\${[a-zA-Z0-9::~\.\[\]]+}/g);
      if (tokens) {
        var firstToken = pattern.match(/\${[a-zA-Z0-9::~\.\[\]]+}/g)[0];
        var tokenIndex = pattern.indexOf(firstToken);
      } else {
        var firstToken = "";
        var tokenIndex = pattern.length;
      }
      assert(tokenIndex >= 0);
      let nextToken = pattern.substring(0, tokenIndex);
      if (nextToken.length > 0)
        this._tokens.push(new TextToken(nextToken));
      if (firstToken.length > 0)
        this._tokens.push(new ValueToken(firstToken.substring(2, firstToken.length - 1)));
      pattern = pattern.substring(tokenIndex + firstToken.length);
    }
  }
  toString() {
    return this._tokens.map(token => token.toString()).join("");
  }
}

class TextToken {
  constructor(text) {
    this._text = text;
  }
  toString() { return this._text; }
}

class ValueToken {
  constructor(token) {
    assert(token);
    this._token = token;
    let parts = this._token.split(".");
    this._viewName = parts[0];
    switch(parts[1]) {
      case "type":
        this._useType = true;
        break;
      case "values":
        this._values = true;
        break;
      default:
        this._property = parts;
        this._property.shift();
    }
  }
  toString(options, recipeParticle) {
    let result = [];
    let viewConnection = recipeParticle.getConnectionByName(this._viewName);
    let view = options.findViewById(viewConnection.view.id);
    if (this._useType) {  // view type
      // Use view type (eg "Products list")
      result.push(viewConnection.type.toString());
    } else if (this._values) {  // view values
      // Use view values (eg "How to draw book, Hockey stick")
      result.push(this._formatViewValue(view));
    } else if (this._property.length > 0) {
      assert(!view.type.isView, `Cannot return property ${this._property.join(",")} for set-view`);
      // Use singleton value's property (eg. "09/15" for person's birthday)
      let viewVar = view.get();
      if (viewVar) {
        let value = viewVar.rawData;
        this._property.forEach(p => {
          if (value) {
            value = value[p];
          }
        });
        if (value) {
          result.push(value);
        }
      }
    } else {  // view description
      let chosenConnection = viewConnection;
      let chosenConnectionSpec = viewConnection.spec;
      // For "out" connection, use its own description
      // For "in" connection, use description of the highest ranked out connection with description.
      if (!chosenConnectionSpec.isOutput) {

        let otherConnection = _selectViewConnection(viewConnection.view, options);
        if (otherConnection) {
          chosenConnection = otherConnection;
          chosenConnectionSpec = chosenConnection.spec;
          assert(options.findViewById(chosenConnection.view.id) == view, `Non matching views`);
        }
      }
      // Add description to result array.
      if (!chosenConnectionSpec.description.hasPattern() && view && view.description) {
        // Use the view description available in the arc.
        result.push(view.description);
      } else if (chosenConnectionSpec.description.hasPattern()) {
        // Add the connection spec's description pattern.
        result.push(chosenConnectionSpec.description._tokens.map(token => token.toString(options, chosenConnection.particle)).join(""));
      } else {
        // Add the connection type.
        result.push(chosenConnection.type.toString());
      }

      if (options.includeViewValues !== false) {
        let viewValues = this._formatViewValue(view);
        if (viewValues) {
          if (!view.type.isView && !chosenConnectionSpec.description.hasPattern()) {
            // For singleton view, if there is no real description (the type was used), use the plain value for description.
            result = [];
            result.push(`${viewValues}`);
          } else {  // append the values
            if (!options.seenViews) {
              options.seenViews = new Set();
            }
            if (!options.seenViews.has(view.id)) {
              result.push(` (${viewValues})`);
            }
            options.seenViews.add(view.id);
          }
        }
      }
    }
    return result.join("");
  }

  _formatViewValue(view) {
    if (!view) {
      return;
    }
    if (view.type.isView) {
      let viewList = view.toList();
      if (viewList) {
        if (viewList.length > 2) {
          // TODO: configurable view display format.
          return `<b>${viewList[0].rawData.name}</b> and <b>${viewList.length-1}</b> other items`;
        }
        return viewList.map(v => `<b>${v.rawData.name}</b>`).join(", ");
      }
    } else {
      let viewVar = view.get();
      if (viewVar) {
        return viewVar.rawData.name;  // TODO: use type's Entity instead
      }
    }
  }
}

class ParticleDescription extends Description {
  constructor(pattern, particleSpec) {
    super(pattern);
    assert(particleSpec);
    this._particleSpec = particleSpec;
  }

  toSuggestion(options, recipeParticle) {
    assert(recipeParticle.spec == this._particleSpec, `Recipe particle ${recipeParticle.name} spec doesn't match existing ${this._particleSpec.name}`);
    return this._tokens.map(token => token.toString(options, recipeParticle)).join("");
  }

  static sortParticles(options, p1, p2) {
    // Root slot comes first.
    let hasRoot1 = [...p1.spec.slots.keys()].indexOf("root") >= 0;
    let hasRoot2 = [...p2.spec.slots.keys()].indexOf("root") >= 0;
    if (hasRoot1 != hasRoot2) {
      return hasRoot1 ? -1 : 1;
    }

    // Sort by rank
    let rank1 = options.getParticleRank(p1);
    let rank2 = options.getParticleRank(p2);
    if (rank1 != rank2) {
      return rank2 - rank1;
    }

    // Sort by number of singleton slots.
    let p1Slots = 0, p2Slots = 0;
    p1.spec.slots.forEach((slotSpec) => { if (!slotSpec.isSet) ++p1Slots; });
    p2.spec.slots.forEach((slotSpec) => { if (!slotSpec.isSet) ++p2Slots; });
    return p2Slots - p1Slots;
  }
}

class ConnectionDescription extends Description {
  constructor(pattern, particleSpec, connectionSpec) {
    super(pattern);
    assert(particleSpec);
    assert(connectionSpec);
    this._particleSpec = particleSpec;
    this._connectionSpec = connectionSpec;
  }

  toSuggestion(options, viewConnection) {
    assert(viewConnection);
    assert(this._particleSpec == viewConnection.particle.spec,
           `Particle ${viewConnection.particle.spec.name} expected to match ${this._particleSpec.name}`);
    assert(this._connectionSpec == viewConnection.particle.spec.connectionMap.get(viewConnection.name),
           `View connection ${viewConnection.name} spec expected to match ${this._connectionSpec.name} spec.`);

    return new ValueToken(viewConnection.name).toString(options, viewConnection.particle);
  }
}

Object.assign(module.exports, {
  getSuggestion,
  getViewDescription,
  ConnectionDescription,
  ParticleDescription,
});
