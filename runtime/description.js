/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
'use strict';

import {assert} from '../platform/assert-web.js';
import {ParticleSpec} from './particle-spec.js';

export class Description {
  constructor(arc) {
    this._arc = arc;
    this._relevance = null;
  }

  get arc() { return this._arc; }
  get relevance() { return this._relevance; }
  set relevance(relevance) { this._relevance = relevance; }

  async getArcDescription(formatterClass) {
    let desc = await new (formatterClass || DescriptionFormatter)(this).getDescription(this._arc.activeRecipe);
    if (desc) {
      return desc;
    }
  }

  async getRecipeSuggestion(formatterClass) {
    let formatter = await new (formatterClass || DescriptionFormatter)(this);
    let desc = await formatter.getDescription(this._arc.recipes[this._arc.recipes.length - 1]);
    if (desc) {
      return desc;
    }

    return formatter.descriptionFromString(this._arc.activeRecipe.name || Description.defaultDescription);
  }

  async getHandleDescription(recipeHandle) {
    assert(recipeHandle.connections.length > 0, 'handle has no connections?');

    let formatter = new DescriptionFormatter(this);
    formatter.excludeValues = true;
    return await formatter.getHandleDescription(recipeHandle);
  }
}

Description.defaultDescription = 'i\'m feeling lucky';

export class DescriptionFormatter {
  constructor(description) {
    this._description = description;
    this._arc = description._arc;
    this._particleDescriptions = [];

    this.seenHandles = new Set();
    this.seenParticles = new Set();
    this.excludeValues = false;
  }

  async getDescription(recipe) {
    await this._updateDescriptionHandles(this._description);

    if (recipe.pattern) {
      let recipeDesc = await this.patternToSuggestion(recipe.pattern);
      if (recipeDesc) {
        return this._combineSelectedDescriptions([{pattern: recipeDesc}]);
      }
    }

    // Choose particles, sort them by rank and generate suggestions.
    let particlesSet = new Set(recipe.particles);
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

  descriptionFromString(str) {
    return this._capitalizeAndPunctuate(str);
  }

  _isSelectedDescription(desc) {
    return !!desc.pattern;
  }

  async getHandleDescription(recipeHandle) {
    await this._updateDescriptionHandles(this._description);

    let handleConnection = this._selectHandleConnection(recipeHandle) || recipeHandle.connections[0];
    let handle = this._arc.findStoreById(recipeHandle.id);
    return this._formatDescription(handleConnection, handle);
  }

  async _updateDescriptionHandles(description) {
    this._particleDescriptions = [];

    // Combine all particles from direct and inner arcs.
    let innerParticlesByName = {};
    description._arc.recipes.forEach(recipe => {
      let innerArcs = [...recipe.innerArcs.values()];
      innerArcs.forEach(innerArc => {
        innerArc.recipes.forEach(innerRecipe => {
          innerRecipe.particles.forEach(innerParticle => {
            if (!innerParticlesByName[innerParticle.name]) {
              innerParticlesByName[innerParticle.name] = innerParticle;
            }
          });
        });
      });
    });
    let allParticles = description.arc.activeRecipe.particles.concat(Object.values(innerParticlesByName));

    await Promise.all(allParticles.map(async particle => {
      this._particleDescriptions.push(await this._createParticleDescription(particle, description.relevance));
    }));
  }

  async _createParticleDescription(particle, relevance) {
    let pDesc = {
      _particle: particle,
      _connections: {}
    };
    if (relevance) {
      pDesc._rank = relevance.calcParticleRelevance(particle);
    }

    let descByName = await this._getPatternByNameFromDescriptionHandle(particle) || {};
    pDesc = Object.assign(pDesc, this._populateParticleDescription(particle, descByName));
    Object.values(particle.connections).forEach(handleConn => {
      let specConn = particle.spec.connectionMap.get(handleConn.name);
      let pattern = descByName[handleConn.name] || specConn.pattern;
      if (pattern) {
        let handleDescription = {pattern: pattern, _handleConn: handleConn, _handle: this._arc.findStoreById(handleConn.handle.id)};
        pDesc._connections[handleConn.name] = handleDescription;
      }
    });
    return pDesc;
  }

  async _getPatternByNameFromDescriptionHandle(particle) {
    let descriptionConn = particle.connections['descriptions'];
    if (descriptionConn && descriptionConn.handle && descriptionConn.handle.id) {
      let descHandle = this._arc.findStoreById(descriptionConn.handle.id);
      if (descHandle) {
        let descList = await descHandle.toList();
        let descByName = {};
        descList.forEach(d => descByName[d.rawData.key] = d.rawData.value);
        return descByName;
      }
    }
  }

  _populateParticleDescription(particle, descriptionByName) {
    let pattern = descriptionByName['_pattern_'] || particle.spec.pattern;
    return pattern ? {pattern} : {};
  }

  async _combineSelectedDescriptions(selectedDescriptions) {
    let suggestions = [];
    await Promise.all(selectedDescriptions.map(async particle => {
      if (!this.seenParticles.has(particle._particle)) {
        suggestions.push(await this.patternToSuggestion(particle.pattern, particle));
      }
    }));
    let jointDescription = this._joinDescriptions(suggestions);
    if (jointDescription) {
      return this._capitalizeAndPunctuate(jointDescription);
    }
  }

  _joinDescriptions(strings) {
    let nonEmptyStrings = strings.filter(str => str);
    let count = nonEmptyStrings.length;
    if (count > 0) {
      // Combine descriptions into a sentence:
      // "A."
      // "A and b."
      // "A, b, ..., and z." (Oxford comma ftw)
      let delim = ['', '', ' and ', ', and '][Math.min(3, count)];
      const lastString = nonEmptyStrings.pop();
      return `${nonEmptyStrings.join(', ')}${delim}${lastString}`;
    }
  }

  _joinTokens(tokens) {
    return tokens.join('');
  }

  _capitalizeAndPunctuate(sentence) {
    assert(sentence);
    // "Capitalize, punctuate." (if the sentence doesn't end with a punctuation character).
    let last = sentence.length - 1;
    return `${sentence[0].toUpperCase()}${sentence.slice(1, last)}${sentence[last]}${sentence[last].match(/[a-z0-9\(\)'>\]]/i) ? '.' : ''}`;
  }

  async patternToSuggestion(pattern, particleDescription) {
    let tokens = this._initTokens(pattern, particleDescription);
    let tokenPromises = tokens.map(async token => await this.tokenToString(token));
    let tokenResults = await Promise.all(tokenPromises);
    if (tokenResults.filter(res => res == undefined).length == 0) {
      return this._joinTokens(tokenResults);
    }
  }

  _initTokens(pattern, particleDescription) {
    pattern = pattern.replace(/</g, '&lt;');
    let results = [];
    while (pattern.length > 0) {
      let tokens = pattern.match(/\${[a-zA-Z0-9\.]+}(?:\.[_a-zA-Z]+)?/g);
      let firstToken;
      let tokenIndex;
      if (tokens) {
        firstToken = tokens[0];
        tokenIndex = pattern.indexOf(firstToken);
      } else {
        firstToken = '';
        tokenIndex = pattern.length;
      }
      assert(tokenIndex >= 0);
      let nextToken = pattern.substring(0, tokenIndex);
      if (nextToken.length > 0)
        results.push({text: nextToken});
      if (firstToken.length > 0) {
        results.push(this._initHandleToken(firstToken, particleDescription));
      }
      pattern = pattern.substring(tokenIndex + firstToken.length);
    }
    return results;
  }

  _initHandleToken(pattern, particleDescription) {
    let valueTokens = pattern.match(/\${([a-zA-Z0-9\.]+)}(?:\.([_a-zA-Z]+))?/);
    let handleNames = valueTokens[1].split('.');
    let extra = valueTokens.length == 3 ? valueTokens[2] : undefined;
    let valueToken;

    // Fetch the particle description by name from the value token - if it wasn't passed, this is a recipe description.
    if (!particleDescription) {
      assert(handleNames.length > 1, `'${valueTokens[1]}' must contain dot-separated particle and handle connection name.`);
      let particleName = handleNames.shift();
      assert(particleName[0] === particleName[0].toUpperCase(), `Expected particle name, got '${particleName}' instead.`);
      let particleDescriptions = this._particleDescriptions.filter(desc => desc._particle.name == particleName);
      assert(particleDescriptions.length > 0, `Cannot find particles with name ${particleName}.`);
      if (particleDescriptions.length > 1) {
        console.warn(`Multiple particles with name ${particleName}.`);
      }
      particleDescription = particleDescriptions[0];
    }
    let particle = particleDescription._particle;

    let handleConn = particle.connections[handleNames[0]];
    if (handleConn) { // handle connection
      assert(handleConn.handle && handleConn.handle.id, 'Missing id???');
      return {
        fullName: valueTokens[0],
        handleName: handleConn.name,
        properties: handleNames.splice(1),
        extra,
        _handleConn: handleConn,
        _handle: this._arc.findStoreById(handleConn.handle.id)};
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
    if (token.handleName) {
      return this._handleTokenToString(token);
    } else if (token.consumeSlotName && token.provideSlotName) {
      return this._slotTokenToString(token);
    }
    assert(false, 'no handle or slot name');
  }

  async _handleTokenToString(token) {
    switch (token.extra) {
      case '_type_':
        return token._handleConn.type.toPrettyString().toLowerCase();
      case '_values_':
        return this._formatHandleValue(token.handleName, token._handle);
      case '_name_':
        return this._formatDescription(token._handleConn, token._handle);
      default: {
        assert(!token.extra, `Unrecognized extra ${token.extra}`);

        // Transformation's hosted particle.
        if (token._handleConn.type.isInterface) {
          let particleSpec = ParticleSpec.fromLiteral(await token._handle.get());
          // TODO: call this.patternToSuggestion(...) to resolved expressions in the pattern template.
          return particleSpec.pattern;
        }

        // singleton handle property.
        if (token.properties && token.properties.length > 0) {
          return this._propertyTokenToString(token.handleName, token._handle, token.properties);
        }

        // full handle description
        let description = (await this._formatDescriptionPattern(token._handleConn)) ||
                          this._formatHandleDescription(token._handleConn, token._handle);
        let handleValue = await this._formatHandleValue(token.handleName, token._handle);
        if (!description) {
          // For singleton handle, if there is no real description (the type was used), use the plain value for description.
          if (handleValue && !token._handle.type.isCollection && !this.excludeValues) {
            return handleValue;
          }
        }

        description = description || this._formatHandleType(token._handleConn);
        if (handleValue && !this.excludeValues && !this.seenHandles.has(token._handle.id)) {
          this.seenHandles.add(token._handle.id);
          return this._combineDescriptionAndValue(token, description, handleValue);
        }
        return description;
      }
    }
  }

  _combineDescriptionAndValue(token, description, handleValue) {
    return `${description} (${handleValue})`;
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

  async _propertyTokenToString(handleName, handle, properties) {
    assert(!handle.type.isCollection, `Cannot return property ${properties.join(',')} for collection`);
    // Use singleton value's property (eg. "09/15" for person's birthday)
    let handleVar = await handle.get();
    if (handleVar) {
      let value = handleVar.rawData;
      properties.forEach(p => {
        if (value) {
          value = value[p];
        }
      });
      if (value) {
        return this._formatEntityProperty(handleName, properties, value);
      }
    }
  }

  _formatEntityProperty(handleName, properties, value) {
    return value;
  }

  async _formatHandleValue(handleName, handle) {
    if (!handle) {
      return;
    }
    if (handle.type.isCollection) {
      let handleList = await handle.toList();
      if (handleList && handleList.length > 0) {
        return this._formatSetHandle(handleName, handleList);
      }
    } else {
      let handleVar = await handle.get();
      if (handleVar) {
        return this._formatSingleton(handleName, handleVar, handle.type.data.description.value);
      }
    }
  }

  _formatSetHandle(handleName, handleList) {
    if (handleList[0].rawData.name) {
      if (handleList.length > 2) {
        return `${handleList[0].rawData.name} plus ${handleList.length-1} other items`;
      }
      return handleList.map(v => v.rawData.name).join(', ');
    } else {
      return `${handleList.length} items`;
    }
  }

  _formatSingleton(handleName, handleVar, handleDescription) {
    if (handleDescription) {
      let valueDescription = handleDescription;
      let matches;
      while (matches = valueDescription.match(/\${([a-zA-Z0-9\.]+)}/)) {
        valueDescription = valueDescription.replace(matches[0], handleVar.rawData[matches[1]]);
      }
      return valueDescription;
    }
    if (handleVar.rawData.name) {
      return handleVar.rawData.name;
    }
  }

  async _formatDescription(handleConnection, handle) {
    return (await this._formatDescriptionPattern(handleConnection)) ||
           this._formatHandleDescription(handleConnection, handle) ||
           this._formatHandleType(handleConnection);
  }

  async _formatDescriptionPattern(handleConnection) {
    let chosenConnection = handleConnection;

    // For "out" connection, use its own description
    // For "in" connection, use description of the highest ranked out connection with description.
    if (!chosenConnection.spec.isOutput) {
      let otherConnection = this._selectHandleConnection(handleConnection.handle);
      if (otherConnection) {
        chosenConnection = otherConnection;
      }
    }

    let chosenParticleDescription = this._particleDescriptions.find(desc => desc._particle == chosenConnection.particle);
    let handleDescription = chosenParticleDescription ? chosenParticleDescription._connections[chosenConnection.name] : null;
    // Add description to result array.
    if (handleDescription) {
      // Add the connection spec's description pattern.
      return await this.patternToSuggestion(handleDescription.pattern, chosenParticleDescription);
    }
  }
  _formatHandleDescription(handleConn, handle) {
    if (handle) {
      let handleDescription = this._arc.getStoreDescription(handle);
      let handleType = this._formatHandleType(handleConn);
      // Use the handle description available in the arc (if it is different than type name).
      if (!!handleDescription && handleDescription != handleType) {
        return handleDescription;
      }
    }
  }
  _formatHandleType(handleConnection) {
    return handleConnection.type.toPrettyString().toLowerCase();
  }

  _selectHandleConnection(recipeHandle) {
    let possibleConnections = recipeHandle.connections.filter(connection => {
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
    let isRoot = (slotSpec) => slotSpec.name == 'root' || slotSpec.tags.includes('root');
    // Root slot comes first.
    let hasRoot1 = Boolean([...p1._particle.spec.slots.values()].find(slotSpec => isRoot(slotSpec)));
    let hasRoot2 = Boolean([...p2._particle.spec.slots.values()].find(slotSpec => isRoot(slotSpec)));
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
