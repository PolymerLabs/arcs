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
  it('fails to parse non-standard indentation (horizontal tab)', () => {
    // Note: This is to protect against confusing whitespace issues caused by
    // mixed tabs and spaces.
    assert.throws(() => {
    parse('\trecipe Recipe');
    }, 'Expected space but "\\t" found.');
  });
  it('fails to parse non-standard indentation (vertical tab)', () => {
    // Note: This is to protect against confusing whitespace issues caused by
    // mixed tabs and spaces.
    assert.throws(() => {
    parse('\vrecipe Recipe');
    }, 'Expected space but "\\x0B" found.');
  });
  it('fails to parse non-standard indentation (non-breaking space)', () => {
    // Note: This is to protect against confusing whitespace issues caused by
    // mixed tabs and spaces.
    assert.throws(() => {
    parse('\xA0recipe Recipe');
    }, 'Expected space but "\xA0" found.');
  });
  it('parses recipes that map handles', () => {
    parse(`
      recipe Thing
        map #someTag
        map 'some-id' #someTag`);
  });
  it('parses recipes that creates handles with ttls', () => {
    parse(`
      recipe Thing
        h0: create #myTag @ttl(20d)
        h1: create 'my-id' #anotherTag @ttl(1h)
        h2: create @ttl ( 30m )`);
  });
  it('parses recipes with a synthetic join handles', () => {
    parse(`
      recipe
        people: map #folks
        places: map #locations
        pairs: join (people, places)`);
  });
  it('parses recipe handles with capabilities', () => {
    parse(`
      recipe Thing
        h0: create persistent
        h1: create tied-to-runtime 'my-id'
        h2: create tied-to-arc #mytag`);
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
          #someOtherParticle`);
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
        a: b
        a.a: b.b
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
  it('parses inline schemas with any name', () => {
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
  it('parses inline schemas with a trailing comma', () => {
    parse(`
      particle Foo
        input: reads [{value: Text, num: Number,}]
    `);
    parse(`
      particle Foo
        input: reads [{
          value: Text,
          num: Number,
        }]
    `);
  });
  it('parses inline schemas with no name', () => {
    parse(`
      particle Foo
        anonSchema: reads [{value: Text, num: Number}]
    `);
    parse(`
      particle Foo
        union: reads {value: (Text or Number)}
    `);
    parse(`
      particle Foo
        optionalType: reads {value}
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
        review: &Review
    `);
  });
  it('parses a schema with a reference field (with sugar)', () => {
    parse(`
      schema Product
        review: &Review
    `);
  });
  it('parses a schema with a referenced inline schema', () => {
    parse(`
      schema Product
        review: &Review {reviewText: Text}
    `);
  });
  it('parses a schema with a referenced inline schema (with sugar)', () => {
    parse(`
      schema Product
        review: &Review {reviewText: Text}
    `);
  });
  it('parses an inline schema with a reference to a schema', () => {
    parse(`
      particle Foo
        inReview: reads Product {review: &Review}
    `);
  });
  it('parses an inline schema with a reference to a schema (with sugar)', () => {
    parse(`
      particle Foo
        inReview: reads Product {review: &Review}
    `);
  });
  it('parses an inline schema with a collection of references to schemas', () => {
    parse(`
      particle Foo
        inResult: reads Product {review: [&Review]}
    `);
  });
  it('parses an inline schema with a collection of references to schemas (with sugar)', () => {
    parse(`
      particle Foo
        inResult: reads Product {review: [&Review]}
    `);
  });
  it('parses an inline schema with a referenced inline schema', () => {
    parse(`
    particle Foo
      inReview: reads Product {review: &Review {reviewText: Text} }
    `);
  });
  it('parses an inline schema with a referenced inline schema (with sugar)', () => {
    parse(`
    particle Foo
      inReview: reads Product {review: &Review {reviewText: Text} }
    `);
  });
  it('parses an inline schema with a collection of references to inline schemas', () => {
    parse(`
      particle Foo
        productReviews: reads Product {review: [&Review {reviewText: Text}]}
    `);
  });
  it('parses an inline schema with a collection of references to inline schemas (with sugar)', () => {
    parse(`
      particle Foo
        productReviews: reads Product {review: [&Review {reviewText: Text}]}
    `);
  });
  it('parses a schema with kotlin types', () => {
    parse(`
      schema KotlinThings
        aByte: Byte
        aShort: Short
        anInt: Int
        aLong: Long
        aChar: Char
        aFloat: Float
        aDouble: Double
    `);
  });
  it('parses an inline schema with kotlin types', () => {
    parse(`
      particle Foo
        kotlinThings: reads KotlinThings {aByte: Byte, aShort: Short, anInt: Int, aLong: Long, aChar: Char, aFloat: Float, aDouble: Double}
    `);
  });
  it('parses typenames with reserved type names as a prefix (Boolean)', () => {
    parse(`
      particle Foo
        inRef: reads Booleanlike
    `);
  });
  it('fails to parse reserved type names (Boolean)', () => {
    assert.throws(() => {
      parse(`
        particle Foo
          inRef: reads Boolean
      `);
    }, 'Expected an upper case identifier but "Boolean" found.');
  });
  it('fails to parse reserved type names (URL)', () => {
    assert.throws(() => {
      parse(`
        particle Foo
          outRef: writes URL
      `);
    }, 'Expected an upper case identifier but "URL" found.');
  });
  it('parses reference types', () => {
    parse(`
      particle Foo
        inRef: reads Reference<Foo>
        outRef: writes Reference<Bar>
    `);
  });
  it('parses reference types (with sugar)', () => {
    parse(`
      particle Foo
        inRef: reads &Foo
        outRef: writes &Bar
    `);
  });
  it('fails to parse an empty tuple', () => {
    assert.throws(() => {
      parse(`
        particle Foo
          data: reads ()
      `);
    });
  });
  it('parses tuple with one type', () => {
    parse(`
      particle Foo
        data: reads (Foo)
    `);
  });
  it('parses tuple with two types', () => {
    parse(`
      particle Foo
        data: writes ([Foo], &Bar {name: Text})
    `);
  });
  it('fails to parse a tuple without separator between elements', () => {
    assert.throws(() => {
      parse(`
        particle Foo
          data: reads (Foo{}Bar{})
      `);
    });
  });
  it('parses tuple with indented types and comments', () => {
    parse(`
      particle Foo
        data: reads (
          Foo, // First type
          &Bar {name: Text}, // Second type
          [Baz {photo: URL}] // Third type
        )
    `);
  });
  it('parses tuple with indented types and trailing comma', () => {
    parse(`
      particle Foo
        data: reads (
          &Foo,
          &Bar,
        )
    `);
  });
  it('parses refinement types in a schema', Flags.withFieldRefinementsAllowed(async () => {
      parse(`
        schema Foo
          num: Number [num > 10]
      `);
  }));
  it('parses refinement types in a particle', Flags.withFieldRefinementsAllowed(async () => {
    parse(`
    particle Foo
      input: reads Something {value: Text [ (square - 5) < 11 and (square * square > 5) or square == 0] }
    `);
    parse(`
    particle Foo
      input: reads Something {value: Number [value > 0], price: Number [price > 0]} [value > 10 and price < 5]
    `);
    parse(`
    particle Foo
      input: reads Something {value: Number, price: Number} [value > 10 and price < 5]
    `);
    parse(`
    particle Foo
      input: reads Something {value: Text [value == 'abc']}
    `);
  }));
  it('tests the refinement syntax tree', Flags.withFieldRefinementsAllowed(async () => {
    const manifestAst = parse(`
    particle Foo
      input: reads Something {value: Text [ a < b and d > 2*2+1 ] }
    `);
    const particle = manifestAst[0];
    const handle = particle.args[0];
    const htype = handle.type;
    assert.deepEqual(htype.kind, 'schema-inline', 'Unexpected handle type.');
    const refExpr = htype.fields[0].type.refinement.expression;

    let root = refExpr;
    assert.deepEqual(root.kind, 'binary-expression-node');
    assert.deepEqual(root.operator, 'and');

    root = refExpr.leftExpr;
    assert.deepEqual(root.kind, 'binary-expression-node');
    assert.deepEqual(root.operator, '<');
    assert.deepEqual(root.leftExpr.value, 'a');
    assert.deepEqual(root.rightExpr.value, 'b');

    root = refExpr.rightExpr;
    assert.deepEqual(root.kind, 'binary-expression-node');
    assert.deepEqual(root.operator, '>');
    assert.deepEqual(root.leftExpr.value, 'd');

    root = refExpr.rightExpr.rightExpr;
    assert.deepEqual(root.kind, 'binary-expression-node');
    assert.deepEqual(root.operator, '+');
    assert.deepEqual(root.rightExpr.value, 1);

    root = refExpr.rightExpr.rightExpr.leftExpr;
    assert.deepEqual(root.kind, 'binary-expression-node');
    assert.deepEqual(root.operator, '*');
    assert.deepEqual(root.leftExpr.value, 2);
    assert.deepEqual(root.rightExpr.value, 2);
  }));
  it('does not parse invalid refinement expressions', () => {
      assert.throws(() => {
      parse(`
      particle Foo
        input: reads Something {value: Text [value <<>>>>> ]}
      `);
      }, `a valid refinement expression`);

      assert.throws(() => {
        parse(`
        particle Foo
          input: reads Something {value: Text [ [[ value *- 2 ]}
        `);
        }, `a valid refinement expression`);

      assert.throws(() => {
        parse(`
        particle Foo
          input: reads Something {value: Text [ value */ 2 ]}
        `);
        }, `a valid refinement expression`);
  });
  it('parses nested referenced inline schemas', () => {
    parse(`
      particle Foo
        mySchema: reads MySchema {value: &OtherSchema {name: Text}}
    `);
  });
  it('fails to parse nested (non-referenced) inline schemas', () => {
    assert.throws(() => {
    parse(`
      particle Foo
        mySchema: reads MySchema {value: OtherSchema {name: Text}}
    `);
    }, 'a schema type');
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

  describe('inline data stores', () => {
    // Store AST nodes have an entities field holding an array of objects formatted as:
    //   { kind: 'entity-inline', location: {...}, fields: {<name>: <descriptor>, ...}
    function extractEntities(storeAst) {
      return storeAst.entities.map(item => {
        assert.strictEqual(item.kind, 'entity-inline');
        assert.containsAllKeys(item, ['location', 'fields']);
        return item.fields;
      });
    }

    it('parses text fields', () => {
      const manifestAst = parse(`
        store A of [{txt: Text}] with {
          {txt: ''},
          {txt: 'test string'},
          {txt: '\\'quotes\\''},
          {txt: 'more \\\\ escaping \\' here'},
          {txt: '\\tabs and \\newlines are translated'},
          {txt: '\\other \\chars are\\ n\\ot'},
        }
      `);
      assert.deepStrictEqual(extractEntities(manifestAst[0]), [
        {txt: {kind: 'entity-value', value: ''}},
        {txt: {kind: 'entity-value', value: 'test string'}},
        {txt: {kind: 'entity-value', value: '\'quotes\''}},
        {txt: {kind: 'entity-value', value: 'more \\ escaping \' here'}},
        {txt: {kind: 'entity-value', value: '\tabs and \newlines are translated'}},
        {txt: {kind: 'entity-value', value: 'other chars are not'}},
      ]);
    });
    it('parses url fields', () => {
      const manifestAst = parse(`
        store A of [{u: URL}] with {
          {u: ''}, {u: 'http://www.foo.com/go?q=%27hi?=%25'},
        }
      `);
      assert.deepStrictEqual(extractEntities(manifestAst[0]), [
        {u: {kind: 'entity-value', value: ''}},
        {u: {kind: 'entity-value', value: 'http://www.foo.com/go?q=%27hi?=%25'}},
      ]);
    });
    it('parses number fields', () => {
      const manifestAst = parse(`
        store A of [{num: Number}] with {
          {num: 0},
          {num: 0.8},
          {num: 51},
          {num: -6},
          {num: -120.5}
        }
      `);
      assert.deepStrictEqual(extractEntities(manifestAst[0]), [
        {num: {kind: 'entity-value', value: 0}},
        {num: {kind: 'entity-value', value: 0.8}},
        {num: {kind: 'entity-value', value: 51}},
        {num: {kind: 'entity-value', value: -6}},
        {num: {kind: 'entity-value', value: -120.5}},
      ]);
    });
    it('parses boolean fields', () => {
      const manifestAst = parse(`
        store A of [{flg: Boolean}] with { {flg: true}, {flg: false} }
      `);
      assert.deepStrictEqual(extractEntities(manifestAst[0]), [
        {flg: {kind: 'entity-value', value: true}},
        {flg: {kind: 'entity-value', value: false}},
      ]);
    });
    it('parses bytes fields', () => {
      const manifestAst = parse(`
        store A of [{buf: Bytes}] with {
          {buf: ||},
          {buf: |0|},
          {buf: |23,|},
          {buf: |7, ff, 4d|},
          {buf: |7, ff, 4d,|},
        }
      `);
      assert.deepStrictEqual(extractEntities(manifestAst[0]), [
        {buf: {kind: 'entity-value', value: new Uint8Array()}},
        {buf: {kind: 'entity-value', value: new Uint8Array([0])}},
        {buf: {kind: 'entity-value', value: new Uint8Array([0x23])}},
        {buf: {kind: 'entity-value', value: new Uint8Array([0x07, 0xff, 0x4d])}},
        {buf: {kind: 'entity-value', value: new Uint8Array([0x07, 0xff, 0x4d])}},
      ]);
    });
    it('parses reference fields', () => {
      const manifestAst = parse(`
        store A of {ref: &{z: Text}} with { {ref: <'id1', 'key1'>} }
      `);
      assert.deepStrictEqual(extractEntities(manifestAst[0]), [
        {ref: {kind: 'entity-value', value: {id: 'id1', entityStorageKey: 'key1'}}}
      ]);
    });
    it('parses collection fields', () => {
      const manifestAst = parse(`
        store S0 of [{col: [Text]}] with {
          {col: []},
          {col: ['a', 'b\\'c']},
        }

        store S1 of [{col: [Number]}] with {
          {col: [12]},
          {col: [-5, 23.7, 0, ]},
        }

        store S2 of {col: [Boolean]} with {
          {col: [true, true, false]}
        }

        store S3 of {col: [Bytes]} with {
          {col: [|a2|, |0, 50|, ||]}
        }

        store S4 of {col: [&{n: Number}]} with {
          {col: [<'i0', 'k0'>, <'i1', 'k1'>]}
        }
      `);
      assert.deepStrictEqual(extractEntities(manifestAst[0]), [
        {col: {kind: 'entity-collection', value: []}},
        {col: {kind: 'entity-collection', value: ['a', 'b\'c']}},
      ]);
      assert.deepStrictEqual(extractEntities(manifestAst[1]), [
        {col: {kind: 'entity-collection', value: [12]}},
        {col: {kind: 'entity-collection', value: [-5, 23.7, 0]}},
      ]);
      assert.deepStrictEqual(extractEntities(manifestAst[2]), [
        {col: {kind: 'entity-collection', value: [true, true, false]}},
      ]);
      assert.deepStrictEqual(extractEntities(manifestAst[3]), [
        {col: {kind: 'entity-collection', value: [
          new Uint8Array([0xa2]),
          new Uint8Array([0, 0x50]),
          new Uint8Array(),
        ]}},
      ]);
      assert.deepStrictEqual(extractEntities(manifestAst[4]), [
        {col: {kind: 'entity-collection', value: [
          {id: 'i0', entityStorageKey: 'k0'},
          {id: 'i1', entityStorageKey: 'k1'},
        ]}},
      ]);
    });
    it('parses tuple fields', () => {
      const manifestAst = parse(`
        store A of [{t: (Text, Number, Boolean, Bytes)}] with {
          {t: ('a\\tb', -7.9, false, |7e, 46,|)},
          {t: ('', 0, true, ||)}
        }
      `);
      assert.deepStrictEqual(extractEntities(manifestAst[0]), [
        {t: {kind: 'entity-tuple', value: [
          'a\tb', -7.9, false, new Uint8Array([0x7e, 0x46])
        ]}},
        {t: {kind: 'entity-tuple', value: [
          '', 0, true, new Uint8Array()
        ]}},
      ]);
    });
    it('parses standard components of store expressions', () => {
      const manifestAst = parse(`
        store S0 of {n: Number} with { {n: 1} }

        store S1 of {t: Text} 'id'!!'orig' @3 #tag with
          {
            {t: 'a'}
          }
          description \`inline store\`
          claim is foo
      `);
      assert.deepInclude(manifestAst[0], {
        kind: 'store',
        name: 'S0',
        id: null,
        originalId: null,
        version: null,
        tags: null,
        source: 'inline',
        origin: 'inline',
        storageKey: null,
        description: null,
        claims: [],
      });
      delete manifestAst[1].claims[0].location;
      assert.deepInclude(manifestAst[1], {
        kind: 'store',
        name: 'S1',
        id: 'id',
        originalId: 'orig',
        version: '3',
        tags: ['tag'],
        source: 'inline',
        origin: 'inline',
        storageKey: null,
        description: 'inline store',
        claims: [{kind: 'manifest-storage-claim', tags: ['foo'], fieldPath: []}],
      });
    });
    it('parses complex schemas with variable spacing and comments', () => {
      const manifestAst = parse(`
        store A of [{n: Number, c: [Text], t: (Boolean, Bytes), r: &{z: URL}}]  with  { // comment
          {n:4.5,c:['abc'],t:(true,|0|),r:<'i1','k1'>},
             {
             n:
               0.0,//comment
        c:   [ '\\'',
        '\\t'  ,'',]   ,    t:  (  FALSE  , |   22,
                d3  ,
             |),
              // full line comment
             r:  <    'i2'    ,


                  'k2'    >}}
      `);
      assert.deepStrictEqual(extractEntities(manifestAst[0]), [
        {
          n: {kind: 'entity-value', value: 4.5},
          c: {kind: 'entity-collection', value: ['abc']},
          t: {kind: 'entity-tuple', value: [true, new Uint8Array([0])]},
          r: {kind: 'entity-value', value: {id: 'i1', entityStorageKey: 'k1'}},
        },
        {
          n: {kind: 'entity-value', value: 0},
          c: {kind: 'entity-collection', value: ['\'', '\t', '']},
          t: {kind: 'entity-tuple', value: [false, new Uint8Array([0x22, 0xd3])]},
          r: {kind: 'entity-value', value: {id: 'i2', entityStorageKey: 'k2'}},
        }
      ]);
    });
    it('requires consistent value types for collection fields', () => {
      const msg = 'Collection fields for inline entities must have a consistent value type';
      assert.throws(() => { parse(`
        store A of {txt: [Text]} with { {txt: ['aa', true, 'bb']} }`);
      }, msg);
      assert.throws(() => { parse(`
        store A of {num: [Number]} with { {num: [5, 'x']} }`);
      }, msg);
      assert.throws(() => { parse(`
        store A of {flg: [Boolean]} with { {flg: [true, |83|]} }`);
      }, msg);
      assert.throws(() => { parse(`
        store A of {z: [Bytes]} with { {z: [|5|, |0, aa|, <'id', 'key'>, |4d|]} }`);
      }, msg);
    });
    it('requires the id and storage key to be present in references', () => {
      const msg = 'Reference fields for inline entities must have both an id and a storage key';
      assert.throws(() => { parse(`
        store A of {ref: &{t: Text}} with { {ref: <'', 'key'>} }`);
      }, msg);
      assert.throws(() => { parse(`
        store A of {ref: &{t: Text}} with { {ref: <'id', ''>} }`);
      }, msg);
    });
  });
});
