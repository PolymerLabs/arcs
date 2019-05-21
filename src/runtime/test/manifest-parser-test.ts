/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {parse} from '../../gen/runtime/manifest-parser.js';
import {assert} from '../../platform/chai-web.js';

describe('manifest parser', () => {
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
      store Store0 of [Person] in 'people.json'
        description \`my store\`
      store Store1 of Person 'some-id' @7 in 'person.json'
      store Store2 of BigCollection<Person> in 'population.json'`);
  });
  it('fails to parse an argument list that use a reserved word as an identifier', () => {
    try {
      parse(`
        particle MyParticle
          in MyThing consume
          out? BigCollection<MyThing> output`);
      assert.fail('this parse should have failed, identifiers should not be reserved words!');
    } catch (e) {
      assert.include(e.message, 'Expected', `bad error: '${e}'`);
    }
  });
  it('allows identifiers to start with reserved words', () => {
    parse(`
      particle MyParticle
        in MyThing mapped
        out? BigCollection<MyThing> import_export`);
  });
  it('allows reserved words for schema field names', () => {
    // Test with a non-word char following the token
    parse(`
      schema Reserved
        Text schema  // comment`);
    // Test with end-of-input following the token
    parse(`
      schema Reserved
        URL map`);
  });
  it('allows reserved words for inline schema field names', () => {
    parse(`
      particle Foo
        in A {Text handle} a
        out B {Boolean import, Number particle} b`);
  });
  it('fails to parse a nonsense argument list', () => {
    try {
      parse(`
        particle AParticle
          Nonsense()`);
      assert.fail('this parse should have failed, no nonsense!');
    } catch (e) {
      assert.include(e.message, 'N', 'bad error: '+e);
    }
  });
  it('parses particles with optional handles', () => {
    parse(`
      particle MyParticle
        in MyThing mandatory
        in? MyThing optional1
        out? [MyThing] optional2
        out? BigCollection<MyThing> optional3`);
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
        modality dom`);
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
        in Product {Reference<Review> review} inReview
    `);
  });
  it('parses an inline schema with a collection of references to schemas', () => {
    parse(`
      particle Foo
        in Product {[Reference<Review>] review} inResult
    `);
  });
  it('parses an inline schema with a referenced inline schema', () => {
    parse(`
    particle Foo
      in Product {Reference<Review {Text reviewText}> review} inReview
    `);
  });
  it('parses an inline schema with a collection of references to inline schemas', () => {
    parse(`
      particle Foo
        in Product {[Reference<Review {Text reviewText}>] review} productReviews
    `);
  });
  it('parses reference types', () => {
    parse(`
      particle Foo
        in Reference<Foo> inRef
        out Reference<Bar> outRef
    `);
  });
  it('parses require section using local name', () => {
    parse(`
      recipe
        require
          handle as thing`);
  });
  it('parses require section using id', () => {
    parse(`
      recipe
        require
          handle 'an-id'`);
  });
  it('parses require section using local name and id', () => {
    parse(`
      recipe
        require
          handle as thing 'an-id'`);
  });
  it('parses require section using upperIdent', () => {
    parse(`
      recipe
        require
          handle Thing`);
  });
  it('parses require section with tags', () => {
    parse(`
      recipe
        require
          handle as thing Thing #tag1 #tag2`);
  });
  it('parses require section with handles, slots and particles', () => {
    parse(`
      recipe
        require
          handle as thing
          slot as thing2
          Particle
            * <- thing 
            consume thing2
    `);
  });
  it('parses handle creation using the handle keyword', () => {
    parse(`
      recipe
        handle as h0
        Particle
          input <- h0
    `);
  });
  it('parses handle with type with prefix "Slot"', () => {
    parse(`
      particle P in './p.js'
        in Sloturnicus s
    `);
  });
  it('does not parse comment at start of manifest resource', () => {
    let data;
    assert.throws(() => {
      const manifestAst = parse(`
        import '../Pipes/PipeEntity.schema'

        resource PipeEntityResource
          start
          //[{"type": "tv_show", "name": "star trek"}]
          [{"type": "artist", "name": "in this moment"}]

        store ExamplePipeEntity of PipeEntity 'ExamplePipeEntity' @0 in PipeEntityResource
      `);
      data = JSON.parse(manifestAst[1].data);
    }, `Unexpected token / in JSON at position 0`);
    assert.equal(data, undefined);
  });
  it('does not parse comment inside manifest resource', () => {
    let data;
    assert.throws(() => {
      const manifestAst = parse(`
        import '../Pipes/PipeEntity.schema'

        resource PipeEntityResource
          start
          [{"type": "artist", "name": "in this moment"}]
          //[{"type": "tv_show", "name": "star trek"}]

        store ExamplePipeEntity of PipeEntity 'ExamplePipeEntity' @0 in PipeEntityResource
      `);
      data = JSON.parse(manifestAst[1].data);
    }, `Unexpected token / in JSON at position 47`);
    assert.equal(data, undefined);
  });
  it('ignores comments inside manifest resource', () => {
    const manifestAst = parse(`
      import '../Pipes/PipeEntity.schema'

      resource PipeEntityResource
        start
        [{"type": "artist", "name": "in this moment"}]
      //[{"type": "tv_show", "name": "star trek"}]

      store ExamplePipeEntity of PipeEntity 'ExamplePipeEntity' @0 in PipeEntityResource
    `);
    assert.lengthOf(manifestAst, 3, 'Incorrectly parsed manifest');
    assert.deepEqual(
      JSON.stringify(JSON.parse(manifestAst[1].data)),
      '[{"type":"artist","name":"in this moment"}]'
    );
  });
});
