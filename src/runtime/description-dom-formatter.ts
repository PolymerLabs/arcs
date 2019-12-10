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

import {CombinedDescriptionsOptions, DescriptionFormatter, ParticleDescription} from './description-formatter.js';
import {Flags} from './flags.js';

export class DescriptionDomFormatter extends DescriptionFormatter {
  private nextID = 0;

  _isSelectedDescription(desc): boolean {
    return super._isSelectedDescription(desc) || (!!desc.template && !!desc.model);
  }

  _combineSelectedDescriptions(selectedDescriptions: ParticleDescription[], options: CombinedDescriptionsOptions) {
    const suggestionByParticleDesc = new Map();
    for (const particleDesc of selectedDescriptions) {
      if (this.seenParticles.has(particleDesc._particle)) {
        continue;
      }

      let {template, model} = this._retrieveTemplateAndModel(particleDesc, suggestionByParticleDesc.size, options || {});

      const success = Object.keys(model).map(tokenKey => {
        const tokens = this._initSubTokens(model[tokenKey], particleDesc);

        return tokens.map(token => {
          const tokenValue = this.tokenToString(token);
          if (tokenValue == undefined) {
            return false;
          } else if (tokenValue && tokenValue.template && tokenValue.model) {
            // Dom token.
            template = template.replace(`{{${tokenKey}}}`, tokenValue.template);
            delete model[tokenKey];
            model = {...model, ...tokenValue.model};
          } else { // Text token.
            // Replace tokenKey, in case multiple selected suggestions use the same key.
            const newTokenKey = `${tokenKey}${++this.nextID}`;
            template = template.replace(`{{${tokenKey}}}`, `{{${newTokenKey}}}`);
            delete model[tokenKey];
            model[newTokenKey] = tokenValue;
          }
          return true;
        }).every(t => !!t);
      });

      if (success.every(s => !!s)) {
        suggestionByParticleDesc.set(particleDesc, {template, model});
      }
    }

    // Populate suggestions list while maintaining original particles order.
    const suggestions = [];
    selectedDescriptions.forEach(desc => {
      if (suggestionByParticleDesc.has(desc)) {
        suggestions.push(suggestionByParticleDesc.get(desc));
      }
    });

    if (suggestions.length > 0) {
      const result = this._joinDescriptions(suggestions);
      if (!options || !options.skipFormatting) {
        result.template += '.';
      }
      return result;
    }
  }

  _retrieveTemplateAndModel(particleDesc: ParticleDescription, index, options) {
    if (particleDesc['_template_'] && particleDesc['_model_']) {
      return {
        template: particleDesc['_template_'],
        model: JSON.parse(particleDesc['_model_'])
      };
    }
    assert(particleDesc.pattern, 'Description must contain template and model, or pattern');
    let template = '';
    const model = {};
    const tokens = this._initTokens(particleDesc.pattern, particleDesc);

    tokens.forEach((token, i: number) => {
      if (token.text) {
        template = template.concat(
            `${(index === 0 && i === 0 && !options.skipFormatting) ? token.text[0].toUpperCase() + token.text.slice(1) : token.text}`);
      } else { // handle or slot handle.
        const sanitizedFullName = token.fullName.replace(/[.{}_$]/g, '');
        let attribute = '';
        // TODO(mmandlis): capitalize the data in the model instead.
        if (i === 0 && !options.skipFormatting) {
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

  _capitalizeAndPunctuate(sentence) {
    if (typeof sentence === 'string') {
      return {template: super._capitalizeAndPunctuate(sentence), model: {}};
    }

    // Capitalize the first element in the DOM template.
    const tokens = sentence.template.match(/<[a-zA-Z0-9]+>{{([a-zA-Z0-9]*)}}<\/[a-zA-Z0-9]+>/);
    if (tokens && tokens.length > 1 && sentence.model[tokens[1]]) {
      const modelToken = sentence.model[tokens[1]];
      if (modelToken.length > 0) {
        sentence.model[tokens[1]] = `${modelToken[0].toUpperCase()}${modelToken.substr(1)}`;
      }
    }
    sentence.template += '.';
    return sentence;
  }

  _joinDescriptions(descs) {
    // If all tokens are strings, just join them.
    if (descs.every(desc => typeof desc === 'string')) {
      return super._joinDescriptions(descs);
    }

    const result = {template: '', model: {}};
    const count = descs.length;
    descs.forEach((desc, i) => {
      if (typeof desc === 'string') {
        desc = {template: desc, model: {}};
      }

      result.template += desc.template;
      result.model = {...result.model, ...desc.model};
      let delim;
      if (i < count - 2) {
        delim = ', ';
      } else if (i === count - 2) {
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
          template: `<span>{{text${++this.nextID}}}</span>`,
          model: {[`text${this.nextID}`]: token}
        };
      }
      return token;
    });

    const nonEmptyTokens = tokens.filter(token => token && !!token.template && !!token.model);
    return {
      template: nonEmptyTokens.map(token => token.template).join(''),
      model: nonEmptyTokens.map(token => token.model).reduce((prev, curr) => ({...prev, ...curr}), {})
    };
  }

  _combineDescriptionAndValue(token, description, storeValue) {
    if (!!description.template && !!description.model) {
      return {
        template: `${description.template} (${storeValue.template})`,
        model: {...description.model, ...storeValue.model}
      };
    }
    const descKey = `${token.handleName}Description${++this.nextID}`;
    return {
      template: `<span>{{${descKey}}}</span> (${storeValue.template})`,
      model: {[descKey]: description, ...storeValue.model}
    };
  }

  _formatEntityProperty(handleName, properties, value) {
    const key = `${handleName}${properties.join('')}Value${++this.nextID}`;
    return {
      template: `<b>{{${key}}}</b>`,
      model: {[`${key}`]: value}
    };
  }

  _formatCollection(handleName, values) {
    const handleKey = `${handleName}${++this.nextID}`;
    if ((Flags.useNewStorageStack ? values[0] : values[0].rawData).name) {
      if (values.length > 2) {
        return {
          template: `<b>{{${handleKey}FirstName}}</b> plus <b>{{${handleKey}OtherCount}}</b> other items`,
          model: {
            [`${handleKey}FirstName`]: (Flags.useNewStorageStack ? values[0] : values[0].rawData).name,
            [`${handleKey}OtherCount`]: values.length - 1
          }
        };
      }
      return {
        template: values.map((v, i) => `<b>{{${handleKey}${i}}}</b>`).join(', '),
        model: Object.assign(
          {},
          ...values.map(
              (v, i) => ({[`${handleKey}${i}`]: (Flags.useNewStorageStack ? v : v.rawData).name} )))
      };
    }
    return {
      template: `<b>{{${handleKey}Length}}</b> items`,
      model: {[`${handleKey}Length`]: values.length}
    };
  }

  _formatBigCollection(handleName, firstValue) {
    return {
      template: `collection of items like {{${handleName}FirstName}}`,
      model: {[`${handleName}FirstName`]: firstValue.rawData.name}
    };
  }

  _formatSingleton(handleName, value) {
    const formattedValue = super._formatSingleton(handleName, value);
    if (formattedValue) {
      return {
        template: `<b>{{${handleName}Var}}</b>`,
        model: {[`${handleName}Var`]: formattedValue}
      };
    }
    return undefined;
  }
}
