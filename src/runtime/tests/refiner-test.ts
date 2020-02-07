/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Range, Segment, Refinement, BinaryExpression, UnaryExpression, SQLExtracter, Polynomial, Fraction} from '../refiner.js';
import {parse} from '../../gen/runtime/manifest-parser.js';
import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../manifest.js';
import {Entity, EntityClass} from '../entity.js';
import {Schema} from '../schema.js';
import {Flags} from '../flags.js';
describe('refiner', () => {
    it('Refines data given an expression.', () => {
        const manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [ (num/-3 < 0 and num*num == 36) or num == 0 ] }
        `);
        const typeData = {'num': 'Number'};
        const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        const data = {
            num: 6
        };
        const res = ref.validateData(data);
        assert.strictEqual(res, data.num === 0 || data.num === 6);
    });
    it('Throws error when field name not found.', () => {
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ num < num2 ] }
            `);
            const typeData = {'num': 'Number'};
            const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
            const data = {
                num: 6,
            };
            ref.validateData(data);
        }, `Unresolved field name 'num2' in the refinement expression.`);
    });
    it('Throws error when expression does not produce boolean result.', () => {
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ num + 5 ] }
            `);
            const typeData = {'num': 'Number'};
            const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
            const data = {
                num: 6,
            };
            ref.validateData(data);
        }, `Refinement expression (num + 5) evaluated to a non-boolean type.`);
    });
    it('Throws error when operators and operands are incompatible.', () => {
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ (num < 5) + 3 == 0 ] }
            `);
            const typeData = {'num': 'Number'};
            const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
            const data = {
                num: 6,
            };
            ref.validateData(data);
        }, `Refinement expression (num < 5) has type Boolean. Expected Number.`);
        assert.throws(() => {
            const manifestAst = parse(`
                particle Foo
                    input: reads Something {num: Number [ (num and 3) == 0 ] }
            `);
            const typeData = {'num': 'Number'};
            const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
            const data = {
                num: 6,
            };
            ref.validateData(data);
        }, `Refinement expression num has type Number. Expected Boolean.`);
        assert.throws(() => {
          const manifestAst = parse(`
              particle Foo
                  input: reads Something {name: Text [ name > 'Ragav' ] }
          `);
          const typeData = {'name': 'Text'};
          const ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
          const data = {
              name: 'Josh',
          };
            ref.validateData(data);
        }, `Refinement expression name has type Text. Expected Number.`);
    });
    it('tests expression to range conversion.', () => {
        let manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [ ((num < 3) and (num > 0)) or (num == 5) ] }
        `);
        const typeData = {'num': 'Number'};
        let ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        let range = Range.fromExpression(ref.expression);
        assert.isTrue(range.equals(new Range([Segment.openOpen(0, 3), Segment.closedClosed(5, 5)])));
        manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [(num > 10) == (num >= 20)] }
        `);
        ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        range = Range.fromExpression(ref.expression);
        assert.isTrue(range.equals(new Range([Segment.openClosed(Number.NEGATIVE_INFINITY, 10), Segment.closedOpen(20, Number.POSITIVE_INFINITY)])));
        manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [not (num != 10)] }
        `);
        ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        range = Range.fromExpression(ref.expression);
        assert.isTrue(range.equals(new Range([Segment.closedClosed(10, 10)])));

    });
    it('regression test for parse failure on operator ordering.', () => {
      parse(`
      particle Foo
          input: reads Something {num: Number [num <= 20] }
      `);
  });
});

describe('refiner enforcement', () => {
    let schema: Schema;
    let entityClass: EntityClass;
    before(async () => {
      const manifest = await Manifest.parse(`
        schema Foo
          txt: Text
          num: Number [num < 10]
          flg: Boolean
      `);
      schema = manifest.schemas.Foo;
      entityClass = Entity.createEntityClass(schema, null);
    });

    it('data does not conform to the refinement', Flags.whileEnforcingRefinements(async () => {
      assert.throws(() => { const e = new entityClass({txt: 'abc', num: 56}); }, `Entity schema field 'num' does not conform to the refinement.`);
    }));

    it('data does conform to the refinement', Flags.whileEnforcingRefinements(async () => {
        assert.doesNotThrow(() => { const e = new entityClass({txt: 'abc', num: 8}); });
      }));
});

describe('dynamic refinements', () => {
    it('Parses and type checks a particle with dynamic refinements.', () => {
        const manifestAst = parse(`
            particle AddressBook
                contacts: reads [Contact {name: Text [ name == ? ] }]
        `);
        const typeData = {'name': 'Text'};
        const contacts = manifestAst[0].args[0];
        const nameType = contacts.type.type.fields[0].type;
        const ref = Refinement.fromAst(nameType.refinement, typeData);

        assert.sameMembers([...ref.expression.getFieldNames()], ['name', '?'], 'should infer indexes from refinement');

        assert.strictEqual(ref.toString(), '[(name == ?)]');
        const dyn = (ref.expression as BinaryExpression).rightExpr;
        assert.equal(dyn.evalType, 'Text', 'the algorithm discovers the type');
    });
});

describe('normalisation', () => {
    it('tests if field name is rearranged to left in a binary node.', () => {
        const manifestAst1 = parse(`
            particle Foo
                input: reads Something {num: Number [ (10+2) > num ] }
        `);
        const typeData = {'num': 'Number'};
        const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
        ref1.normalize();
        const manifestAst2 = parse(`
            particle Foo
                input: reads Something {num: Number [ num < 12 ] }
        `);
        const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
        // normalized version of ref1 should be the same as ref2
        assert.strictEqual(JSON.stringify(ref1), JSON.stringify(ref2));
    });
    it('tests if primitive boolean expressions are automatically evaluated', () => {
        const manifestAst1 = parse(`
            particle Foo
                input: reads Something {num: Boolean [ num == not (true or false) ] }
        `);
        const typeData = {'num': 'Boolean'};
        const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
        ref1.normalize();
        const manifestAst2 = parse(`
            particle Foo
                input: reads Something {num: Boolean [ not num ] }
        `);
        const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
        // normalized version of ref1 should be the same as ref2
        assert.strictEqual(JSON.stringify(ref1), JSON.stringify(ref2));
    });
    it('tests if primitive math expressions are automatically evaluated', () => {
        const manifestAst1 = parse(`
            particle Foo
                input: reads Something {num: Number [ (2+11-9) > num or False ] }
        `);
        const typeData = {'num': 'Number'};
        const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
        ref1.normalize();
        const manifestAst2 = parse(`
            particle Foo
                input: reads Something {num: Number [ num < 4 ] }
        `);
        const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
        // normalized version of ref1 should be the same as ref2
        assert.strictEqual(JSON.stringify(ref1), JSON.stringify(ref2));
    });
    it(`tests if multiple 'not's are cancelled. `, () => {
        const manifestAst1 = parse(`
            particle Foo
                input: reads Something {num: Boolean [ not (not num) ] }
        `);
        const typeData = {'num': 'Boolean'};
        const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
        ref1.normalize();
        const manifestAst2 = parse(`
            particle Foo
                input: reads Something {num: Boolean [ num ] }
        `);
        const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
        // normalized version of ref1 should be the same as ref2
        assert.strictEqual(JSON.stringify(ref1), JSON.stringify(ref2));
    });
    it(`tests if expressions are rearranged 1`, () => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number [ (num + 5) <= (2*num - 11) ] }
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
      ref1.normalize();
      const manifestAst2 = parse(`
          particle Foo
              input: reads Something {num: Number [ num > 16 or num == 16] }
      `);
      const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
      // normalized version of ref1 should be the same as ref2
      assert.strictEqual(JSON.stringify(ref1), JSON.stringify(ref2));
  });
  it(`tests if expressions are rearranged 2`, () => {
    const manifestAst1 = parse(`
        particle Foo
            input: reads Something {num: Number [ (num - 5)/(num - 2) <= 0 ] }
    `);
    const typeData = {'num': 'Number'};
    const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
    ref1.normalize();
    const manifestAst2 = parse(`
        particle Foo
            input: reads Something {num: Number [ ((num > 5 and num < 2) or (num < 5 and num > 2)) or (num == 5 and num != 2) ] }
    `);
    const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
    // normalized version of ref1 should be the same as ref2
    assert.strictEqual(JSON.stringify(ref1), JSON.stringify(ref2));
});
  it(`tests if expressions are rearranged 3`, () => {
    const manifestAst1 = parse(`
        particle Foo
            input: reads Something {num: Number [ (num+2)*(num+1)+3 > 4 ] }
    `);
    const typeData = {'num': 'Number'};
    const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
    ref1.normalize();
    const manifestAst2 = parse(`
        particle Foo
            input: reads Something {num: Number [ num*num + num*3 + 1 > 0 ] }
    `);
    const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
    // normalized version of ref1 should be the same as ref2
    assert.strictEqual(JSON.stringify(ref1), JSON.stringify(ref2));
  });
  it(`tests if expressions are rearranged 4`, () => {
    const manifestAst1 = parse(`
        particle Foo
            input: reads Something {num: Number [ ((num+2)/(2*num-1))+3 == 4 ] }
    `);
    const typeData = {'num': 'Number'};
    const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
    ref1.normalize();
    const manifestAst2 = parse(`
        particle Foo
            input: reads Something {num: Number [ num == 3 and num != 0.5 ] }
    `);
    const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
    // normalized version of ref1 should be the same as ref2
    assert.strictEqual(JSON.stringify(ref1), JSON.stringify(ref2));
  });
});

describe('Range', () => {
    it('tests union operations on a range', () => {
        const range1 = new Range();
        // range1 = [];
        range1.unionWithSeg(Segment.closedClosed(0, 10));
        // range1 = [0, 10];
        assert.isTrue(range1.equals(new Range([Segment.closedClosed(0, 10)])));
        range1.unionWithSeg(Segment.openClosed(20, 30));
        // range1 = [0, 10] U (20,30];
        assert.isTrue(range1.equals(new Range([Segment.closedClosed(0, 10), Segment.openClosed(20, 30)])));
        range1.unionWithSeg(Segment.closedOpen(5, 15));
        // range1 = [0, 15) U (20,30];
        assert.isTrue(range1.equals(new Range([Segment.closedOpen(0, 15), Segment.openClosed(20, 30)])));
        const range2 = new Range([Segment.closedClosed(-1, -1), Segment.closedClosed(5, 7), Segment.openClosed(15, 19)]);
        // range2 = [-1, -1] U [5, 7] U (15,19];
        range1.union(range2);
        // range1 = [-1, -1] U [0, 15) U (15, 19] U (20, 30]
        assert.isTrue(range1.equals(new Range([Segment.closedClosed(-1, -1), Segment.closedOpen(0, 15), Segment.openClosed(15, 19), Segment.openClosed(20, 30)])));
    });
    it('tests intersection operations on a range', () => {
        const range1 = new Range([Segment.closedClosed(0, 10), Segment.closedClosed(20, 30)]);
        // range1 = [0, 10] U [20,30];
        range1.intersectWithSeg(Segment.openOpen(5, 25));
        // range1 = (5, 10] U [20, 25);
        assert.isTrue(range1.equals(new Range([Segment.openClosed(5, 10), Segment.closedOpen(20, 25)])));
        range1.intersectWithSeg(Segment.closedOpen(5, 15));
        // range1 = (5, 10];
        assert.isTrue(range1.equals(new Range([Segment.openClosed(5, 10)])));
        const range2 = new Range([Segment.closedClosed(-1, -1), Segment.closedOpen(4, 10), Segment.closedClosed(13, 19)]);
        // range2 = [-1, -1] U [4, 10) U [13,19];
        range1.intersect(range2);
        // range1 = (5, 10);
        assert.isTrue(range1.equals(new Range([Segment.openOpen(5, 10)])));
    });
    it('tests if a range is a subset of another', () => {
        let range1 = Range.infiniteRange();
        // range1 = (-inf, +inf)
        const range2 = new Range([Segment.closedClosed(0, 10), Segment.closedClosed(20, 30)]);
        // range2 = [0, 10] U [20,30];
        assert.isTrue(range2.isSubsetOf(range1));
        range1 = new Range([Segment.closedClosed(0, 10), Segment.closedClosed(20, 30)]);
        // range1 = [0, 10] U [20,30];
        assert.isTrue(range2.isSubsetOf(range1));
        range1 = new Range([Segment.closedClosed(0, 10), Segment.closedClosed(22, 30)]);
        // range1 = [0, 10] U [22,30];
        assert.isFalse(range2.isSubsetOf(range1));
        range1 = new Range();
        // range1 = [];
        assert.isTrue(range1.isSubsetOf(range2));
        range1 = new Range([Segment.closedOpen(0, 10), Segment.closedClosed(20, 30)]);
        // range1 = [0, 10) U [20,30];
        assert.isTrue(range1.isSubsetOf(range2));
    });
    it('tests the difference of ranges', () => {
        let range1 = Range.infiniteRange();
        // range1 = (-inf, +inf)
        let range2 = new Range();
        range2 = new Range([Segment.closedClosed(0, 10), Segment.closedClosed(20, 30)]);
        // range2 = [0, 10] U [20,30];
        let diff = Range.difference(range1, range2);
        // diff = (-inf, 0) U (10,20) U (30, inf)
        assert.isTrue(diff.equals(new Range([Segment.openOpen(Number.NEGATIVE_INFINITY, 0), Segment.openOpen(10, 20), Segment.openOpen(30, Number.POSITIVE_INFINITY)])));
        range1 = new Range([Segment.closedOpen(0, 20), Segment.openClosed(40, 50)]);
        // range1 = [0,20) U (40, 50]
        range2 = new Range([Segment.openOpen(0, 5), Segment.closedOpen(7, 12), Segment.closedClosed(15, 43), Segment.openClosed(45, 50)]);
        // range2 = (0,5) U [7,12) U [15, 43] U (45, 50]
        diff = Range.difference(range1, range2);
        // diff = [0, 0] U [5,7) U [12,15) U (43, 45]
        assert.isTrue(diff.equals(new Range([Segment.closedClosed(0, 0), Segment.closedOpen(5, 7), Segment.closedOpen(12, 15), Segment.openClosed(43, 45)])));
    });
    it('tests the complement of ranges', () => {
      let range = new Range([Segment.closedClosed(0, 10)]);
      // range =  [0,10]
      let complement = Range.complementOf(range);
      // complement = (-inf, 0) U (10, inf)
      assert.isTrue(complement.equals(new Range([Segment.openOpen(Number.NEGATIVE_INFINITY, 0), Segment.openOpen(10, Number.POSITIVE_INFINITY)])));
      range = Range.booleanRange(0);
      // range = [0,0]
      complement = Range.complementOf(range);
      // complement = [1,1]
      assert.isTrue(complement.equals(Range.booleanRange(1)));
    });
});

describe('SQLExtracter', () => {
  it('tests can create queries from refinement expressions involving math expressions', async () => {
      const manifest = await Manifest.parse(`
        particle Foo
          input: reads Something {a: Number [ a > 3 and a != 100 ], b: Number [b > 20 and b < 100] } [a + b/3 > 100]
      `);
      const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
      const query: string = SQLExtracter.fromSchema(schema, 'table');
      assert.strictEqual(query, 'SELECT * FROM table WHERE ((a + (b / 3)) > 100) AND ((a > 3) AND (NOT (a = 100))) AND ((b > 20) AND (b < 100));');
  });
  it('tests can create queries from refinement expressions involving boolean expressions', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        input: reads Something {a: Boolean [ not (a == true) ], b: Boolean [not not b != false] } [a or b]
    `);
    const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
    const query = SQLExtracter.fromSchema(schema, 'table');
    assert.strictEqual(query, 'SELECT * FROM table WHERE ((b = 1) OR (a = 1)) AND (NOT (a = 1)) AND (b = 1);');
  });
  it('tests can create queries where field refinement is null', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        input: reads Something {a: Boolean, b: Boolean} [a and b]
    `);
    const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
    const query = SQLExtracter.fromSchema(schema, 'table');
    assert.strictEqual(query, 'SELECT * FROM table WHERE ((b = 1) AND (a = 1));');
  });
  it('tests can create queries where schema refinement is null', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        input: reads Something {a: Boolean [not a], b: Boolean [b]}
    `);
    const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
    const query = SQLExtracter.fromSchema(schema, 'table');
    assert.strictEqual(query, 'SELECT * FROM table WHERE (NOT (a = 1)) AND (b = 1);');
  });
  it('tests can create queries where there is no refinement', async () => {
    const manifest = await Manifest.parse(`
      particle Foo
        input: reads Something {a: Boolean, b: Boolean}
    `);
    const schema = manifest.particles[0].handleConnectionMap.get('input').type.getEntitySchema();
    const query = SQLExtracter.fromSchema(schema, 'table');
    assert.strictEqual(query, 'SELECT * FROM table;');
  });
});

describe('Polynomial', () => {
  it('tests coeffs getters, setters and degree works', () => {
      let pn = new Polynomial([0, 1, 2]);       // 2a^2 + a
      assert.deepEqual(pn.coeffs, [0, 1, 2]);
      assert.strictEqual(pn.degree(), 2);
      pn = new Polynomial([0, 1, 2, 0, 0, 0]);  // 2a^2 + a
      assert.strictEqual(pn.degree(), 2);
      pn = new Polynomial([0, 0, 0, 0]);        // 0
      assert.deepEqual(pn.coeffs, [0]);
      assert.strictEqual(pn.degree(), 0);
      pn = new Polynomial([]);                  // 0
      assert.deepEqual(pn.coeffs, [0]);
      assert.strictEqual(pn.degree(), 0);
      pn = new Polynomial();                    // 0
      assert.deepEqual(pn.coeffs, [0]);
      assert.strictEqual(pn.degree(), 0);
  });
  it('tests polynomial addition works', () => {
    let pn1 = new Polynomial([0, 1, 2]);        // 2a^2 + a
    let pn2 = new Polynomial();                 // 0
    let sum = Polynomial.add(pn1, pn2);         // 2a^2 + a
    assert.deepEqual(sum.coeffs, [0, 1, 2]);
    assert.strictEqual(sum.degree(), 2);
    pn1 = new Polynomial([0, 1, 2]);            // 2a^2 + a
    pn2 = new Polynomial([3, 2, 1]);            // a^2 + 2a + 3
    sum = Polynomial.add(pn1, pn2);             // 3a^2 + 3a + 3
    assert.deepEqual(sum.coeffs, [3, 3, 3]);
    assert.strictEqual(sum.degree(), 2);
    pn1 = new Polynomial([0, 1, 2]);            // 2a^2 + a
    pn2 = new Polynomial([3, 0, 0, 0, 0]);      // 3
    sum = Polynomial.add(pn1, pn2);             // 2a^2 + a + 3
    assert.deepEqual(sum.coeffs, [3, 1, 2]);
    assert.strictEqual(sum.degree(), 2);
  });
  it('tests polynomial negation works', () => {
    const pn1 = new Polynomial([0, 1, 2]);      // 2a^2 + a
    const neg = Polynomial.negate(pn1);         // -2a^2 -a
    assert.deepEqual(neg.coeffs, [-0, -1, -2]);
    assert.strictEqual(neg.degree(), 2);
  });
  it('tests polynomial subtraction works', () => {
    const pn1 = new Polynomial([0, 1]);         // a
    const pn2 = new Polynomial([2, 2, 2]);      // 2a^2 + 2a + 2
    const sub = Polynomial.subtract(pn1, pn2);  // -2a^2 -a -2
    assert.deepEqual(sub.coeffs, [-2, -1, -2]);
    assert.strictEqual(sub.degree(), 2);
  });
  it('tests polynomial multiplication works', () => {
    let pn1 = new Polynomial([0, 1, 2]);        // 2a^2 + a
    let pn2 = new Polynomial();                 // 0
    let prod = Polynomial.multiply(pn1, pn2);   // 0
    assert.deepEqual(prod.coeffs, [0]);
    assert.strictEqual(prod.degree(), 0);
    pn1 = new Polynomial([9, 2]);               // 2a + 9
    pn2 = new Polynomial([3, -2]);              // -2a + 3
    prod = Polynomial.multiply(pn1, pn2);       // -4a^2 -12a + 27
    assert.deepEqual(prod.coeffs, [27, -12, -4]);
    assert.strictEqual(prod.degree(), 2);
    pn1 = new Polynomial([3, -2]);              // -2a + 3
    pn2 = new Polynomial([9, 2, 7, 11]);        // 11a^3 + 7a^2 + 2a + 9
    prod = Polynomial.multiply(pn1, pn2);       // -22a^4 + 19a^3 + 17a^2 - 12a + 27
    assert.deepEqual(prod.coeffs, [27, -12, 17, 19, -22]);
    assert.strictEqual(prod.degree(), 4);
  });
});

describe('Fractions', () => {
  it('tests fraction addition works', () => {
    let num1 = new Polynomial([9, 1, 1]);
    const den1 = new Polynomial([0, 2]);
    let frac1 = new Fraction(num1, den1);       // (a^2+a+9)/2a
    let num2 = new Polynomial([5, 1]);
    let den2 = new Polynomial([3]);
    let frac2 = new Fraction(num2, den2);       // (a+5)/3
    let sum = Fraction.add(frac1, frac2);       // (5a^2+13a+27)/6a
    assert.deepEqual(sum.num.coeffs, [27, 13, 5]);
    assert.deepEqual(sum.den.coeffs, [0, 6]);
    num1 = new Polynomial([0, 1]);
    frac1 = new Fraction(num1);                 // a/1
    num2 = new Polynomial([5]);
    den2 = new Polynomial([9]);
    frac2 = new Fraction(num2, den2);           // 0.55/1
    sum = Fraction.add(frac1, frac2);           // (a+0.55)/1
    assert.deepEqual(sum.num.coeffs, [5/9, 1]);
    assert.deepEqual(sum.den.coeffs, [1]);
  });
  it('tests fraction subtraction works', () => {
    const num1 = new Polynomial([9, 1, 1]);
    const den1 = new Polynomial([0, 2]);
    const frac1 = new Fraction(num1, den1);             // (a^2+a+9)/2a
    const num2 = new Polynomial([5, 1]);
    const den2 = new Polynomial([3]);
    const frac2 = new Fraction(num2, den2);            // (a+5)/3
    const sum = Fraction.subtract(frac1, frac2);       // (a^2-7a+27)/6a
    assert.deepEqual(sum.num.coeffs, [27, -7, 1]);
    assert.deepEqual(sum.den.coeffs, [0, 6]);
  });
  it('tests fraction negation works', () => {
    const num1 = new Polynomial([9, 1, 1]);
    const den1 = new Polynomial([0, 2]);
    const frac1 = new Fraction(num1, den1);   // (a^2+a+9)/2a
    const sum = Fraction.negate(frac1);       // (-a^2-a+-9)/2a
    assert.deepEqual(sum.num.coeffs, [-9, -1, -1]);
    assert.deepEqual(sum.den.coeffs, [0, 2]);
  });
  it('tests fraction multiplication works', () => {
    let num1 = new Polynomial([9, 1]);
    const den1 = new Polynomial([0, 2]);
    let frac1 = new Fraction(num1, den1);             // (a+9)/2a
    const num2 = new Polynomial([5, 1]);
    const den2 = new Polynomial([3]);
    let frac2 = new Fraction(num2, den2);            // (a+5)/3
    let sum = Fraction.multiply(frac1, frac2);       // (a^2+14a+45)/6a
    assert.deepEqual(sum.num.coeffs, [45, 14, 1]);
    assert.deepEqual(sum.den.coeffs, [0, 6]);
    num1 = new Polynomial([0, 1, 1]);
    frac1 = new Fraction(num1);                     // (a^2+a)/1
    frac2 = new Fraction();                         // 0 / 1
    sum = Fraction.multiply(frac1, frac2);          // 0/1
    assert.deepEqual(sum.num.coeffs, [0]);
    assert.deepEqual(sum.den.coeffs, [1]);
  });
  it('tests fraction division works', () => {
    const num1 = new Polynomial([9, 1]);
    const den1 = new Polynomial([0, 2]);
    const frac1 = new Fraction(num1, den1);            // (a+9)/2a
    const num2 = new Polynomial([5, 1]);
    const den2 = new Polynomial([3]);
    const frac2 = new Fraction(num2, den2);            // (a+5)/3
    const sum = Fraction.divide(frac1, frac2);         // (3a+9)/(2a^2+10a)
    assert.deepEqual(sum.num.coeffs, [27, 3]);
    assert.deepEqual(sum.den.coeffs, [0, 10, 2]);
  });
});
