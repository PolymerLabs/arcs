/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const Manifest = require('../manifest.js');
const assert = require('chai').assert;
const util = require('./test-util.js');
const viewlet = require('../viewlet.js');
const Arc = require("../arc.js");
const MessageChannel = require("../message-channel.js");
const InnerPec = require("../inner-PEC.js");
const Loader = require("../loader.js");

describe('particle-api', function() {
  it('contains a constructInnerArc call', async () => {
    let registry = {};
    let loader = new class extends Loader {
      loadResource(path) {
        return {
          manifest: `
            schema Result
              normative
                Text value

            particle P in 'a.js'
              P(out Result result)

            recipe
              use 'test:1' as view0
              P
                result -> view0

          `,
          'a.js': `
            "use strict";

            defineParticle(({Particle}) => {
              return class P extends Particle {
                async setViews(views) {
                  let arc = await this.constructInnerArc();
                  var resultView = views.get('result');
                  let view = await arc.createView(resultView.type, "a view");
                  view.set(new resultView.entityClass({value: 'success'}));
                  resultView.set(new resultView.entityClass({value: 'done'}));
                }
              }
            });
          `
        }[path];
      }
      path(fileName) {
        return fileName;
      }
      join(_, file) {
        return file;
      }
    };
    let manifest = await Manifest.load('manifest', loader, {registry});
    var pecFactory = function(id) {
      var channel = new MessageChannel();
      new InnerPec(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };
    let arc = new Arc({id:'test', pecFactory});
    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultView = arc.createView(Result.type);
    let recipe = manifest.recipes[0];
    recipe.normalize();
    arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(resultView, Result, "done");
    let newView = arc.findViewsByType(Result.type)[1];
    assert(newView.name == "a view");
    await util.assertSingletonIs(newView, Result, "success");
  });

  it('can load a recipe', async () => {
    let registry = {};
    let loader = new class extends Loader {
      loadResource(path) {
        return {
          manifest: `
            schema Result
              normative
                Text value

            particle P in 'a.js'
              P(out Result result)

            recipe
              use 'test:1' as view0
              P
                result -> view0

          `,
          'a.js': `
            "use strict";

            defineParticle(({Particle}) => {
              return class P extends Particle {
                async setViews(views) {
                  let arc = await this.constructInnerArc();
                  var resultView = views.get('result');
                  let inView = await arc.createView(resultView.type, "in view");
                  let outView = await arc.createView(resultView.type, "out view");
                  try {
                    await arc.loadRecipe(\`
                      schema Result
                        normative
                          Text value

                      particle PassThrough in 'pass-through.js'
                        PassThrough(in Result a, out Result b)

                      recipe
                        use '\${inView.id}' as v1
                        use '\${outView.id}' as v2
                        PassThrough
                          a <- v1
                          b -> v2

                    \`);
                    inView.set(new resultView.entityClass({value: 'success'}));
                    resultView.set(new resultView.entityClass({value: 'done'}));
                  } catch (e) {
                    resultView.set(new resultView.entityClass({value: e}));
                  }
                }
              }
            });
          `,
          'pass-through.js': `
            "use strict";

            defineParticle(({Particle}) => {
              return class PassThrough extends Particle {
                setViews(views) {
                  views.get('a').get().then(result => {
                    views.get('b').set(result);
                  });
                }
              }
          });
          `
        }[path];
      }
      path(fileName) {
        return fileName;
      }
      join(_, file) {
        return file;
      }
    };
    let manifest = await Manifest.load('manifest', loader, {registry});
    var pecFactory = function(id) {
      var channel = new MessageChannel();
      new InnerPec(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };
    let arc = new Arc({id:'test', pecFactory, loader});
    let Result = manifest.findSchemaByName('Result').entityClass();
    let resultView = arc.createView(Result.type);
    let recipe = manifest.recipes[0];
    recipe.normalize();
    arc.instantiate(recipe);

    await util.assertSingletonWillChangeTo(resultView, Result, "done");
    let newView = arc.findViewsByType(Result.type)[2];
    assert(newView.name == "out view");
    await util.assertSingletonWillChangeTo(newView, Result, "success");
  });

  it('multiplexing', async () => {
    let registry = {};
    let loader = new class extends Loader {
      loadResource(path) {
        return {
          manifest: `
            schema Result
              normative
                Text value

            particle P in 'a.js'
              P(in [Result] inputs, inout [Result] results)

            recipe
              use 'test:1' as view0
              use 'test:2' as view1
              P
                inputs <- view0
                results = view1

          `,
          'a.js': `
            "use strict";

            defineParticle(({Particle}) => {
              return class P extends Particle {
                async setViews(views) {
                  let arc = await this.constructInnerArc();
                  var inputsView = views.get('inputs');
                  var inputsList = await inputsView.toList();
                  var resultsView = views.get('results');
                  for (let input of inputsList) {
                    let inView = await arc.createView(resultsView.type.primitiveType(), "in view");
                    let outView = await arc.createView(resultsView.type.primitiveType(), "out view");
                    try {
                      let done = await arc.loadRecipe(\`
                        schema Result
                          normative
                            Text value

                        particle PassThrough in 'pass-through.js'
                          PassThrough(in Result a, out Result b)

                        recipe
                          use '\${inView.id}' as v1
                          use '\${outView.id}' as v2
                          PassThrough
                            a <- v1
                            b -> v2

                      \`);
                      inView.set(input);
                      let res = resultsView.store(new resultsView.entityClass({value: 'done'}));

                      // outView.on('change', () => outView.get().then(result => {
                      //   console.log('????? outview changed = ', result);
                      // }), {});
                    } catch (e) {
                      resultsView.store(new resultsView.entityClass({value: e}));
                    }
                  }
                }
              }
            });
          `,
          'pass-through.js': `
            "use strict";

            defineParticle(({Particle}) => {
              return class PassThrough extends Particle {
                setViews(views) {
                  views.get('a').get().then(result => {
                    var bView = views.get('b');
                    bView.set(new bView.entityClass({value:result.value.toUpperCase()}));
                  });
                }
              }
          });
          `
        }[path];
      }
      path(fileName) {
        return fileName;
      }
      join(_, file) {
        return file;
      }
    };
    let manifest = await Manifest.load('manifest', loader, {registry});
    var pecFactory = function(id) {
      var channel = new MessageChannel();
      new InnerPec(channel.port1, `${id}:inner`, loader);
      return channel.port2;
    };
    let arc = new Arc({id:'test', pecFactory, loader});
    let Result = manifest.findSchemaByName('Result').entityClass();
    let inputsView = arc.createView(Result.type.viewOf());
    inputsView.store({id: 1, rawData: {value: 'hello'} });
    inputsView.store({id: 2, rawData: {value: 'world'} });
    let resultsView = arc.createView(Result.type.viewOf());
    let recipe = manifest.recipes[0];
    recipe.normalize();
    arc.instantiate(recipe);

    await util.assertViewWillChangeTo(resultsView, Result, "value", ["done", "done"]);
    // TODO: how do i listen to inner arc's outView view-changes?
    // await util.assertViewWillChangeTo(resultsView, Result, "value", ["HELLO", "WORLD"]);
    let newView = arc.findViewsByType(Result.type)[1];
    assert(newView.name == "out view", `Unexpected newView name: ${newView.name}`);

    util.assertSingletonIs(newView, Result, "HELLO");
    newView = arc.findViewsByType(Result.type)[3];
    assert(newView.name == "out view", `Unexpected newView name: ${newView.name}`);
    await util.assertSingletonWillChangeTo(newView, Result, "WORLD");
  });
});
