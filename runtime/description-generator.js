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
var Arc = require('./arc.js');
var Recipe = require('./recipe.js');
var Type = require('./type.js');
var TypeLiteral = require('./type-literal.js');

class DescriptionGenerator {
  constructor(recipe, relevance) {
    this.recipe = recipe;  // this is a Plan (aka resolved Recipe)
    this.relevance = relevance;
    this._descriptionByParticleName = new Map();
    this._description = this._init(/* includeAll= */ false) || this.recipe.name;
  }
  // Initializes the descriptions.
  // |includeAll| determines whether all particles are included or only the ones that render UI.
  _init(includeAll) {
    let selectedDescriptions = [];
    this.recipe.components.forEach(component => {
      let description = this.generateDescription(component);
      if (!description) return;
      this._descriptionByParticleName.set(component.particleName, description);
      let particleSpec = this.recipe.arc.particleSpec(component.particleName);
      // Add description of particle that renders to "root" as the first element
      if (particleSpec.renders.reduce((prev, r) => { return r.name.name == "root" || prev; }, false))
        selectedDescriptions.unshift(description);
      else if (particleSpec.renders.length > 0 || includeAll)
        selectedDescriptions.push(description);
    });
    return selectedDescriptions.join(" and ");
  }
  getDescription() {
    return this._description;
  }
  generateDescription(recipeComponent) {
    let particleSpec = this.recipe.arc.particleSpec(recipeComponent.particleName);
    if (particleSpec.transient)
      return;  // skip transient particles.
    if (!particleSpec.description || !particleSpec.description.pattern)
      return;  // skip particles with no description
    return this._resolveDescription(particleSpec.description.pattern, particleSpec, recipeComponent);
  }
  // Resolves description sentence, supporting both - the particle's full description pattern,
  // or particle parameter description.
  _resolveDescription(description, particleSpec, recipeComponent) {
    let tokens = description.match(/\${[a-zA-Z0-9::~\[\]]+}/g);
    if (!tokens)
      return description;  // no tokens found
    tokens.forEach(token => {
      token = token.match(/^\${([a-zA-Z0-9::~\[\]]+)}$/)[1];
      let resolvedToken = this._resolveToken(token, particleSpec, recipeComponent);
      if (resolvedToken) {
        description = description.replace(`\$\{${token}\}`, resolvedToken);
      } else {
        return null;  // token failed to resolve.
      }
    });
    return description;
  }
  _resolveToken(token, particleSpec, recipeComponent) {
    // Try resolve the token as particle parameter
    let resolvedToken = this._resolveParticleParam(token, particleSpec, recipeComponent,
        /* useBindings= */ particleSpec.isInput(token));
    if (resolvedToken) return resolvedToken;

    // Try resolve the token as template type
    return this.tryResolveTemplateType(token, particleSpec, recipeComponent);
  }
  _resolveParticleParam(paramName, particleSpec, recipeComponent, useBindings) {
    // If |useBindings| is true, construct parameter description from other particles that output
    // to the same view.
    if (useBindings) {
      // Find the name of the view, this parameter is bound to by resolver
      let resolvedViewName = recipeComponent.findConnectionByName(paramName).constraintName;
      if (resolvedViewName) {
        // Find particles that have same view bound and "out" parameter.
        let outViewDescription = this._resolveOutputConnection(resolvedViewName, particleSpec.name);
        if (outViewDescription) return outViewDescription;
      }
    }
    // This view is not an "out"/"create" param of any view.
    let localDescription = this._resolveLocalParamName(paramName, particleSpec, recipeComponent);
    if (localDescription) return localDescription;
    return null;
  }
  tryResolveTemplateType(typeToken, particleSpec, recipeComponent) {
    let results = typeToken.match(/^\[~([a-z])\]$/);  // Try match template list type, eg [~a]
    if (results && results.length > 0)
      return this._resolveTemplateTypeList(Type.typeVariable(results[1]).viewOf(), recipeComponent);
    results = typeToken.match(/^~([a-z])$/);  // Try match template singleton type, eg ~a
    if (results && results.length > 0)
      return this._resolveTemplateTypeSingleton(Type.typeVariable(results[1]), recipeComponent);
    return null;
  }
  // TODO(mmandlis): resolving repeated and singleton types shouldn't be so different.
  // Should Resolver set rawType for both, so that simple comparison would suffice?
  _resolveTemplateTypeList(templateType, recipeComponent) {
    for (let connection of recipeComponent.connections)
      if (connection.spec && connection.spec.rawData && connection.spec.rawData.type &&
          templateType.equals(Type.fromLiteral(connection.spec.rawData.type)))
        return Type.fromLiteral(connection.type.key);
  }
  _resolveTemplateTypeSingleton(templateType, recipeComponent) {
    for (let connection of recipeComponent.connections)
      if (connection.rawType == templateType.key.name)
        return Type.fromLiteral(connection.type.key);
  }
  _resolveOutputConnection(viewName, requestingParticleName) {
    return this.recipe.components.reduce((curr, recipeComponent) => {
      // Skip requesting particle
      if (recipeComponent.particleName == requestingParticleName) return curr;
      // Find output connection
      let connection = recipeComponent.findConnectionByConstraintName(viewName);
      let particleSpec = this.recipe.arc.particleSpec(recipeComponent.particleName);
      if (!connection || !particleSpec.isOutput(connection.name)) return curr;
      // Evaluate rank and use highest ranked description.
      let rank = this.relevance.calcParticleRelevance(particleSpec.name);
      if (curr.rank < rank) {
        let description = this._resolveToken(connection.name, particleSpec, recipeComponent);
        if (description) {
          curr.description = description;
          curr.rank = rank;
        }
      }
      return curr;
    }, {rank:-1, description:null}).description;
  }
  // Resolve the given particleSpec's param name (independent of the rest of the components of the recipe)
  _resolveLocalParamName(paramName, particleSpec, recipeComponent) {
    // Use param's description, if available
    let paramDescription = particleSpec.description && particleSpec.description[paramName];
    if (paramDescription) {
      let resolvedDescription = this._resolveDescription(paramDescription, particleSpec, recipeComponent);
      if (resolvedDescription) return resolvedDescription;
      console.warn(`Failed resolving description ${paramDescription} for ${paramName} in ${particleSpec.name}`);
    }
    let particleConnection = particleSpec.connectionMap.get(paramName);
    if (particleConnection) {
      let type = particleConnection.type;
      if (type.isVariable) {  // Resolve singleton template type
        type = this._resolveTemplateTypeSingleton(type, recipeComponent);
      } else if (type.hasVariable) {  // Resolve list template type
        type = this._resolveTemplateTypeList(type, recipeComponent);
      }
      if (!type) return null;

      let result = type.toString();
      if (type.isView) {
        let realValue = this._getViewList(paramName, recipeComponent);
        if (realValue) {
          result = `${result} (${realValue})`;
        }
      } else {
        // TODO(mmandlis): check that the value isn't too long.
        let realValue = this._getViewValue(paramName, recipeComponent);
        if (realValue) {
          result = realValue;
        }
      }
      // TODO(mmandlis): need to handle relations here?
      return result;
    }
    return null;
  }
  _getViewValue(paramName, recipeComponent) {
    return this._getViewValueFromArc(paramName, recipeComponent, this.relevance.newArc) ||
           this._getViewValueFromArc(paramName, recipeComponent, this.recipe.arc);
  }
  _getViewValueFromArc(paramName, recipeComponent, arc) {
    let view = this._getViewFromArc(paramName, recipeComponent, arc);
    let viewVar = view ? view.get() : null;
    if (viewVar)
      return viewVar.rawData.name;
  }
  _getViewList(paramName, recipeComponent) {
    return this._getViewListFromArc(paramName, recipeComponent, this.relevance.newArc) ||
           this._getViewListFromArc(paramName, recipeComponent, this.recipe.arc);
  }
  _getViewListFromArc(paramName, recipeComponent, arc) {
    let view = this._getViewFromArc(paramName, recipeComponent, arc);
    let viewList = view ? view.toList() : null;
    if (viewList)
      return viewList.map(v => v.rawData.name).join(", ");
  }
  _getViewFromArc(paramName, recipeComponent, arc) {
    let connection = recipeComponent.findConnectionByName(paramName);
    if (connection && connection.view) {
      return arc.viewById(connection.view.id) ||
             (arc._viewMap && arc._viewMap.get(connection.view));
    }
  }
}

module.exports = DescriptionGenerator;
