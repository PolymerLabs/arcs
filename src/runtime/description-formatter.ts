/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';

import {isRoot} from './particle-spec.js';
import {HandleConnection} from './recipe/handle-connection.js';
import {Handle} from './recipe/handle.js';
import {Particle} from './recipe/particle.js';
import {BigCollectionType, CollectionType, InterfaceType} from './type.js';
import {ModelValue} from './storage/crdt-collection-model.js';
import {Dictionary} from './hot.js';

export type ParticleDescription = {
  _particle: Particle,
  pattern?: string,
  _connections: Dictionary<HandleDescription>,
  _rank?: number
};

export type HandleDescription = {pattern: string, _handleConn: HandleConnection, value: DescriptionValue};
export type DescriptionValue = {entityValue?: string|{}, valueDescription?: string, collectionValues?: ModelValue[], bigCollectionValues?: string[], interfaceValue?: string | {}};

export type CombinedDescriptionsOptions = {skipFormatting?: boolean};

export class DescriptionFormatter {
  private seenHandles: Set<Handle> = new Set();
  seenParticles: Set<Particle> = new Set();
  excludeValues = false;

  constructor(private readonly particleDescriptions = <ParticleDescription[]>[],
              private readonly storeDescById: Dictionary<string> = {}) {}

  getDescription(recipe: {patterns: string[], particles: Particle[]}) {
    if (recipe.patterns.length > 0) {
      let recipePatterns = [];
      for (const pattern of recipe.patterns) {
        recipePatterns.push(this.patternToSuggestion(pattern, {_recipe: recipe}));
      }
      recipePatterns = recipePatterns.filter(pattern => Boolean(pattern));
      if (recipePatterns.length > 0) {
        // TODO(mmandlis): Sort the descriptions.
        return this._capitalizeAndPunctuate(this._joinDescriptions(recipePatterns));
      }
    }

    // Choose particles, sort them by rank and generate suggestions.
    const particlesSet = new Set(recipe.particles);
    let selectedDescriptions = this.particleDescriptions
      .filter(desc => (particlesSet.has(desc._particle) && this._isSelectedDescription(desc)));
    // Prefer particles that render UI, if any.
    if (selectedDescriptions.find(desc => (desc._particle.spec.slotConnections.size > 0))) {
      selectedDescriptions = selectedDescriptions.filter(desc => (desc._particle.spec.slotConnections.size > 0));
    }
    selectedDescriptions = selectedDescriptions.sort(DescriptionFormatter.sort);

    if (selectedDescriptions.length > 0) {
      return this._combineSelectedDescriptions(selectedDescriptions);
    }
    return undefined;
  }

  _isSelectedDescription(desc: ParticleDescription): boolean {
    return !!desc.pattern;
  }

  getHandleDescription(recipeHandle: Handle) {
    const handleConnection = this._selectHandleConnection(recipeHandle) || recipeHandle.connections[0];
    return this._formatDescription(handleConnection);
  }

  // TODO(mmandlis): the override of this function in subclasses also overrides the output. We'll need to unify
  // this into an output type hierarchy before we can assign a useful type to the output of this function.
  // tslint:disable-next-line: no-any
  _combineSelectedDescriptions(selectedDescriptions: ParticleDescription[], options: CombinedDescriptionsOptions = {}) {
    const suggestions = [];
    selectedDescriptions.forEach(particle => {
      if (!this.seenParticles.has(particle._particle)) {
        suggestions.push(this.patternToSuggestion(particle.pattern, particle));
      }
    });
    const jointDescription = this._joinDescriptions(suggestions);
    if (jointDescription) {
      if (options.skipFormatting) {
        return jointDescription;
      } else {
        return this._capitalizeAndPunctuate(jointDescription);
      }
    }
    return undefined;
  }

  // TODO(mmandlis): the override of this function in subclasses also overrides the output. We'll need to unify
  // this into an output type hierarchy before we can assign a useful type to the output of this function.
  // tslint:disable-next-line: no-any
  _joinDescriptions(strings): any {
    const nonEmptyStrings = strings.filter(str => str);
    const count = nonEmptyStrings.length;
    if (count > 0) {
      // Combine descriptions into a sentence:
      // "A."
      // "A and b."
      // "A, b, ..., and z." (Oxford comma ftw)
      const delim = ['', '', ' and ', ', and '][Math.min(3, count)];
      const lastString = nonEmptyStrings.pop();
      return `${nonEmptyStrings.join(', ')}${delim}${lastString}`;
    }
    return undefined;
  }

  _joinTokens(tokens) {
    return tokens.join('');
  }

  _capitalizeAndPunctuate(sentence) {
    assert(sentence);
    // "Capitalize, punctuate." (if the sentence doesn't end with a punctuation character).
    const last = sentence.length - 1;
    return `${sentence[0].toUpperCase()}${sentence.slice(1, last)}${sentence[last]}${sentence[last].match(/[a-z0-9()' >\]]/i) ? '.' : ''}`;
  }

  patternToSuggestion(pattern: string, particleDescription) {
    const tokens = this._initTokens(pattern, particleDescription);
    const tokenResults = tokens.map(token => this.tokenToString(token));
    if (tokenResults.filter(res => res == undefined).length === 0) {
      return this._joinTokens(tokenResults);
    }
    return undefined;
  }

  static readonly tokensRegex = /\${[a-zA-Z0-9.]+}(?:\.[_a-zA-Z]+)?/g;
  static readonly tokensInnerRegex = /\${([a-zA-Z0-9.]+)}(?:\.([_a-zA-Z]+))?/;

  _initTokens(pattern: string, particleDescription) {
    pattern = pattern.replace(/</g, '&lt;');
    let results = [];
    while (pattern.length > 0) {
      const tokens = pattern.match(DescriptionFormatter.tokensRegex);
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
      const nextToken = pattern.substring(0, tokenIndex);
      if (nextToken.length > 0) {
        results.push({text: nextToken});
      }
      if (firstToken.length > 0) {
        results = results.concat(this._initSubTokens(firstToken, particleDescription));
      }
      pattern = pattern.substring(tokenIndex + firstToken.length);
    }
    return results;
  }

  _initSubTokens(pattern, particleDescription): {}[] {
    const valueTokens = pattern.match(DescriptionFormatter.tokensInnerRegex);
    const handleNames = valueTokens[1].split('.');
    const extra = valueTokens.length === 3 ? valueTokens[2] : undefined;

    // Fetch the particle description by name from the value token - if it wasn't passed, this is a recipe description.
    if (!particleDescription._particle) {
      const particleName = handleNames.shift();
      if (particleName[0] !== particleName[0].toUpperCase()) {
        console.warn(`Invalid particle name '${particleName}' - must start with a capital letter.`);
        return [];
      }
      const particleDescriptions = this.particleDescriptions.filter(desc => {
        return desc._particle.name === particleName
            // The particle description is from the current recipe.
            && particleDescription._recipe.particles.find(p => p === desc._particle);
      });

      if (particleDescriptions.length === 0) {
        console.warn(`Cannot find particles with name ${particleName}.`);
        return [];
      }
      // Note: when an arc's active recipes contains several recipes, the last recipe's description
      // is used as the arc's description. If this last recipe's description has a description pattern
      // that references a particle that is also used in one of the previous recipes,
      // there will be a duplicate particle-description.
      particleDescription = particleDescriptions[particleDescriptions.length - 1];
    }
    const particle: Particle = particleDescription._particle;

    if (handleNames.length === 0) {
      // return a particle token
      return [{
        particleName: particle.spec.name,
        particleDescription
      }];
    }

    const handleConn = particle.connections[handleNames[0]];
    if (handleConn) { // handle connection
      assert(handleConn.handle, 'Missing handle???');
      return [{
        fullName: valueTokens[0],
        handleName: handleConn.name,
        storeId: handleConn.handle.id,
        properties: handleNames.splice(1),
        extra,
        _handleConn: handleConn,
        value: particleDescription._connections[handleConn.name].value
      }];
    }

    // slot connection
    if (handleNames.length !== 2) {
      if (handleNames.length === 1) {
        console.warn(`Unknown handle connection name '${handleNames[0]}'`);
      } else {
        console.warn(`Slot connections tokens must have exactly 2 names, found ${handleNames.length} in '${handleNames.join('.')}'`);
      }
      return [];
    }

    const providedSlotConn = particle.getSlotConnectionByName(handleNames[0]).providedSlots[handleNames[1]];
    assert(providedSlotConn, `Could not find handle ${handleNames.join('.')}`);
    return [{
      fullName: valueTokens[0],
      consumeSlotName: handleNames[0],
      provideSlotName: handleNames[1],
      extra,
      _providedSlotConn: providedSlotConn
    }];
  }

  tokenToString(token) {
    if (token.text) {
      return token.text;
    }
    if (token.particleName) {
      return this._particleTokenToString(token);
    }
    if (token.handleName) {
      return this._handleTokenToString(token);
    } else if (token.consumeSlotName && token.provideSlotName) {
      return this._slotTokenToString(token);
    }
    throw new Error('no handle or slot name');
  }

  _particleTokenToString(token) {
    return this._combineSelectedDescriptions([token.particleDescription], {skipFormatting: true});
  }

  _handleTokenToString(token) {
    switch (token.extra) {
      case '_type_':
        return token._handleConn.type.toPrettyString().toLowerCase();
      case '_values_':
        return this._formatStoreValue(token.handleName, token.value);
      case '_name_':
        return this._formatDescription(token._handleConn);
      default: {
        assert(!token.extra, `Unrecognized extra ${token.extra}`);

        // Transformation's hosted particle.
        if (token._handleConn.type instanceof InterfaceType) {
          if (!token.value) {
            return undefined;
          }
          assert(token.value.interfaceValue, `Missing interface type value for '${token._handleConn.type}'.`);
          const particleSpec = token.value.interfaceValue;
          // TODO: call this.patternToSuggestion(...) to resolved expressions in the pattern template.
          return particleSpec.pattern;
        }

        // singleton handle property.
        if (token.properties && token.properties.length > 0) {
          return this._propertyTokenToString(token.handleName, token.value, token.properties);
        }

        // full handle description
        let description = this._formatDescriptionPattern(token._handleConn) ||
                          this._formatStoreDescription(token._handleConn);
        const storeValue = this._formatStoreValue(token.handleName, token.value);
        if (!description) {
          // For singleton handle, if there is no real description (the type was used), use the plain value for description.
          // TODO: should this look at type.getContainedType() (which includes references), or maybe just check for EntityType?
          const storeType = token._handleConn.type;
          if (storeValue && !this.excludeValues &&
              !(storeType instanceof CollectionType) && !(storeType instanceof BigCollectionType)) {
            return storeValue;
          }
        }

        description = description || this._formatHandleType(token._handleConn);
        if (storeValue && !this.excludeValues && !this.seenHandles.has(token.storeId)) {
          this.seenHandles.add(token.storeId);
          return this._combineDescriptionAndValue(token, description, storeValue);
        }
        return description;
      }
    }
  }

  _combineDescriptionAndValue(token, description, storeValue) {
    if (description === storeValue) {
      return description;
    }
    return `${description} (${storeValue})`;
  }

  _slotTokenToString(token) {
    switch (token.extra) {
      case '_empty_':
        // TODO: also return false, if the consuming particles generate an empty description.
        return token._providedSlotConn.consumeConnections.length === 0;
      default:
        assert(!token.extra, `Unrecognized slot extra ${token.extra}`);
    }

    const results = token._providedSlotConn.consumeConnections.map(consumeConn => {
      const particle = consumeConn.particle;
      const particleDescription = this.particleDescriptions.find(desc => desc._particle === particle);
      this.seenParticles.add(particle);
      return this.patternToSuggestion(particle.spec.pattern, particleDescription);
    });

    return this._joinDescriptions(results);
  }

  _propertyTokenToString(handleName: string, value: DescriptionValue, properties: string[]) {
    if (!value) {
      return '';
    }
    assert(value.entityValue, `Cannot return property ${properties.join(',')} for non EntityType.`);
    // Use singleton value's property (eg. "09/15" for person's birthday)
    const valueVar = value.entityValue;
    if (value.entityValue) {
      let propertyValue = value.entityValue;
      for (const property of properties) {
        if (propertyValue) {
          propertyValue = propertyValue[property];
        }
      }
      if (propertyValue) {
        return this._formatEntityProperty(handleName, properties, propertyValue);
      }
    }
  }

  _formatEntityProperty(handleName, properties, value) {
    return value;
  }

  _formatStoreValue(handleName: string, value: DescriptionValue) {
    if (value) {
      if (value.collectionValues) {
        return this._formatCollection(handleName, value.collectionValues);
      }
      if (value.bigCollectionValues) {
        return this._formatBigCollection(handleName, value.bigCollectionValues);
      }
      if (value.entityValue) {
        return this._formatSingleton(handleName, value);
      }
      throw new Error(`invalid store type for handle ${handleName}`);
    }
    return undefined;
  }

  _formatCollection(handleName, values) {
    if (values[0].name) {
      if (values.length > 2) {
        return `${values[0].name} plus ${values.length-1} other items`;
      }
      return values.map(v => v.name).join(', ');
    } else {
      return `${values.length} items`;
    }
  }

  // TODO(mmandlis): the override of this function in subclasses also overrides the output. We'll need to unify
  // this into an output type hierarchy before we can assign a useful type to the output of this function.
  // tslint:disable-next-line: no-any
  _formatBigCollection(handleName, firstValue): any {
    return `collection of items like ${firstValue.rawData.name}`;
  }

  _formatSingleton(handleName: string, value: DescriptionValue) {
    const entityValue = value.entityValue;
    if (value.valueDescription) {
      let valueDescription = value.valueDescription;
      let matches;
      while (matches = valueDescription.match(/\${([a-zA-Z0-9.]+)}/)) {
        valueDescription = valueDescription.replace(matches[0], entityValue[matches[1]]);
      }
      return valueDescription;
    }
    if (entityValue['name']) {
      return entityValue['name'];
    }
  }

  _formatDescription(handleConnection) {
    return this._formatDescriptionPattern(handleConnection) ||
           this._formatStoreDescription(handleConnection) ||
           this._formatHandleType(handleConnection);
  }

  _formatDescriptionPattern(handleConnection): string|undefined {
    let chosenConnection = handleConnection;

    // For "out" connection, use its own description
    // For "in" connection, use description of the highest ranked out connection with description.
    if (!chosenConnection.spec.isOutput) {
      const otherConnection = this._selectHandleConnection(handleConnection.handle);
      if (otherConnection) {
        chosenConnection = otherConnection;
      }
    }

    const chosenParticleDescription = this.particleDescriptions.find(desc => desc._particle === chosenConnection.particle);
    const handleDescription = chosenParticleDescription ? chosenParticleDescription._connections[chosenConnection.name] : null;
    // Add description to result array.
    if (handleDescription && handleDescription.pattern) {
      // Add the connection spec's description pattern.
      return this.patternToSuggestion(handleDescription.pattern, chosenParticleDescription);
    }
    return undefined;
  }

  _formatStoreDescription(handleConn): string|undefined {
    if (handleConn.handle) {
      if (!handleConn.handle.id) {
        return undefined;
      }
      const storeDescription = this.storeDescById[handleConn.handle.id];
      const handleType = this._formatHandleType(handleConn);
      // Use the handle description available in the arc (if it is different than type name).
      if (!!storeDescription && storeDescription !== handleType) {
        return storeDescription;
      }
    }
    return undefined;
  }
  _formatHandleType(handleConnection): string {
    const type = handleConnection.handle && handleConnection.handle.type.isResolved() ? handleConnection.handle.type : handleConnection.type;
    return type.toPrettyString().toLowerCase();
  }

  _selectHandleConnection(recipeHandle) {
    const possibleConnections = recipeHandle.connections.filter(connection => {
      // Choose connections with patterns (manifest-based or dynamic).
      const connectionSpec = connection.spec;
      const particleDescription = this.particleDescriptions.find(desc => desc._particle === connection.particle);
      // TODO(sjmiles): added particleDescription null-check for
      // the moment, but we need to root cause this problem
      return !!connectionSpec.pattern ||
        (!!particleDescription && !!particleDescription._connections[connection.name].pattern);
    });

    possibleConnections.sort((c1, c2) => {
      const isOutput1 = c1.spec.isOutput;
      const isOutput2 = c2.spec.isOutput;
      if (isOutput1 !== isOutput2) {
        // Prefer output connections
        return isOutput1 ? -1 : 1;
      }

      const d1 = this.particleDescriptions.find(desc => desc._particle === c1.particle);
      const d2 = this.particleDescriptions.find(desc => desc._particle === c2.particle);
      // Sort by particle's rank in descending order.
      return d2._rank - d1._rank;
    });

    if (possibleConnections.length > 0) {
      return possibleConnections[0];
    }
  }

  static sort(p1: ParticleDescription, p2: ParticleDescription) {
    // Root slot comes first.
    const hasRoot1 = [...p1._particle.spec.slotConnections.values()].some(slotSpec => isRoot(slotSpec));
    const hasRoot2 = [...p2._particle.spec.slotConnections.values()].some(slotSpec => isRoot(slotSpec));
    if (hasRoot1 !== hasRoot2) {
      return hasRoot1 ? -1 : 1;
    }

    // Sort by rank
    if (p1._rank !== p2._rank) {
      return p2._rank - p1._rank;
    }

    // Sort by number of singleton slots.
    let p1Slots = 0;
    let p2Slots = 0;
    p1._particle.spec.slotConnections.forEach((slotSpec) => { if (!slotSpec.isSet) ++p1Slots; });
    p2._particle.spec.slotConnections.forEach((slotSpec) => { if (!slotSpec.isSet) ++p2Slots; });
    return p2Slots - p1Slots;
  }
}
