'use strict';


import {Runnable} from '../../build/runtime/hot.js';

export const given = async (...preconditions: Runnable[]) => {
  return async function decorator(target, propertyKey: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    if (typeof method === 'function') {

      // tslint:disable-next-line:no-any
      descriptor.value = async (...args: any[]) => {
        await Promise.all(preconditions);

        // @ts-ignore
        return method.apply(this, args);
      };
    }

  };
};


export const conclude = async (...postconditions: Runnable[]) => {
  return async function decorator(target, propertyKey: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    if (typeof method === 'function') {

      // tslint:disable-next-line:no-any
      descriptor.value = async (...args: any[]) => {
        // @ts-ignore
        const result =  method.apply(this, args);

        await Promise.all(postconditions);

        return result;
      };
    }

  };
};
