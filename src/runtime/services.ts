/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Dictionary} from '../utils/lib-utils.js';

export interface Service {
}

type Registry = Dictionary<Service>;

export interface ServiceRequest {
  service?: string;
  invoke?: string;
  call?: string;
  // any extra call parameters are passed along here.
  // tslint:disable-next-line: no-any
  [key: string]: any;
}

export class Services {
  static registry: Registry = {};

  static register(name: string, service: Service): void {
    Services.registry[name] = service;
  }

  static async request(request: ServiceRequest) {
    let {service: name, invoke, call} = request;
    if (call) {
      [name, invoke] = call.split('.');
    }
    const service = Services.registry[name];
    if (service) {
      if (service[invoke]) {
        return await service[invoke](request);
      }
    }
    return null;
  }
}

Object.freeze(Services);

Services.register('test', {
  async classify(request) {
    return {data: `it's a pig, that don't fly straight`};
  }
});
