'use strict';

import {Runnable} from './hot.js';

export const given = (...preconditions: Runnable[]) => f => async (...args) => {
  await Promise.all([...preconditions]);
  return f(...args);
};

export const conclude = (...postconditions: Runnable[]) => f => async (...args) => {
  const result =  f(...args);
  await Promise.all(postconditions);
  return result;
};
