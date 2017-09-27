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

class DescriptionGenerator {
  constructor(recipe, relevance) {
    this.recipe = recipe;  // this is a Plan (aka resolved Recipe)
    this.relevance = relevance;
    this._descriptionByParticle = new Map();
    this._seenViews = new Set();
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
    if (description) {
      // Removing view values from the description.
      // TODO: use placeholder for view values and reference to the view itself instead, and populate on demand.
      return description.replace(/ \([a-zA-Z0-9:, <>\/]*\)/ig, '');
    }
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
    this.recipe.particles.forEach(particle => {
      Object.values(particle.connections).forEach(connection => {
        let view = connection.view;
        if (!this._descriptionsByView.has(view)) {
          this._descriptionsByView.set(view,
              { create: view.create, type: connection.type, value: this._formatViewValue(view), descriptions: []});
        }
        assert(this._descriptionsByView.get(view).type.equals(connection.type),
               `Unexpected type for view ${view}`);
        let description = particle.spec.description ? particle.spec.description[connection.name] : undefined;
        if (!description) {
          if (view.id) {
            description = this.relevance.newArc.findViewById(view.id).description;
          }
        }
        // should verify same particle doesn't push twice?
        this._descriptionsByView.get(view)["descriptions"].push({
          connectionName: connection.name,
          recipeParticle: particle,
          direction: particle.spec.connectionMap.get(connection.name).isOutput ? "out" : "in",
          description
        });
      });
    });
  }
  _generateParticleDescriptions(includeAll) {
    // Generate descriptions for views.
    this.recipe.particles.forEach(p => this._descriptionByParticle.set(p.name, new Map()));
    this._initDescriptionsByView();
    this._descriptionsByView.forEach((viewDescription, viewId) => {
      viewDescription.descriptions.forEach(desc => {
        let description =
          this._resolveConnectionDescription(desc.connectionName, desc.recipeParticle);
        this._descriptionByParticle.get(desc.recipeParticle.spec.name).set(desc.connectionName, description);
      });
    });
    // Select all particles descriptions to be displayed.
    let selectedDescriptions = [];
    this._seenViews.clear();
    this.recipe.particles.sort(this._sortParticles).forEach(particle => {
      if (particle.spec.description && particle.spec.description.pattern) {
        let description = this._resolveTokens(particle.spec.description.pattern, particle);
        if (description && (Object.keys(particle.consumedSlotConnections).length > 0 || includeAll)) {
          selectedDescriptions.push(description);
          Object.values(particle.connections).forEach(conn => this._seenViews.add(conn.view.id));
        }
      }
    });
    // Return recipe name by default.
    let desc = this.recipe.name;
    // Maybe combine descriptions into a sentence.
    let count = selectedDescriptions.length;
    if (count) {
      // "A."
      // "A and b."
      // "A, b, ..., and z." (Oxford comma ftw)
      let delim = ['', '', ' and ', ', and '][count > 2 ? 3 : count];
      desc = selectedDescriptions.slice(0,-1).join(", ") + delim + selectedDescriptions.pop();
      // "Capitalize, punctuate."
      desc = desc[0].toUpperCase() + desc.slice(1) + '.';
    }
    return desc;
  }
  _sortParticles(p1, p2) {
    // Root slot comes first.
    if (Object.keys(p1.consumedSlotConnections).indexOf("root") >= 0)
      return -1;
    if (Object.keys(p2.consumedSlotConnections).indexOf("root") >= 0)
      return 1;
    let p1Slots = 0, p2Slots = 0;
    p1.spec.slots.forEach((slotSpec) => { if (!slotSpec.isSet) ++p1Slots; });
    p2.spec.slots.forEach((slotSpec) => { if (!slotSpec.isSet) ++p2Slots; });
    // The particle with most singleton slots is displayed first.
    return p2Slots - p1Slots;
  }
  _resolveTokens(description, recipeParticle) {
    let tokens = description.match(/\${[a-zA-Z0-9::~\.\[\]]+}/g);
    if (!tokens)
      return description;  // no tokens found
    tokens.forEach(token => {
      token = token.match(/^\${([a-zA-Z0-9::~\.\[\]]+)}$/)[1];  // ${viewname} or ${viewname.type}
      let matchers = token.match(/^(.*)\.type$/);
      let viewDescription = null;
      if (matchers) {  // token is ${viewname.type}
        let connection = recipeParticle.findConnectionByName(matchers[1]);
        viewDescription = connection.view.type.toString();
        if (connection.view.create) {
          viewDescription = 'new ' + viewDescription;
        }
      } else {
        // Executing this twice - 1st to generate the view's description, then if the view is part
        // of the particle description. Should instead call: this.getViewDescription(particleSpec.name, token)
        // here for the latter.
        viewDescription = this._resolveConnectionDescription(token, recipeParticle);
      }
      if (!viewDescription) {
        return null;
      }
      description = description.replace(`\$\{${token}\}`, viewDescription);
    });
    return description;
  }

  _resolveConnectionDescription(connectionName, recipeParticle) {
    let connection = recipeParticle.connections[connectionName];
    assert(connection, `No connection for ${connectionName} in particle ${recipeParticle.name}`);
    let viewDescription = this._descriptionsByView.get(connection.view);
    let resultDescription;
    let selectedParticleViewDescription =
        this._selectParticleViewDescription(viewDescription, recipeParticle.spec.name);
    if ((!selectedParticleViewDescription || !selectedParticleViewDescription.description) &&
        connection.view && connection.view.description) {
      // Fallback to previously existing view description, if the new recipe doesn't have explicit
      // description pattern for the view,
      resultDescription = connection.view.description;
    } else if (selectedParticleViewDescription) {
      resultDescription = this._resolveTokens(selectedParticleViewDescription.description.toLowerCase(),
                                              selectedParticleViewDescription.recipeParticle);
    } else {
      if (viewDescription && (viewDescription.type.isView || !viewDescription.value)) {
        resultDescription = viewDescription.type.toString().toLowerCase();
        if (viewDescription.create) {
          resultDescription = 'new ' + resultDescription;
        }
      }
    }
    if (resultDescription) {
      if (viewDescription && viewDescription.value &&
          (resultDescription.indexOf(viewDescription.value) < 0) &&
          !this._seenViews.has(connection.view.id)) {
        return `${resultDescription} (${viewDescription.value})`;
      }
      return resultDescription;
    }
    return viewDescription.value;
  }

  _selectParticleViewDescription(viewDescription, particleName) {
    if (viewDescription && viewDescription.descriptions && viewDescription.descriptions.length > 0) {
      let localDescription = viewDescription.descriptions.reduce((prev, curr) => {
        if (curr.recipeParticle.spec.name == particleName) prev = curr; return prev;
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
        let r1Name = r1.recipeParticle.spec.name;
        let r2Name = r2.recipeParticle.spec.name;
        if (r1Name == particleName) {
          return 1;
        }
        if (r2Name == particleName) {
          return -1;
        }
        let rank1 = this.relevance.calcParticleRelevance(r1Name);
        let rank2 = this.relevance.calcParticleRelevance(r2Name);
        return rank2 - rank1;
      });
      if (outDescriptions[0].description)
        return outDescriptions[0];
    }
  }
  _formatViewValue(recipeView) {
    if (!recipeView.id)
      return;
    let view = this.relevance.newArc.findViewById(recipeView.id);
    assert(view, `Cannot find view ${recipeView.id} in arc`);
    if (view.type.isView) {
      let viewList = view.toList();
      if (viewList) {
        if (viewList.length > 2) {
          return `<b>${viewList[0].rawData.name}</b> plus <b>${viewList.length-1}</b> other items`;
        }
        return viewList.map(v => v.rawData.name).join(", ");
      }
    } else {
      let viewVar = view.get();
      if (viewVar) {
        return viewVar.rawData.name;  // TODO: use type's Entity instead
      }
    }
  }
}

module.exports = DescriptionGenerator;
