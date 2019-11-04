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
import {Flags} from '../flags.js';

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
          a: writes #something
          b: reads #somethingElse
          any #someOtherParticle`);
  });
  it('parses trivial particles', () => {
    parse(`
      particle SomeParticle`);
  });
  it('parses recipes that name handles and particles', () => {
    parse(`
      recipe Recipe
        SomeParticle as thing
        anotherThing: map #thing`);
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
        X: writes Y
        X.a: writes Y.a
        &foo.bar: writes &far.#bash #fash
        a: any b
        a.a: any b.b
        X.a #tag: reads a.y`);
  });
  it('parses manifests with stores', () => {
    parse(`
      schema Person
        lastName: Text
        firstName: Text
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
          consumes: reads MyThing
          output: writes? BigCollection<MyThing>`);
      assert.fail('this parse should have failed, identifiers should not be reserved words!');
    } catch (e) {
      assert.include(e.message, 'Expected', `bad error: '${e}'`);
    }
  });
  it('allows identifiers to start with reserved words', () => {
    parse(`
      particle MyParticle
        mapped: reads MyThing
        import_export: writes? BigCollection<MyThing>`);
  });
  it('allows reserved words for schema field names', () => {
    // Test with a non-word char following the token
    parse(`
      schema Reserved
        schema: Text // comment`);
    // Test with end-of-input following the token
    parse(`
      schema Reserved
        map: URL`);
  });
  it('allows reserved words for inline schema field names', () => {
    parse(`
      particle Foo
        a: reads A {handle: Text}
        b: writes B {import: Boolean, particle: Number}`);
  });
  it('fails to parse an unterminated identifier', () => {
    try {
      parse(`
        import 'foo`);
      assert.fail('this parse should have failed, identifiers should terminate!');
    } catch (e) {
      assert.include(e.message, 'Expected', `bad error: '${e}'`);
    }
  });
  it('fails to parse an identifier containing a new line', () => {
    try {
      parse(`
        import 'foo
          '`);
      assert.fail('this parse should have failed, identifiers should not be multiline!');
    } catch (e) {
      assert.include(e.message, 'Expected', `bad error: '${e}'`);
    }
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
        mandatory: reads MyThing
        optional1: reads? MyThing
        optional2: writes? [MyThing]
        optional3: writes? BigCollection<MyThing>`);
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
        energy: reads Energy
        height: writes Height
        modality dom`);
  });
  it('parses recipe with particle verbs', () => {
    parse(`
      recipe
        &jump
          reads energy
          writes height`);
  });
  it('parses recipe with particle verb shorthand', () => {
    parse(`
      recipe
        &jump
          reads energy
          reads height`);
  });
  it('parses inline schemas', () => {
    parse(`
      particle Foo
        mySchema: reads MySchema {value: Text}
    `);
    parse(`
      particle Foo
        mySchema: reads [MySchema {value: Text}]
    `);
    parse(`
      particle Foo
        anonSchema: reads [* {value: Text, num: Number}]
    `);
    parse(`
      particle Foo
        union: reads * {value: (Text or Number)}
    `);
    parse(`
      particle Foo
        optionalType: reads * {value}
    `);
  });
  it('parses a schema with a bytes field', () => {
    parse(`
      schema Avatar
        name: Text
        profileImage: Bytes
      `);
  });
  it('parses a schema with a reference field', () => {
    parse(`
      schema Product
        review: Reference<Review>
    `);
  });
  it('parses a schema with a referenced inline schema', () => {
    parse(`
      schema Product
        review: Reference<Review {reviewText: Text}>
    `);
  });
  it('parses an inline schema with a reference to a schema', () => {
    parse(`
      particle Foo
        inReview: reads Product {review: Reference<Review>}
    `);
  });
  it('parses an inline schema with a collection of references to schemas', () => {
    parse(`
      particle Foo
        inResult: reads Product {review: [Reference<Review>]}
    `);
  });
  it('parses an inline schema with a referenced inline schema', () => {
    parse(`
    particle Foo
      inReview: reads Product {review: Reference<Review {reviewText: Text}> }
    `);
  });
  it('parses an inline schema with a collection of references to inline schemas', () => {
    parse(`
      particle Foo
        productReviews: reads Product {review: [Reference<Review {reviewText: Text}>]}
    `);
  });
  it('parses reference types', () => {
    parse(`
      particle Foo
        inRef: reads Reference<Foo>
        outRef: writes Reference<Bar>
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
          thing2: slot
          Particle
            reads thing
            consumes thing2
    `);
  });
  it('parses handle creation using the handle keyword', () => {
    parse(`
      recipe
        handle as h0
        Particle
          input: reads h0
    `);
  });
  it('parses handle with type with prefix "Slot"', () => {
    parse(`
      particle P in './p.js'
        s: reads Sloturnicus
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
    assert.strictEqual(data, undefined);
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
    assert.strictEqual(data, undefined);
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
