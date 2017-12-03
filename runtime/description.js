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

import assert from 'assert';
import Type from './type.js';

class Description {
  constructor(arc) {
    this._arc = arc;
    this._recipe = arc._activeRecipe;

    this.onRecipeUpdate();
  }

  onRecipeUpdate() {
    this._particleDescriptions = this._recipe.particles.map(particle => { return {_particle: particle, _connections: {} }; });

    this.setRelevance(this._relevance);
  }

  setRelevance(relevance) {
    this._relevance = relevance;
    if (this._relevance) {
      this._particleDescriptions.forEach(pDesc => {
        pDesc._rank = this._relevance.calcParticleRelevance(pDesc._particle);
      });
    }
  }

  _updateDescriptionHandles() {
    this._particleDescriptions.forEach(pDesc => {
      let particle = pDesc._particle;
      let descByName = this._getPatternByNameFromDescriptionHandle(particle) || {};
      let pattern = descByName["_pattern_"] || particle.spec.pattern;
      if (pattern) {
        pDesc.pattern = pattern;
      }

      pDesc._connections = {};
      Object.values(particle.connections).forEach(viewConn => {
        let specConn = particle.spec.connectionMap.get(viewConn.name);
        let pattern = descByName[viewConn.name] || specConn.pattern;
        if (pattern) {
          let viewDescription = {pattern: pattern, _viewConn: viewConn, _view: this._arc.findViewById(viewConn.view.id)};
          pDesc._connections[viewConn.name] = viewDescription;
        }
      });
    });
  }

  _getPatternByNameFromDescriptionHandle(particle) {
    let descriptionConn = particle.connections["descriptions"];
    if (descriptionConn && descriptionConn.view && descriptionConn.view.id) {
      let descView = this._arc.findViewById(descriptionConn.view.id);
      if (descView) {
        let descList = descView.toList();
        let descByName = {};
        descList.forEach(d => descByName[d.rawData.key] = d.rawData.value);
        return descByName;
      }
    }
  }

  getRecipeSuggestion(particles) {
    this._updateDescriptionHandles();  // This is needed to get updates in description handle.

    // Choose particles that render UI, sort them by rank and generate suggestions.
    let particlesSet = new Set(particles || this._particleDescriptions.map(pDesc => pDesc._particle));
    let selectedDescriptions = this._particleDescriptions
      .filter(desc => { return particlesSet.has(desc._particle) && desc._particle.spec.slots.size > 0 && !!desc.pattern; })
      .sort(Description.sort);

    let options = { seenViews: new Set() };
    let suggestions = selectedDescriptions.map(particle => this.patternToSuggestion(particle.pattern, particle, options));

    let count = suggestions.length;
    if (count == 0) {
      // Return recipe name by default.
      return this._recipe.name;
    }

    // Combine descriptions into a sentence:
    // "A."
    // "A and b."
    // "A, b, ..., and z." (Oxford comma ftw)
    let delim = ['', '', ' and ', ', and '][count > 2 ? 3 : count];
    let suggestion = suggestions.slice(0, -1).join(", ") + delim + suggestions.pop();
    // "Capitalize, punctuate."
    return suggestion[0].toUpperCase() + suggestion.slice(1) + '.';
  }

  getViewDescription(recipeView) {
    assert(recipeView.connections.length > 0, 'view has no connections?');

    this._updateDescriptionHandles();  // This is needed to get updates in description handle.

    let viewConnection = this._selectViewConnection(recipeView) || recipeView.connections[0];
    let view = this._arc.findViewById(recipeView.id);
    return this._formatDescription(viewConnection, view, { seenViews: new Set(), excludeValues: true });
  }

  patternToSuggestion(pattern, particleDescription, options) {
    this._tokens = this._initTokens(pattern, particleDescription._particle);
    return this._tokens.map(token => this.tokenToString(token, options)).join("");
  }

  _initTokens(pattern, particle) {
    pattern = pattern.replace(/</g, '&lt;');
    let results = [];
    while (pattern.length  > 0) {
      let tokens = pattern.match(/\${[a-zA-Z0-9::~\.\[\]_]+}/g);
      if (tokens) {
        var firstToken = pattern.match(/\${[a-zA-Z0-9::~\.\[\]_]+}/g)[0];
        var tokenIndex = pattern.indexOf(firstToken);
      } else {
        var firstToken = "";
        var tokenIndex = pattern.length;
      }
      assert(tokenIndex >= 0);
      let nextToken = pattern.substring(0, tokenIndex);
      if (nextToken.length > 0)
        results.push({text: nextToken});
      if (firstToken.length > 0) {
        let valueTokens = pattern.match(/\$\{([a-zA-Z]+)(?:\.([_a-zA-Z]+))?\}/);
        let valueToken = { viewName: valueTokens[1] };
        if (valueTokens.length == 3) {
          valueToken.extra = valueTokens[2];
        }
        valueToken._viewConn = particle.connections[valueToken.viewName];
        assert(valueToken._viewConn.view && valueToken._viewConn.view.id, 'Missing id???');
        valueToken._view = this._arc.findViewById(valueToken._viewConn.view.id);
        results.push(valueToken);
      }
      pattern = pattern.substring(tokenIndex + firstToken.length);
    }
    return results;
  }

  tokenToString(token, options) {
    if (token.text) {
      return token.text;
    }
    assert(token.viewName, "no text and no view name???");

    switch (token.extra) {
      case "_type_":
        return token._viewConn.type.toPrettyString().toLowerCase();
      case "_values_":
        return this._formatViewValue(token._view);
      case "_name_": {
        return this._formatDescription(token._viewConn, token._view, options).toString();
      }
      case undefined:
        // full view description
        let descriptionToken = this._formatDescription(token._viewConn, token._view, options) || {};
        let viewValue = this._formatViewValue(token._view);
        if (!descriptionToken.pattern) {
          // For singleton view, if there is no real description (the type was used), use the plain value for description.
          if (viewValue && !token._view.type.isSetView && !options.excludeValues) {
            return viewValue;
          }
        }

        if (viewValue && !options.excludeValues && !options.seenViews.has(token._view.id)) {
          options.seenViews.add(token._view.id);
          return `${descriptionToken.toString()} (${viewValue})`;
        }
        return descriptionToken.toString();
      default:  // property
        return this._propertyTokenToString(token._view, token.extra.split('.'));
      }
  }

  _propertyTokenToString(view, properties) {
    assert(!view.type.isSetView, `Cannot return property ${properties.join(",")} for set-view`);
    // Use singleton value's property (eg. "09/15" for person's birthday)
    let viewVar = view.get();
    if (viewVar) {
      let value = viewVar.rawData;
      properties.forEach(p => {
        if (value) {
          value = value[p];
        }
      });
      if (value) {
        return `<b>${value}</b>`;
      }
    }
  }

  _formatViewValue(view) {
    if (!view) {
      return;
    }
    if (view.type.isSetView) {
      let viewList = view.toList();
      if (viewList && viewList.length > 0) {
        if (viewList[0].rawData.name) {
          if (viewList.length > 2) {
            // TODO: configurable view display format.
            return `<b>${viewList[0].rawData.name}</b> plus <b>${viewList.length-1}</b> other items`;
          }
          return viewList.map(v => `<b>${v.rawData.name}</b>`).join(", ");
        } else {
          return `<b>${viewList.length}</b> items`;
        }
      }
    } else {
      let viewVar = view.get();
      if (viewVar && viewVar.rawData.name) {
        return `<b>${viewVar.rawData.name}</b>`;  // TODO: use type's Entity instead
      }
    }
  }

  _formatDescription(viewConnection, view, options) {
    assert(viewConnection.view.id == view.id, `Mismatching view IDs ${viewConnection.view.id} and ${view.id}`);

    let chosenConnection = viewConnection;
    // For "out" connection, use its own description
    // For "in" connection, use description of the highest ranked out connection with description.
    if (!chosenConnection.spec.isOutput) {
      let otherConnection = this._selectViewConnection(viewConnection.view);
      if (otherConnection) {
        chosenConnection = otherConnection;
        assert(chosenConnection.view.id == view.id, `Non matching views`);
      }
    }

    let chosenParticleDescription = this._particleDescriptions.find(desc => desc._particle == chosenConnection.particle);
    let viewDescription = chosenParticleDescription ? chosenParticleDescription._connections[chosenConnection.name] : null;
    // Add description to result array.
    if (viewDescription) {
      // Add the connection spec's description pattern.
      return DescriptionToken.fromPatternDescription(this.patternToSuggestion(viewDescription.pattern, chosenParticleDescription, options));
    } else if (view && view.description) {
      // Use the view description available in the arc.
      return view.description;
    } else {
      return DescriptionToken.fromTypeDescription(viewConnection.type.toPrettyString().toLowerCase());
    }
  }

  _selectViewConnection(recipeView) {
    let possibleConnections = recipeView.connections.filter(connection => {
      // Choose connections with patterns (manifest-based or dynamic).
      let connectionSpec = connection.spec;
      let particleDescription = this._particleDescriptions.find(desc => desc._particle == connection.particle);
      return !!connectionSpec.pattern || !!particleDescription._connections[connection.name];
    });

    possibleConnections.sort((c1, c2) => {
      let isOutput1 = c1.spec.isOutput;
      let isOutput2 = c2.spec.isOutput;
      if (isOutput1 != isOutput2) {
        // Prefer output connections
        return isOutput1 ? -1 : 1;
      }

      let d1 = this._particleDescriptions.find(desc => desc._particle == c1.particle);
      let d2 = this._particleDescriptions.find(desc => desc._particle == c2.particle);
      // Sort by particle's rank in descending order.
      return d2._rank - d1._rank;
    });

    if (possibleConnections.length > 0) {
      return possibleConnections[0];
    }
  }

  static sort(p1, p2) {
    // Root slot comes first.
    let hasRoot1 = [...p1._particle.spec.slots.keys()].indexOf("root") >= 0;
    let hasRoot2 = [...p2._particle.spec.slots.keys()].indexOf("root") >= 0;
    if (hasRoot1 != hasRoot2) {
      return hasRoot1 ? -1 : 1;
    }

    // Sort by rank
    if (p1._rank != p2._rank) {
      return p1._rank != p2._rank;
    }

    // Sort by number of singleton slots.
    let p1Slots = 0, p2Slots = 0;
    p1._particle.spec.slots.forEach((slotSpec) => { if (!slotSpec.isSet) ++p1Slots; });
    p2._particle.spec.slots.forEach((slotSpec) => { if (!slotSpec.isSet) ++p2Slots; });
    return p2Slots - p1Slots;
  }
}

class DescriptionToken {
  constructor(pattern, type) {
    this._pattern = pattern;
    this._type = type;
  }
  get pattern() { return this._pattern; }
  get type() { return this._type; }
  toString() {
    return this._pattern || this._type;
  }
  static fromPatternDescription(patternDescription) {
    return new DescriptionToken(patternDescription);
  }
  static fromTypeDescription(typeDescription) {
    return new DescriptionToken(null, typeDescription);
  }
}

export default Description;
