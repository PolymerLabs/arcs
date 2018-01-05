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

import assert from '../platform/assert-web.js';
import Type from './type.js';
import ParticleSpec from './particle-spec.js';

export default class Description {
  constructor(arc) {
    this._arc = arc;
    this._recipe = arc._activeRecipe;
    this._relevance = null;
  }
  get arc() { return this._arc; }
  get recipe() { return this._recipe; }
  get relevance() { return this._relevance; }
  set relevance(relevance) { this._relevance = relevance; }

  async getArcDescription(formatterClass) {
    let desc = await new (formatterClass || DescriptionFormatter)(this).getDescription(this._recipe.particles);
    if (desc) {
      return desc;
    }
  }

  async getRecipeSuggestion(formatterClass) {
    let desc = await new (formatterClass || DescriptionFormatter)(this).getDescription(this._arc.recipes[0].particles);
    if (desc) {
      return desc;
    }

    return this._recipe.name;
  }

  async getViewDescription(recipeView) {
    assert(recipeView.connections.length > 0, 'view has no connections?');

    let formatter = new DescriptionFormatter(this);
    formatter.excludeValues = true;
    return await formatter.getViewDescription(recipeView);
  }
}

export class DescriptionFormatter {
  constructor(description) {
    this._description = description;
    this._arc = description._arc;
    this._particleDescriptions = [];

    this.seenViews = new Set();
    this.seenParticles = new Set();
    this.excludeValues = false;
  }

  async getDescription(particles) {
    await this._updateDescriptionHandles(this._description);

    // Choose particles, sort them by rank and generate suggestions.
    let particlesSet = new Set(particles);
    let selectedDescriptions = this._particleDescriptions
      .filter(desc => (particlesSet.has(desc._particle) && this._isSelectedDescription(desc)));
    // Prefer particles that render UI, if any.
    if (selectedDescriptions.find(desc => (desc._particle.spec.slots.size > 0))) {
      selectedDescriptions = selectedDescriptions.filter(desc => (desc._particle.spec.slots.size > 0));
    }
    selectedDescriptions = selectedDescriptions.sort(DescriptionFormatter.sort);

    if (selectedDescriptions.length > 0) {
      return this._combineSelectedDescriptions(selectedDescriptions);
    }
  }

  _isSelectedDescription(desc) {
    return !!desc.pattern;
  }

  async getViewDescription(recipeView) {
    await this._updateDescriptionHandles(this._description);

    let viewConnection = this._selectViewConnection(recipeView) || recipeView.connections[0];
    let view = this._arc.findViewById(recipeView.id);
    return this._formatDescription(viewConnection, view);
  }

  async _updateDescriptionHandles(description) {
    await Promise.all(description.recipe.particles.map(async particle => {
      let pDesc = {
        _particle: particle,
        _connections: {}
      };
      if (description.relevance) {
        pDesc._rank = description.relevance.calcParticleRelevance(particle);
      }

      let descByName = await this._getPatternByNameFromDescriptionHandle(particle) || {};
      pDesc = Object.assign(pDesc, this._populateParticleDescription(particle, descByName));
      Object.values(particle.connections).forEach(viewConn => {
        let specConn = particle.spec.connectionMap.get(viewConn.name);
        let pattern = descByName[viewConn.name] || specConn.pattern;
        if (pattern) {
          let viewDescription = {pattern: pattern, _viewConn: viewConn, _view: this._arc.findViewById(viewConn.view.id)};
          pDesc._connections[viewConn.name] = viewDescription;
        }
      });
      this._particleDescriptions.push(pDesc);
    }));
  }

  async _getPatternByNameFromDescriptionHandle(particle) {
    let descriptionConn = particle.connections["descriptions"];
    if (descriptionConn && descriptionConn.view && descriptionConn.view.id) {
      let descView = this._arc.findViewById(descriptionConn.view.id);
      if (descView) {
        let descList = await descView.toList();
        let descByName = {};
        descList.forEach(d => descByName[d.rawData.key] = d.rawData.value);
        return descByName;
      }
    }
  }

  _populateParticleDescription(particle, descriptionByName) {
    let pattern = descriptionByName["_pattern_"] || particle.spec.pattern;
    return pattern ? {pattern} : {};
  }

  async _combineSelectedDescriptions(selectedDescriptions) {
    let suggestions = [];
    await Promise.all(selectedDescriptions.map(async particle => {
      if (!this.seenParticles.has(particle._particle)) {
        suggestions.push(await this.patternToSuggestion(particle.pattern, particle));
      }
    }));
    return this._capitalizeAndPunctuate(this._joinDescriptions(suggestions));
  }

  _joinDescriptions(strings) {
    let nonEmptyStrings = strings.filter(str => !!str);
    let count = nonEmptyStrings.length;
    // Combine descriptions into a sentence:
    // "A."
    // "A and b."
    // "A, b, ..., and z." (Oxford comma ftw)
    let delim = ['', '', ' and ', ', and '][Math.min(3, count)];
    return nonEmptyStrings.slice(0, -1).join(", ") + delim + strings.pop();
  }

  _joinTokens(tokens) {
    return tokens.join('');
  }

  _capitalizeAndPunctuate(sentence) {
    // "Capitalize, punctuate."
    return sentence[0].toUpperCase() + sentence.slice(1) + '.';
  }

  async patternToSuggestion(pattern, particleDescription) {
    var tokens = this._initTokens(pattern, particleDescription._particle);
    let tokenPromises = tokens.map(async token => await this.tokenToString(token));
    let tokenResults = await Promise.all(tokenPromises);
    if (tokenResults.filter(res => res == undefined).length == 0) {
      return this._joinTokens(tokenResults);
    }
  }

  _initTokens(pattern, particle) {
    pattern = pattern.replace(/</g, '&lt;');
    let results = [];
    while (pattern.length > 0) {
      let tokens = pattern.match(/\${[a-zA-Z0-9\.]+}(?:\.[_a-zA-Z]+)?/g);
      if (tokens) {
        var firstToken = tokens[0];
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
        results.push(this._initHandleToken(firstToken, particle));
      }
      pattern = pattern.substring(tokenIndex + firstToken.length);
    }
    return results;
  }

  _initHandleToken(pattern, particle) {
    let valueTokens = pattern.match(/\${([a-zA-Z0-9\.]+)}(?:\.([_a-zA-Z]+))?/);
    let handleNames = valueTokens[1].split('.');
    let extra = valueTokens.length == 3 ? valueTokens[2] : undefined;
    let valueToken;
    let viewConn = particle.connections[handleNames[0]];
    if (viewConn) { // view connection
      assert(viewConn.view && viewConn.view.id, 'Missing id???');
      return {
        fullName: valueTokens[0],
        viewName: viewConn.name,
        properties: handleNames.splice(1),
        extra,
        _viewConn: viewConn,
        _view: this._arc.findViewById(viewConn.view.id)};
    }

    // slot connection
    assert(handleNames.length == 2, 'slot connections tokens must have 2 names');
    let providedSlotConn = particle.consumedSlotConnections[handleNames[0]].providedSlots[handleNames[1]];
    assert(providedSlotConn, `Could not find handle ${handleNames.join('.')}`);
    return {fullName: valueTokens[0], consumeSlotName: handleNames[0], provideSlotName: handleNames[1], extra, _providedSlotConn: providedSlotConn};
  }

  async tokenToString(token) {
    if (token.text) {
      return token.text;
    }
    if (token.viewName) {
      return this._viewTokenToString(token);
    } else if (token.consumeSlotName && token.provideSlotName) {
      return this._slotTokenToString(token);
    }
    assert(false, 'no view or slot name');
  }

  async _viewTokenToString(token) {
    switch (token.extra) {
      case "_type_":
        return token._viewConn.type.toPrettyString().toLowerCase();
      case "_values_":
        return this._formatViewValue(token.viewName, token._view);
      case "_name_":
        return this._formatDescription(token._viewConn, token._view);
      default:
        assert(!token.extra, `Unrecognized extra ${token.extra}`);

        // Transformation's hosted particle.
        if (token._viewConn.type.isInterface) {
          let particleSpec = ParticleSpec.fromLiteral(await token._view.get());
          // TODO: call this.patternToSuggestion(...) to resolved expressions in the pattern template.
          return particleSpec.pattern;
        }

        // singleton view property.
        if (token.properties && token.properties.length > 0) {
          return this._propertyTokenToString(token.viewName, token._view, token.properties);
        }

        // full view description
        let description = (await this._formatDescriptionPattern(token._viewConn)) ||
                          this._formatViewDescription(token._viewConn, token._view);
        let viewValue = await this._formatViewValue(token.viewName, token._view);
        if (!description) {
          // For singleton view, if there is no real description (the type was used), use the plain value for description.
          if (viewValue && !token._view.type.isSetView && !this.excludeValues) {
            return viewValue;
          }
        }

        description = description || this._formatViewType(token._viewConn);
        if (viewValue && !this.excludeValues && !this.seenViews.has(token._view.id)) {
          this.seenViews.add(token._view.id);
          return this._combineDescriptionAndValue(token, description, viewValue);
        }
        return description;
    }
  }

  _combineDescriptionAndValue(token, description, viewValue) {
    return `${description} (${viewValue})`;
  }

  async _slotTokenToString(token) {
    switch (token.extra) {
      case '_empty_':
        // TODO: also return false, if the consuming particles generate an empty description.
        return token._providedSlotConn.consumeConnections.length == 0;
      default:
        assert(!token.extra, `Unrecognized slot extra ${token.extra}`);
    }

    let results = (await Promise.all(token._providedSlotConn.consumeConnections.map(async consumeConn => {
      let particle = consumeConn.particle;
      let particleDescription = this._particleDescriptions.find(desc => desc._particle == particle);
      this.seenParticles.add(particle);
      return this.patternToSuggestion(particle.spec.pattern, particleDescription);
    })));

    return this._joinDescriptions(results);
  }

  async _propertyTokenToString(viewName, view, properties) {
    assert(!view.type.isSetView, `Cannot return property ${properties.join(",")} for set-view`);
    // Use singleton value's property (eg. "09/15" for person's birthday)
    let viewVar = await view.get();
    if (viewVar) {
      let value = viewVar.rawData;
      properties.forEach(p => {
        if (value) {
          value = value[p];
        }
      });
      if (value) {
        return this._formatEntityProperty(viewName, properties, value);
      }
    }
  }

  _formatEntityProperty(viewName, properties, value) {
    return value;
  }

  async _formatViewValue(viewName, view) {
    if (!view) {
      return;
    }
    if (view.type.isSetView) {
      let viewList = await view.toList();
      if (viewList && viewList.length > 0) {
        return this._formatSetView(viewName, viewList);
      }
    } else {
      let viewVar = await view.get();
      if (viewVar) {
        return this._formatSingleton(viewName, viewVar);
      }
    }
  }

  _formatSetView(viewName, viewList) {
    if (viewList[0].rawData.name) {
      if (viewList.length > 2) {
        return `${viewList[0].rawData.name} plus ${viewList.length-1} other items`;
      }
      return viewList.map(v => v.rawData.name).join(", ");
    } else {
      return `${viewList.length} items`;
    }
  }

  _formatSingleton(viewName, viewVar) {
    if (viewVar.rawData.name) {
      return viewVar.rawData.name;
    }
  }

  async _formatDescription(viewConnection, view) {
    return (await this._formatDescriptionPattern(viewConnection)) ||
           this._formatViewDescription(viewConnection, view) ||
           this._formatViewType(viewConnection);
  }

  async _formatDescriptionPattern(viewConnection) {
    let chosenConnection = viewConnection;

    // For "out" connection, use its own description
    // For "in" connection, use description of the highest ranked out connection with description.
    if (!chosenConnection.spec.isOutput) {
      let otherConnection = this._selectViewConnection(viewConnection.view);
      if (otherConnection) {
        chosenConnection = otherConnection;
      }
    }

    let chosenParticleDescription = this._particleDescriptions.find(desc => desc._particle == chosenConnection.particle);
    let viewDescription = chosenParticleDescription ? chosenParticleDescription._connections[chosenConnection.name] : null;
    // Add description to result array.
    if (viewDescription) {
      // Add the connection spec's description pattern.
      return await this.patternToSuggestion(viewDescription.pattern, chosenParticleDescription);
    }
  }
  _formatViewDescription(viewConn, view) {
    if (view && view.description) {
      let viewType = this._formatViewType(viewConn);
      // Use the view description available in the arc (if it is different than type name.
      if (view.description != viewType) {
        return view.description;
      }
    }
  }
  _formatViewType(viewConnection) {
    return viewConnection.type.toPrettyString().toLowerCase();
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
      return p2._rank - p1._rank;
    }

    // Sort by number of singleton slots.
    let p1Slots = 0, p2Slots = 0;
    p1._particle.spec.slots.forEach((slotSpec) => { if (!slotSpec.isSet) ++p1Slots; });
    p2._particle.spec.slots.forEach((slotSpec) => { if (!slotSpec.isSet) ++p2Slots; });
    return p2Slots - p1Slots;
  }
}
