/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export const ProcessConfig = class {
  static processConfig(options, params) {
    const config = {};
    Object.keys(options).forEach(key => config[key] = this.processConfigOption(params, key, options[key]));
    return config;
  }
  static processConfigOption(params, name, option) {
    let names = [name];
    if (option.aliases) {
      names = names.concat(option.aliases);
    }
    let value;
    if (option.boolean) {
      value = false;
    }
    // use URL param if available
    const param = names.find(name => params.has(name));
    if (param) {
      const paramValue = params.get(param);
      // normally, simple existence of a parameter makes it true,
      // but we'll also handle folks doing `booleanParameter=false`
      value = option.boolean ? paramValue !== 'false' : paramValue;
    } else {
      // use local storage value if available
      if (option.localStorageKey) {
        const storageValue = localStorage.getItem(option.localStorageKey);
        if (storageValue !== null) {
          value = storageValue;
        }
      }
      // otherwise use default value
      if (!value && ('default' in option)) {
        value = option.default;
      }
    }
    // map shorthand names to longform values
    if (option.map) {
      const mapValue = option.map[value];
      if (mapValue !== undefined) {
        value = mapValue;
      }
    }
    return value;
  }
  static persistParams(options, config) {
    Object.keys(options).forEach(key => this.persistParam(key, options[key], config[key]));
  }
  static persistParam(name, {localStorageKey, persistToUrl, aliases}, value) {
    if (localStorageKey && value !== undefined) {
      localStorage.setItem(localStorageKey, value);
    }
    if (persistToUrl) {
      this.setUrlParam(name, value);
      // remove any aliases in favor of the canonical form
      aliases.forEach(alias => this.setUrlParam(alias));
    }
  }
  static setUrlParam(name, value) {
    // TODO(sjmiles): memoize url?
    const url = new URL(document.location.href);
    if (!value) {
      url.searchParams.delete(name);
    } else {
      url.searchParams.set(name, value);
    }
    window.history.replaceState({}, '', decodeURIComponent(url.href));
  }
};
