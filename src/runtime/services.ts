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
  static id: number;
  static channels: Object;
  static register(name, service: Object) {
    Services.registry[name] = service;
  }
  static request(name) {
    const service = Services.registry[name];
    const bus = {
      channel: Services.id++,
      service
    };
    Services.channels[bus.channel] = bus;
    return bus;
  }
  static invoke(request) {
    const {channel} = request;
    const bus = Services.channels[channel];
    if (bus) {
      const {name} = request;
      if (bus.service[name]) {
        bus.service[name](request);
      }
    }
  }
};

Services.id = 1;
Services.registry = {};
Services.channels = {};

Services.register('test', {
});