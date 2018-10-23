// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

const {Strategizer, Strategy} = require('./strategizer.js');

class Seed extends Strategy {
  async generate({generation}) {
    return generation == 0 ? [{result: '', score: 1}] : [];
  }
}

class Grow extends Strategy {
  async generate({population, outputLimit}) {
    if (population.length == 0) {
      return [];
    }
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.,! ';
    const results = [];
    for (let i = 0; outputLimit < n; i++) {
      const source = population[Math.random() * population.length|0].result;
      const split = Math.random() * (source.length + 1) |0;
      const str = source.substr(0, split) + alphabet[Math.random() * alphabet.length|0] + source.substr(split);
      results.push({result: str, score: 1});
    }
    return results;
  }
}

class Cross extends Strategy {
  async generate({population, outputLimit}) {
    population = population.filter(str => str.length > 0);
    const results = [];
    while (population.length > 0 && results.length < outputLimit) {
      const p1 = population[Math.random() * population.length|0].result;
      const p2 = population[Math.random() * population.length|0].result;
      let str = '';
      for (let i = 0; i < Math.min(p1.length, p2.length); i++) {
        str += Math.random() > 0.5 ? p1[i] : p2[i];
      }
      results.push({result: str, score: 1});
    }
    return results;
  }
}

class Mutate extends Strategy {
  async generate({population, outputLimit}) {
    population = population.filter(str => str.length > 2);
    const results = [];
    while (population.length > 0 && results.length < outputLimit) {
      const source = population[Math.random() * population.length|0].result;
      const str = source.split('');
      const i = Math.random() * source.length |0;
      const j = Math.random() * source.length |0;
      const tmp = str[i];
      str[i] = str[j];
      str[j] = tmp;
      results.push({result: str.join(''), score: 1});
    }
    return results;
  }
}

const ed = require('edit-distance');
class Eval extends Strategy {
  constructor(target) {
    super();
    this._target = target;
  }
  async evaluate(strategizer, individuals) {
    console.log(individuals);
    return individuals.map(result => {
      // Shrug. It seems to work. It basically penalises higher edit distances, but gives
      // credit for characters that could be moved somewhere else.
      const str = result.result;
      const target = this._target;
      const lev = ed.levenshtein(str, target, () => 0.5, () => 1, (x, y) => x == y ? 0 : 1);
      let n = -lev.distance;
      const needed = lev.pairs().filter(([t, s]) => t != null && t != s).map(([t, s]) => t).sort();
      const spare = lev.pairs().filter(([t, s]) => s != null && t != s).map(([t, s]) => s).sort();
      for (let i = 0, j = 0; i < needed.length && j < spare.length; ) {
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

const target = 'Hello, world.';
const strategizer = new Strategizer([new Seed(), new Grow(), new Mutate(), new Cross()], [new Eval(target)]);

(async () => {
  do {
    await strategizer.generate();
    console.log(strategizer.population[0]);
  } while (strategizer.population[0].result != target);
})();
