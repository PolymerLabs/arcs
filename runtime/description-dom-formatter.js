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
import {DescriptionFormatter} from './description.js';

export class DescriptionDomFormatter extends DescriptionFormatter {
  constructor(description) {
    super(description);
    this._nextID = 0;
  }

  descriptionFromString(str) {
    return {template: super.descriptionFromString(str), model: {}};
  }

  _isSelectedDescription(desc) {
    return super._isSelectedDescription(desc) || (!!desc.template && !!desc.model);
  }

  _populateParticleDescription(particle, descriptionByName) {
    let result = super._populateParticleDescription(particle, descriptionByName);

    if (descriptionByName['_template_']) {
      result = Object.assign(result, {
        template: descriptionByName['_template_'],
        model: JSON.parse(descriptionByName['_model_'])
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

      let success = await Promise.all(Object.keys(model).map(async tokenKey => {
        let token = this._initHandleToken(model[tokenKey], particleDesc);
        let tokenValue = await this.tokenToString(token);

        if (tokenValue == undefined) {
          return false;
        } else if (tokenValue && tokenValue.template && tokenValue.model) {
          // Dom token.
          template = template.replace(`{{${tokenKey}}}`, tokenValue.template);
          delete model[tokenKey];
          model = Object.assign(model, tokenValue.model);
        } else { // Text token.
          // Replace tokenKey, in case multiple selected suggestions use the same key.
          let newTokenKey = `${tokenKey}${++this._nextID}`;
          template = template.replace(`{{${tokenKey}}}`, `{{${newTokenKey}}}`);
          delete model[tokenKey];
          model[newTokenKey] = tokenValue;
        }
        return true;
      }));

      if (success.every(s => !!s)) {
        suggestionByParticleDesc.set(particleDesc, {template, model});
      }
    }));

    // Populate suggestions list while maintaining original particles order.
    let suggestions = [];
    selectedDescriptions.forEach(desc => {
      if (suggestionByParticleDesc.has(desc)) {
        suggestions.push(suggestionByParticleDesc.get(desc));
      }
    });

    if (suggestions.length > 0) {
      let result = this._joinDescriptions(suggestions);
      result.template += '.';
      return result;
    }
  }

  _retrieveTemplateAndModel(particleDesc, index) {
    if (particleDesc.template && particleDesc.model) {
      return {template: particleDesc.template, model: particleDesc.model};
    }
    assert(particleDesc.pattern, 'Description must contain template and model, or pattern');
    let template = '';
    let model = {};
    let tokens = this._initTokens(particleDesc.pattern, particleDesc);

    tokens.forEach((token, i) => {
      if (token.text) {
        template = template.concat(`${index == 0 && i == 0 ? token.text[0].toUpperCase() + token.text.slice(1) : token.text}`);
      } else { // handle or slot handle.
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

  _combineDescriptionAndValue(token, description, handleValue) {
    if (!!description.template && !!description.model) {
      return {
        template: `${description.template} (${handleValue.template})`,
        model: Object.assign(description.model, handleValue.model)
      };
    }
    let descKey = `${token.handleName}Description${++this._nextID}`;
    return {
      template: `<span>{{${descKey}}}</span> (${handleValue.template})`,
      model: Object.assign({[descKey]: description}, handleValue.model)
    };
  }

  _formatEntityProperty(handleName, properties, value) {
    let key = `${handleName}${properties.join('')}Value${++this._nextID}`;
    return {
      template: `<b>{{${key}}}</b>`,
      model: {[`${key}`]: value}
    };
  }

  _formatSetHandle(handleName, handleList) {
    let handleKey = `${handleName}${++this._nextID}`;
    if (handleList[0].rawData.name) {
      if (handleList.length > 2) {
        return {
          template: `<b>{{${handleKey}FirstName}}</b> plus <b>{{${handleKey}OtherCount}}</b> other items`,
          model: {[`${handleKey}FirstName`]: handleList[0].rawData.name, [`${handleKey}OtherCount`]: handleList.length - 1}
        };
      }
      return {
        template: handleList.map((v, i) => `<b>{{${handleKey}${i}}}</b>`).join(', '),
        model: Object.assign(...handleList.map((v, i) => ({[`${handleKey}${i}`]: v.rawData.name} )))
      };
    }
    return {
      template: `<b>{{${handleKey}Length}}</b> items`,
      model: {[`${handleKey}Length`]: handleList.length}
    };
  }

  _formatSingleton(handleName, handleVar) {
    if (handleVar.rawData.name) {
      return {
        template: `<b>{{${handleName}Var}}</b>`,
        model: {[`${handleName}Var`]: handleVar.rawData.name}
      };
    }
  }
}
