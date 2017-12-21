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
import {DescriptionFormatter} from './description.js';

export default class DescriptionDomFormatter extends DescriptionFormatter {
  constructor(description) {
    super(description);
    this._nextID = 0;
  }

  _isSelectedDescription(desc) {
    return super._isSelectedDescription(desc) || (!!desc.template && !!desc.model);
  }

  _populateParticleDescription(particle, descriptionByName) {
    let result = super._populateParticleDescription(particle, descriptionByName);

    if (descriptionByName["_template_"]) {
      result = Object.assign(result, {
        template: descriptionByName["_template_"],
        model: JSON.parse(descriptionByName["_model_"])
      });
    }

    return result;
  }

  async _combineSelectedDescriptions(selectedDescriptions) {
    let suggestionByParticleDesc = new Map();
    await Promise.all(selectedDescriptions.map(async (particleDesc, index) => {
      if (this.seenParticles.has(particleDesc._particle)) {
        return;
      }

      let {template, model} = this._retrieveTemplateAndModel(particleDesc, index);

      await Promise.all(Object.keys(model).map(async tokenKey => {
        let token = this._initHandleToken(model[tokenKey], particleDesc._particle);
        let tokenValue = await this.tokenToString(token);

        if (tokenValue.template && tokenValue.model) {
          // Dom token.
          template = template.replace(`{{${tokenKey}}}`, tokenValue.template);
          delete model[tokenKey];
          model = Object.assign(model, tokenValue.model);
        } else {  // Text token.
          // Replace tokenKey, in case multiple selected suggestions use the same key.
          let newTokenKey = `${tokenKey}${++this._nextID}`;
          template = template.replace(`{{${tokenKey}}}`, `{{${newTokenKey}}}`);
          delete model[tokenKey];
          model[newTokenKey] = tokenValue;
        }
      }));

      suggestionByParticleDesc.set(particleDesc, {template, model});
    }));

    // Populate suggestions list while maintaining original particles order.
    let suggestions = [];
    selectedDescriptions.forEach(desc => {
      if (suggestionByParticleDesc.has(desc)) {
        suggestions.push(suggestionByParticleDesc.get(desc));
      }
    });

    let result = this._joinDescriptions(suggestions);
    result.template += '.';
    return result;
  }

  _retrieveTemplateAndModel(particleDesc, index) {
    if (particleDesc.template && particleDesc.model) {
      return {template: particleDesc.template, model: particleDesc.model};
    }
    assert(particleDesc.pattern, 'Description must contain template and model, or pattern');
    let template = '';
    let model = {};
    let tokens = this._initTokens(particleDesc.pattern, particleDesc._particle);

    tokens.forEach((token, i) => {
      if (token.text) {
        template = template.concat(`${index == 0 && i == 0 ? token.text[0].toUpperCase() + token.text.slice(1) : token.text}`);
      } else {  // view or slot handle.
        let sanitizedFullName = token.fullName.replace(/[.{}_\$]/g, '');
        let attribute = '';
        // TODO(mmandlis): capitalize the data in the model instead.
        if (i == 0) {
          // Capitalize the first letter in the token.
          template = template.concat(`<style>
            [firstletter]::first-letter { text-transform: capitalize; }
            [firstletter] {display: inline-block}
            </style>`);
          attribute = ' firstletter';
        }
        template = template.concat(`<span${attribute}>{{${sanitizedFullName}}}</span>`);
        model[sanitizedFullName] = token.fullName;
      }
    });

    return {template, model};
  }

  _joinDescriptions(descs) {
    // // If all tokens are strings, just join them.
    if (descs.every(desc => typeof desc === 'string')) {
      return super._joinDescriptions(descs);
    }

    let result = {template: '', model: {}};
    let count = descs.length;
    descs.forEach((desc, i) => {
      if (!desc.template || !desc.model) {
        return;
      }

      result.template += desc.template;
      result.model = Object.assign(result.model, desc.model);
      let delim;
      if (i < count - 2) {
        delim = ', ';
      } else if (i == count - 2) {
        delim = ['', '', ' and ', ', and '][Math.min(3, count)];
      }
      if (delim) {
        result.template += delim;
      }
    });
    return result;
  }

  _joinTokens(tokens) {
    // If all tokens are strings, just join them.
    if (tokens.every(token => typeof token === 'string')) {
      return super._joinTokens(tokens);
    }

    tokens = tokens.map(token => {
      if (typeof token !== 'object') {
        return {
          template: `<span>{{text${++this._nextID}}}</span>`,
          model: {[`text${this._nextID}`]: token}
        };
      }
      return token;
    });

    let nonEmptyTokens = tokens.filter(token => token && !!token.template && !!token.model);
    return {
      template: nonEmptyTokens.map(token => token.template).join(''),
      model: nonEmptyTokens.map(token => token.model).reduce((prev, curr) => Object.assign(prev, curr), {})
    };
  }

  _combineDescriptionAndValue(token, description, viewValue) {
    if (!!description.template && !!description.model) {
      return {
        template: `${description.template} (${viewValue.template})`,
        model: Object.assign(description.model, viewValue.model)
      }
    }
    let descKey = `${token.viewName}Description${++this._nextID}`;
    return {
      template: `<span>{{${descKey}}}</span> (${viewValue.template})`,
      model: Object.assign({[descKey]: description}, viewValue.model)
    }
  }

  _formatEntityProperty(viewName, properties, value) {
    let key = `${viewName}${properties.join('')}Value${++this._nextID}`;
    return {
      template: `<b>{{${key}}}</b>`,
      model: {[`${key}`]: value }
    };
  }

  _formatSetView(viewName, viewList) {
    let viewKey = `${viewName}${++this._nextID}`;
    if (viewList[0].rawData.name) {
      if (viewList.length > 2) {
        return {
          template: `<b>{{${viewKey}FirstName}}</b> plus <b>{{${viewKey}OtherCount}}</b> other items`,
          model: { [`${viewKey}FirstName`]: viewList[0].rawData.name, [`${viewKey}OtherCount`] : viewList.length - 1}
        };
      }
      return {
        template: viewList.map((v, i) => `<b>{{${viewKey}${i}}}</b>`).join(", "),
        model: Object.assign(...viewList.map((v, i) => ({[`${viewKey}${i}`]: v.rawData.name} )))
      }
    }
    return {
      template: `<b>{{${viewKey}Length}}</b> items`,
      model: { [`${viewKey}Length`]: viewList.length}
    };
  }
  _formatSingleton(viewName, viewVar) {
    if (viewVar.rawData.name) {
      return {
        template: `<b>{{${viewName}Var}}</b>`,
        model: {[`${viewName}Var`]: viewVar.rawData.name}
      }
    }
  }
}
