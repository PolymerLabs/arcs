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

class DescriptionGenerator {
  constructor(recipe, relevance) {
    this.recipe = recipe;  // this is a Plan (aka resolved Recipe)
    this.relevance = relevance;
    this._descriptionByParticle = new Map();
    this._description = this._generateParticleDescriptions(/* includeAll= */ false);
  }
  get description() {
    return this._description;
  }
  getViewDescription(particleName, connectionName) {
    if (this._descriptionByParticle.has(particleName))
      return this._descriptionByParticle.get(particleName).get(connectionName);
  }
  getViewShortDescription(particleName, connectionName) {
    let description = this.getViewDescription(particleName, connectionName);
    if (description)
      return description.replace(/\([a-zA-Z:, ]*\)/ig, '');
  }
  setViewDescriptions(arc) {
    // TODO: This should iterate arc.particles instead.
    arc.particleViewMaps.forEach((value, key) => {
      value.views.forEach((view, connectionName) => {
        let description = this.getViewShortDescription(value.spec.name, connectionName);
        if (description)
          view.description = description;
      });
    });
  }
  _initDescriptionsByView() {
    this._descriptionsByView = new Map();
    this.recipe.components.forEach(component => {
      let particleSpec = this.recipe.arc.particleSpec(component.particleName);
      component.connections.forEach(connection => {
        let view = connection.view;
        if (!this._descriptionsByView.has(view.id)) {
          this._descriptionsByView.set(view.id,
              { type: view.type, value: this._formatViewValue(view), descriptions: []});
        }
        assert(this._descriptionsByView.get(view.id).type.equals(view.type),
               `Unexpected type for view ${view.id}`);
        // should verify same particle doesn't push twice?
        this._descriptionsByView.get(view.id)["descriptions"].push({
          particleSpec: particleSpec,
          connectionName: connection.name,
          component: component,
          direction: particleSpec.connectionMap.get(connection.name).isOutput ? "out" : "in",
          description: particleSpec.description ? particleSpec.description[connection.name] : undefined
        });
      });
    });
  }
  _generateParticleDescriptions(includeAll) {
    // Generate descriptions for views.
    this.recipe.components.forEach(c => this._descriptionByParticle.set(c.particleName, new Map()));
    this._initDescriptionsByView();
    this._descriptionsByView.forEach((viewDescription, viewId) => {
      viewDescription.descriptions.forEach(desc => {
        let description =
          this._resolveConnectionDescription(desc.connectionName, desc.component, desc.particleSpec);
        this._descriptionByParticle.get(desc.particleSpec.name).set(desc.connectionName, description);
      });
    });
    // Generate descriptions for particles and select ones for the significant ones for displayed suggestion.
    let selectedDescriptions = [];
    this.recipe.components.forEach(component => {
      let particleSpec = this.recipe.arc.particleSpec(component.particleName);
      if (particleSpec.description && particleSpec.description.pattern) {
        let description = this._resolveTokens(particleSpec.description.pattern, component, particleSpec);
        if (description) {
          this._descriptionByParticle.get(component.particleName).set("description", description);
          let particleSpec = this.recipe.arc.particleSpec(component.particleName);
          // Add description of particle that renders to "root" as the first element
          if (particleSpec.renders.reduce((prev, r) => { return r.name.name == "root" || prev; }, false))
            selectedDescriptions.unshift(description);
          else if (particleSpec.renders.length > 0 || includeAll)
            selectedDescriptions.push(description);
        }
      }
    });
    return selectedDescriptions.length > 0 ? selectedDescriptions.join(" and ") : this.recipe.name;
  }
  _resolveTokens(description, recipeComponent, particleSpec) {
    let tokens = description.match(/\${[a-zA-Z0-9::~\.\[\]]+}/g);
    if (!tokens)
      return description;  // no tokens found
    tokens.forEach(token => {
      token = token.match(/^\${([a-zA-Z0-9::~\.\[\]]+)}$/)[1];  // ${viewname} or ${viewname.type}
      let matchers = token.match(/^(.*)\.type$/);
      let viewDescription = null;
      if (matchers) {  // token is ${viewname.type}
        let connection = recipeComponent.findConnectionByName(matchers[1]);
        viewDescription = connection.view.type.toString();
      } else {
        // Executing this twice - 1st to generate the view's description, then if the view is part
        // of the particle description. Should instead call: this.getViewDescription(particleSpec.name, token)
        // here for the latter.
        viewDescription =
          this._resolveConnectionDescription(token, recipeComponent, particleSpec);
      }
      if (!viewDescription) {
        return null;
      }
      description = description.replace(`\$\{${token}\}`, viewDescription);
    });
    return description;
  }

  _resolveConnectionDescription(connectionName, recipeComponent, particleSpec) {
    let connection = recipeComponent.findConnectionByName(connectionName);
    assert(connection, `No connection for ${connectionName} in component ${recipeComponent.name}`);
    let viewDescription = this._descriptionsByView.get(connection.view.id);
    let resultDescription;
    let selectedParticleViewDescription =
        this._selectParticleViewDescription(viewDescription, particleSpec.name);
    if (selectedParticleViewDescription) {
      resultDescription = this._resolveTokens(selectedParticleViewDescription.description,
                                              selectedParticleViewDescription.component,
                                              selectedParticleViewDescription.particleSpec);
    } else {
      if (viewDescription.type.isView || !viewDescription.value) {
        resultDescription = viewDescription.type.toString();
      }
    }
    if (resultDescription) {
      if (viewDescription.value && resultDescription.indexOf(viewDescription.value) < 0)
        return `${resultDescription} (${viewDescription.value})`;
      return resultDescription;
    }
    return viewDescription.value;
  }

  _selectParticleViewDescription(viewDescription, particleName) {
    if (viewDescription.descriptions && viewDescription.descriptions.length > 0) {
      let localDescription = viewDescription.descriptions.reduce((prev, curr) => {
        if (curr.particleSpec.name == particleName) prev = curr; return prev;
      }, null);
      assert(localDescription);
      if (localDescription && localDescription.direction == "out") {
        if (localDescription.description)
          return localDescription;
      }

      let outDescriptions = viewDescription.descriptions.reduce((prev, curr) => {
        if (curr.direction == "out") {
          prev.push(curr);
        }
        return prev;
      }, []);
      outDescriptions.push(localDescription);
      outDescriptions.sort((r1, r2) => {
        if (r1.description != r2.description) {
          return r1.description ? -1 : 1;
        }
        if (r1.particleSpec.name == particleName) {
          return 1;
        }
        if (r2.particleSpec.name == particleName) {
          return -1;
        }
        let rank1 = this.relevance.calcParticleRelevance(r1.particleSpec.name);
        let rank2 = this.relevance.calcParticleRelevance(r1.particleSpec.name);
        return rank2 - rank1;
      });
      if (outDescriptions[0].description)
        return outDescriptions[0];
    }
  }
  _formatViewValue(view) {
    if (view.type.isView) {
      let viewList = view.toList() || this.relevance.newArc._viewMap.get(view).get();
      if (viewList) {
        if (viewList.length > 2) {
          return `<b>${viewList[0].rawData.name}</b> and <b>${viewList.length-1}</b> other items`;
        }
        return viewList.map(v => v.rawData.name).join(", ");
      }
    } else {
      let viewVar = view.get() || this.relevance.newArc._viewMap.get(view).get();
      if (viewVar)
        return viewVar.rawData.name;  // TODO: use type's Entity instead
      }
  }
}

module.exports = DescriptionGenerator;
