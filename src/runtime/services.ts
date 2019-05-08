/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export const Services = class {
  static registry: Object;
  static register(name, service: Object) {
    Services.registry[name] = service;
  }
  static async request(request) {
    const {service: name, invoke} = request;
    const service = Services.registry[name];
    if (service) {
      if (service[invoke]) {
        return await service[invoke](request);
      }
    }
    return null;
  }
};

Services.registry = {};

Services.register('test', {
  async classify(request) {
    return {data: `it's a pig, that don't fly straight`};
  }
});
