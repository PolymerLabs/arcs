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
import {Arc} from './arc.js';
import {DescriptionFormatter} from './description-formatter.js';
import {Particle} from './recipe/particle.js';
import {Relevance} from './relevance.js';

export class Description {
  relevance: Relevance | null = null;
  readonly arc: Arc;
  _particle: Particle | undefined = undefined;

  constructor(arc) {
    this.arc = arc;
  }
 
  async getArcDescription(formatterClass = DescriptionFormatter) : Promise<string> {
    const desc = await new (formatterClass)(this.arc, this.relevance).getDescription(this.arc.activeRecipe);
    if (desc) {
      return desc;
    }
    return undefined;
  }

  async getRecipeSuggestion(formatterClass = DescriptionFormatter) {
    const formatter = await new (formatterClass)(this.arc, this.relevance);
    const desc = await formatter.getDescription(this.arc.recipes[this.arc.recipes.length - 1]);
    if (desc) {
      return desc;
    }

    return formatter._capitalizeAndPunctuate(this.arc.activeRecipe.name || Description.defaultDescription);
  }

  async getHandleDescription(recipeHandle) {
    assert(recipeHandle.connections.length > 0, 'handle has no connections?');

    const formatter = new DescriptionFormatter(this.arc, this.relevance);
    formatter.excludeValues = true;
    return await formatter.getHandleDescription(recipeHandle);
  }

  static defaultDescription = 'i\'m feeling lucky';
}
