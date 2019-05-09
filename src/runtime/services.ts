/**
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// TODO(alxr): should these go into `functional`?
interface Dictionary<T>  {
  [key: string]: T;
}

type Mapper<I, O> = (input: I) => O;


interface Service {
  // tslint:disable-next-line:no-any
  [name: string]: Mapper<ServiceRequest, Promise<any>>;
}

type Registry = Dictionary<Service>;

interface ServiceRequest {
  service: string;
  invoke: string;
  call?: string;
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
  async classify(request: ServiceRequest) {
    return {data: `it's a pig, that don't fly straight`};
  }
});
