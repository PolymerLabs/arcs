// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Strategizer, Strategy} = require('./strategizer.js');

class Seed extends Strategy {
  async activate(strategizer) {
    return {generate: strategizer.generation == 0 ? 1 : 0, evaluate: 0};
  }
  async generate(strategizer, n) {
    var results = strategizer.generation == 0 ? [{result: '', score: 1}] : [];
    return {results, generate: null};
  }
}

class Grow extends Strategy {
  async activate(strategizer) {
    return {generate: strategizer.population.length > 0 ? 1: 0, evaluate: 0};
  }
  async generate(strategizer, n) {
    if (strategizer.population.length == 0)
      return {results: [], generate: null};
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,! ';
    let population = strategizer.population;
    let results = [];
    for (let i = 0; i < n; i++) {
      let source = population[Math.random() * population.length|0];
      let split = Math.random() * (source.length + 1) |0;
      let str = source.substr(0, split) + alphabet[Math.random() * alphabet.length|0] + source.substr(split);
      results.push({result: str, score: 1});
    }
    return {results, generate: null};
  }
}

class Cross extends Strategy {
  async activate(strategizer) {
    return {generate: strategizer.population.length > 0 ? 1: 0, evaluate: 0};
  }
  async generate(strategizer, n) {
    let population = strategizer.population.filter(str => str.length > 0);
    let results = [];
    while (population.length > 0 && results.length < n) {
      let p1 = population[Math.random() * population.length|0];
      let p2 = population[Math.random() * population.length|0];
      let str = '';
      for (let i = 0; i < Math.min(p1.length, p2.length); i++) {
        str += Math.random() > 0.5 ? p1[i] : p2[i];
      }
      results.push({result: str, score: 1});
    }
    return {results, generate: null};
  }
}

class Mutate extends Strategy {
  async activate(strategizer) {
    // Returns estimated ability to generate/evaluate.
    return {generate: strategizer.population.length > 0 ? 1: 0, evaluate: 0};
  }
  async generate(strategizer, n) {
    let population = strategizer.population.filter(str => str.length > 2);
    let results = [];
    while (population.length > 0 && results.length < n) {
      let source = population[Math.random() * population.length|0];
      let str = source.split('');
      let i = Math.random() * source.length |0;
      let j = Math.random() * source.length |0;
      let tmp = str[i];
      str[i] = str[j];
      str[j] = tmp;
      results.push({result: str.join(''), score: 1});
    }
    return { results, generate: null};
  }
}

let ed = require('edit-distance');
class Eval extends Strategy {
  constructor(target) {
    super();
    this._target = target;
  }
  async activate(strategizer) {
    return {generate: 0, evaluate: 1};
  }
  async evaluate(strategizer, individuals) {
    console.log(individuals);
    return individuals.map(str => {
      // Shrug. It seems to work. It basically penalises higher edit distances, but gives
      // credit for characters that could be moved somewhere else.
      let target = this._target;
      let lev = ed.levenshtein(str, target, () => 0.5, () => 1, (x, y) => x == y ? 0 : 1);
      let n = -lev.distance;
      let needed = lev.pairs().filter(([t, s]) => t != null && t != s).map(([t, s]) => t).sort();
      let spare = lev.pairs().filter(([t, s]) => s != null && t != s).map(([t, s]) => s).sort();
      for (var i = 0, j = 0; i < needed.length && j < spare.length; ) {
        if (needed[i] == spare[j]) {
          i++;
          j++;
          n+= 0.5;
        }
        if (needed[i] < spare[j]) {
          //n--;
          i++;
        } else {
          //n--;
          j++;
        }
      }
      return n;
    });
  }
}

let target = 'Hello, world.';
let strategizer = new Strategizer([new Seed(), new Grow(), new Mutate(), new Cross()], [new Eval(target)], {
  maxPopulation: 100,
  generationSize: 1000,
  discardSize: 20,
});

(async () => {
  while (true) {
    await strategizer.generate();
    console.log(strategizer.population[0]);
    if (strategizer.population[0] == target) {
      return;
    }
  }
})();
