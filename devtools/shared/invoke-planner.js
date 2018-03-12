/**
 * @license
 * Copyright (c) 2018 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

let planner;

function getStrategies() {
  if (window.Arcs == undefined || window.arc == undefined)
    return null;
  planner = new Arcs.Planner();

  planner.init(arc);
  return planner.strategizer._strategies.map(a => a.constructor.name);
  
}

async function invokePlanner(stageName, inputRecipe) {
  if (typeof window !== 'object')
    return;

  let strategy = planner.strategizer._strategies.find(a => a.constructor.name == stageName);

  if (!strategy)
    return {error: 'could not find strategy'}; 
  
  let manifest = await Arcs.Manifest.parse(inputRecipe, {loader: arc._loader, fileName: 'manifest.manifest'});
  let recipe = manifest.recipes[0];
  recipe.normalize();

  let strategizer = {generated: [{result: recipe, score: 1}], generation: 0};
  let {results} = await strategy.generate(strategizer);
  if (results.length) {
    for (let result of results) {
      result.hash = await result.hash;
      result.derivation = undefined;
      let recipe = result.result;
      result.result = recipe.toString({showUnresolved: true});
      let errors = new Map();
      recipe.normalize({errors});
      result.errors = [...errors.keys()].map(thing => ({id: thing.id, error: errors.get(thing)}));
      result.normalized = recipe.toString();
    }
  }
  return results;
}

function getStrategiesAndSend() {
  console.log('gSAS');
  let strategies = getStrategies();
  if (strategies == null) {
    setTimeout(getStrategiesAndSend, 500);
    return;
  }
  console.log(strategies);
  sendMessage({op: 'strategies', strategies});
}

async function handlePlannerRequest(message) {
  console.log(message);
  switch (message.op) {
    case 'fetch-strategies':
      getStrategiesAndSend();
      break;
    case 'invoke':
      let results = await invokePlanner(message.data.strategy, message.data.recipe);
      sendMessage({op: 'planner-results', results});
  } 
}

function sendMessage(msg) {
  window.postMessage({source: 'page', type: 'planner', msg}, '*');
}

function initPlannerComponent() {
  console.log('initPlannerComponent');
  window.addEventListener('message', function(event) {
    if (event.source !== window)
      return;
    
    if (event.data.source && (event.data.source == 'extension')) {
      handlePlannerRequest(event.data.msg);
    }
  }, false);
}

export {initPlannerComponent};