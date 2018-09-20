/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {parser} from '../build/manifest-parser.js';
const parse = parser.parse;
import {assert} from './chai-web.js';

describe('manifest parser', function() {
  it('parses an empy manifest', () => {
    parse('');
  });
  it('parses a trivial recipe', () => {
    parse(`recipe Recipe &tag1 &tag2`);
  });
  it('parses with indentation', () => {
    parse(`
      recipe Recipe`);
  });
  it('parses recipes that map handles', () => {
    parse(`
      recipe Thing
        map #someTag
        map 'some-id' #someTag`);
  });
  it('parses recipes with particles', () => {
    parse(`
      recipe Recipe
        SomeParticle`);
  });
  it('parses recipes that connect particles to handles', () => {
    parse(`
      recipe Recipe
        SomeParticle
          a -> #something
          b <- #somethingElse
          * = #someOtherParticle`);
  });
  it('parses trivial particles', () => {
    parse(`
      particle SomeParticle`);
  });
  it('parses recipes that name handles and particles', () => {
    parse(`
      recipe Recipe
        SomeParticle as thing
        map #thing as anotherThing`);
  });
  it('parses manifests with comments', () => {
    parse(`
    // comment
      recipe // comment
        // comment
           // comment
        A//comment
   // comment
        // comment
        B    //comment
      `);
  });
  it('parses recipes with recipe level connections', () => {
    parse(`
      recipe
        X -> Y
        X.a -> Y.a
        &foo.bar -> &far.#bash #fash
        a = b
        a.a = b.b
        X.a #tag <- a.y`);
  });
  it('parses manifests with stores', () => {
    parse(`
      schema Person
        Text lastName
        Text firstName
        description \`person\`
          plural \`people\`
          value \`\${firstName} \${lastName}\`
      store Store0 of [Person] in 'person.json'
        description \`my store\`
      store Store1 of Person 'some-id' @7 in 'people.json'`);
  });
  it('fails to parse an argument list that uses reserved words', () => {
    try {
      parse(`
        particle MyParticle
          in MyThing consume
          in MyThing? provide
          out [MyThing] in
          out BigCollection<MyThing>? out`);
      assert.fail('this parse should have failed, identifiers should not be reserved words!');
    } catch (e) {
      assert.include(e.message, 'Expected',
          `bad error: '${e}'`);
    }
  });
  it('fails to parse a nonsense argument list', () => {
    try {
      parse(`
        particle AParticle
          Nonsense()`);
      assert.fail('this parse should have failed, no nonsense!');
    } catch (e) {
      assert.include(e.message, 'Nonsense',
          'bad error: '+e);
    }
  });
  it('parses particles with optional handles', () => {
    parse(`
      particle MyParticle
        in MyThing mandatory
        in MyThing? optional1
        out [MyThing]? optional2
        out BigCollection<MyThing>? optional3`);
  });
  it('parses manifests with search', () => {
    parse(`
      recipe
        search \`hello World!\`
      `);
  });
  it('parses manifests with search and tokens', () => {
    parse(`
      recipe
        search \`Hello dear world\`
          tokens \`hello\` \`World\` // \`dear\`
      `);
  });
  it('parses manifests particle verbs', () => {
    parse(`
      particle SomeParticle
        in Energy energy
        out Height height
        affordance dom`);
  });
  it('parses recipe with particle verbs', () => {
    parse(`
      recipe
        &jump
          * <- energy
          * -> height`);
  });
  it('parses recipe with particle verb shorthand', () => {
    parse(`
      recipe
        &jump
          * <- energy
          * <- height`);
  });
  it('parses inline schemas', () => {
    parse(`
      particle Foo
        in MySchema {Text value} mySchema
    `);
    parse(`
      particle Foo
        in [MySchema {Text value}] mySchema
    `);
    parse(`
      particle Foo
        in [* {Text value, Number num}] anonSchema
    `);
    parse(`
      particle Foo
        in * {(Text or Number) value} union
    `);
    parse(`
      particle Foo
        in * {value} optionalType
    `);
  });
  it('parses a schema with a bytes field', () => {
    parse(`
      schema Avatar
        Text name
        Bytes profileImage
      `);
  });
  it('parses a schema with a reference field', () => {
    parse(`
      schema Product
        Reference<Review> review
    `);
  });
  it('parses a schema with a referenced inline schema', () => {
    parse(`
      schema Product
        Reference<Review {Text reviewText}> review
    `);
  });
  it('parses an inline schema with a reference to a schema', () => {
    parse(`
      particle Foo
        in Product {Reference<Review> review} in
    `);
  });
  it('parses an inline schema with a collection of references to schemas', () => {
    parse(`
      particle Foo
        in Product {[Reference<Review>] review} in
    `);
  });
  it('parses an inline schema with a referenced inline schema', () => {
    parse(`
    particle Foo
      in Product {Reference<Review {Text reviewText}> review} in`
    );
  });
  it('parses an inline schema with a collection of references to inline schemas', () => {
    parse(`
      particle Foo
        in Product {[Reference<Review {Text reviewText}>] review} in
    `);
  });
  it('parses reference types', () => {
    parse(`
      particle Foo
        in Reference<Foo> in
        out Reference<Bar> out
    `);
  });
});
