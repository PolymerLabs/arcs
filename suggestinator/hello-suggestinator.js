// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

let {Suggestinator, Strategy} = require('./suggestinator.js');

class Seed extends Strategy {
  async activate(suggestinator) {
    return {generate: suggestinator.generation == 0 ? 1 : 0, evaluate: 0};
  }
  async generate(suggestinator, n) {
    return [''];
  }
}

class Grow extends Strategy {
  async activate(suggestinator) {
    return {generate: suggestinator.population.length > 0 ? 1: 0, evaluate: 0};
  }
  async generate(suggestinator, n) {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,! ';
    let population = suggestinator.population;
    let result = [];
    for (let i = 0; i < n; i++) {
      let source = population[Math.random() * population.length|0];
      let split = Math.random() * (source.length + 1) |0;
      let str = source.substr(0, split) + alphabet[Math.random() * alphabet.length|0] + source.substr(split);
      result.push(str);
    }
    return result;
  }
}

class Cross extends Strategy {
  async activate(suggestinator) {
    return {generate: suggestinator.population.length > 0 ? 1: 0, evaluate: 0};
  }
  async generate(suggestinator, n) {
    let population = suggestinator.population.filter(str => str.length > 0);
    let result = [];
    while (population.length > 0 && result.length < n) {
      let p1 = population[Math.random() * population.length|0];
      let p2 = population[Math.random() * population.length|0];
      let str = '';
      for (let i = 0; i < Math.min(p1.length, p2.length); i++) {
        str += Math.random() > 0.5 ? p1[i] : p2[i];
      }
      result.push(str);
    }
    return result;
  }
}

class Mutate extends Strategy {
  async activate(suggestinator) {
    // Returns estimated ability to generate/evaluate.
    return {generate: suggestinator.population.length > 0 ? 1: 0, evaluate: 0};
  }
  async generate(suggestinator, n) {
    let population = suggestinator.population.filter(str => str.length > 2);
    let result = [];
    while (population.length > 0 && result.length < n) {
      let source = population[Math.random() * population.length|0];
      let str = source.split('');
      let i = Math.random() * source.length |0;
      let j = Math.random() * source.length |0;
      let tmp = str[i];
      str[i] = str[j];
      str[j] = tmp;
      result.push(str.join(''));
    }
    return result;
  }
  discard(individuals) {
  }
}

let ed = require('edit-distance');
class Eval extends Strategy {
  constructor(target) {
    super();
    this._target = target;
  }
  async activate(suggestinator) {
    return {generate: 0, evaluate: 1};
  }
  async evaluate(suggestinator, individuals) {
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
let suggestinator = new Suggestinator([new Seed(), new Grow(), new Mutate(), new Cross(), new Eval(target)], {
  maxPopulation: 100,
  generationSize: 1000,
  discardSize: 20,
});

(async () => {
  while (true) {
    await suggestinator.generate();
    console.log(suggestinator.population[0]);
    if (suggestinator.population[0] == target) {
      return;
    }
  }
})();
