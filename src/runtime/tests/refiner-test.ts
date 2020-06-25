/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Primitive, NumberRange, NumberSegment, Refinement, BinaryExpression, NumberMultinomial, NumberFraction, NumberTerm, BigIntTerm, BigIntRange, BigIntFraction, BigIntMultinomial, BigIntSegment} from '../refiner.js';
import {parse} from '../../gen/runtime/manifest-parser.js';
import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../manifest.js';
import {Entity, EntityClass} from '../entity.js';
import {Schema} from '../schema.js';
import {Flags} from '../flags.js';

describe('refiner', () => {
    it('Refines data given an expression 1', Flags.withFieldRefinementsAllowed(async () => {
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
    }));
    it('Refines data given an expression 2', () => {
      const manifestAst = parse(`
          particle Foo
              input: reads Something {num: Number } [(num/-3 < 0 and num*num == 36) or num == 0]
      `);
      const typeData = {'num': 'Number'};
      const ref = Refinement.fromAst(manifestAst[0].args[0].type.refinement, typeData);
      const data = {
          num: 6
      };
      const res = ref.validateData(data);
      assert.strictEqual(res, data.num === 0 || data.num === 6);
  });
    it('Throws error when field name not found 1', Flags.withFieldRefinementsAllowed(async () => {
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
    }));
    it('Throws error when field name not found 2', () => {
      assert.throws(() => {
          const manifestAst = parse(`
              particle Foo
                  input: reads Something {num: Number } [num < num2]
          `);
          const typeData = {'num': 'Number'};
          const ref = Refinement.fromAst(manifestAst[0].args[0].type.refinement, typeData);
          const data = {
              num: 6,
          };
          ref.validateData(data);
      }, `Unresolved field name 'num2' in the refinement expression.`);
  });
    it('Throws error when expression does not produce boolean result', Flags.withFieldRefinementsAllowed(async () => {
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
    }));
    it('Throws error when operators and operands are incompatible', Flags.withFieldRefinementsAllowed(async () => {
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
        }, `Refinement expression (num < 5) has type Boolean. Expected Number or BigInt.`);
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
        }, `Refinement expression name has type Text. Expected Number or BigInt.`);
    }));
    it('tests simple expression to range conversion', Flags.withFieldRefinementsAllowed(async () => {
        let manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [ (num < 3) ] }
        `);
        const typeData = {'num': 'Number'};
        let ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        let range = NumberRange.fromExpression(ref.expression);
        assert.deepEqual(range, new NumberRange([NumberSegment.openOpen(Number.NEGATIVE_INFINITY, 3)]));
        manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [(num > 10)] }
        `);
        ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        range = NumberRange.fromExpression(ref.expression);
        assert.deepEqual(range, new NumberRange([NumberSegment.openOpen(10, Number.POSITIVE_INFINITY)]));
        manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [not (num != 10)] }
        `);
        ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        range = NumberRange.fromExpression(ref.expression);
        console.log(JSON.stringify(range));
        assert.isTrue(range.equals(new NumberRange([NumberSegment.closedClosed(10, 10)])));
    }));
    it.only('tests simple expression to range conversion using bigint', Flags.withFieldRefinementsAllowed(async () => {
        let manifestAst = parse(`
            particle Foo
                input: reads Something {num: BigInt [ (num < 3) ] }
        `);
        const typeData = {'num': 'BigInt'};
        let ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        let range = BigIntRange.fromExpression(ref.expression);
        assert.isTrue(range.equals(new BigIntRange([BigIntSegment.openOpen(undefined, BigInt(3))])));
        manifestAst = parse(`
            particle Foo
                input: reads Something {num: BigInt [(num > 10)] }
        `);
        ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        range = BigIntRange.fromExpression(ref.expression);
        assert.isTrue(range.equals(new BigIntRange([BigIntSegment.openOpen(BigInt(10), undefined)])));
        manifestAst = parse(`
            particle Foo
                input: reads Something {num: BigInt [not (num != 10)] }
        `);
        ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        range = BigIntRange.fromExpression(ref.expression);
        assert.isTrue(range.equals(new BigIntRange([BigIntSegment.closedClosed(BigInt(10), BigInt(10))])));
    }));
    it('tests expression to range conversion', Flags.withFieldRefinementsAllowed(async () => {
        let manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [ ((num < 3) and (num > 0)) or (num == 5) ] }
        `);
        const typeData = {'num': 'Number'};
        let ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        let range = NumberRange.fromExpression(ref.expression);
        assert.isTrue(range.equals(new NumberRange([NumberSegment.openOpen(0, 3), NumberSegment.closedClosed(5, 5)])));
        manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [(num > 10) == (num >= 20)] }
        `);
        ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        range = NumberRange.fromExpression(ref.expression);
        assert.isTrue(range.equals(new NumberRange([NumberSegment.openClosed(Number.NEGATIVE_INFINITY, 10), NumberSegment.closedOpen(20, Number.POSITIVE_INFINITY)])));
        manifestAst = parse(`
            particle Foo
                input: reads Something {num: Number [not (num != 10)] }
        `);
        ref = Refinement.fromAst(manifestAst[0].args[0].type.fields[0].type.refinement, typeData);
        range = NumberRange.fromExpression(ref.expression);
        assert.isTrue(range.equals(new NumberRange([NumberSegment.closedClosed(10, 10)])));

    }));
    it('regression test for parse failure on operator ordering', () => {
      parse(`
      particle Foo
          input: reads Something {num: Number } [num <= 20]
      `);
  });
});

describe('refiner enforcement', () => {
    let schema: Schema;
    let entityClass: EntityClass;
    let exceptions: Error[] = [];
    before(Flags.withFieldRefinementsAllowed(async () => {
      exceptions = [];
      const manifest = await Manifest.parse(`
        schema Foo
          txt: Text
          num: Number [num < 10]
          flg: Boolean
      `);
      schema = manifest.schemas.Foo;
      const reportExceptionInHost = (error) => {exceptions.push(error);};
      // tslint:disable-next-line: no-any
      entityClass = Entity.createEntityClass(schema, {reportExceptionInHost} as any);
    }));
    it('data does not conform to the refinement', Flags.whileEnforcingRefinements(async () => {
      const _ = new entityClass({txt: 'abc', num: 56});
      assert.lengthOf(exceptions, 1);
      exceptions.map(except => {
         assert.deepEqual(except.message, `AuditException: exception Error raised when invoking function Refinement:refineData on particle undefined: Entity schema field 'num' does not conform to the refinement [(num < 10)]`);
      });
    }));
    it('data does conform to the refinement', Flags.whileEnforcingRefinements(async () => {
        assert.doesNotThrow(() => { const _ = new entityClass({txt: 'abc', num: 8}); });
      }));
});

describe('dynamic refinements', () => {
    describe('Parses and type checks a particle with dynamic refinements', Flags.withFieldRefinementsAllowed(async () => {
        let ref: Refinement;
        before(Flags.withFieldRefinementsAllowed(async () => {
          const manifestAst = parse(`
            particle AddressBook
              contacts: reads [Contact {name: Text [ name == ? ] }]
          `);
          const typeData = {'name': 'Text'};
          const contacts = manifestAst[0].args[0];
          const nameType = contacts.type.type.fields[0].type;
          ref = Refinement.fromAst(nameType.refinement, typeData);
        }));
        it('field names, query argument names and query argument types', () => {
          assert.deepEqual(JSON.stringify([...ref.expression.getFieldParams()]), '[["name","Text"]]', 'should infer indexes from refinement');
          assert.deepEqual(JSON.stringify([...ref.expression.getQueryParams()]), '[["?","Text"]]', 'should infer query args from refinement');
          assert.strictEqual(ref.toString(), '[(name == ?)]');
        });
        it('the algorithm discovers the type', () => {
          const dyn = (ref.expression as BinaryExpression).rightExpr;
          assert.equal(dyn.evalType, 'Text');
        });
        it('without the query param', () => {
          const data = {
              name: 'Ghost Busters'
          };
          assert.isTrue(ref.validateData(data), 'Data is valid');
        });
        it('with the query param', () => {
          const dataWithQuery = {
              name: 'Ghost Busters',
              '?': 'Not Ghost Busters',
          };
          assert.isFalse(ref.validateData(dataWithQuery), 'Data is not valid');
        });
    }));
    describe('Parses and type checks a particle with dynamic and static refinements', () => {
        let ref: Refinement;
        before(Flags.withFieldRefinementsAllowed(async () => {
          const manifestAst = parse(`
            particle AddressBook
              contacts: reads [Contact {name: Text, age: Number } [ name == ?  and age > 10]]
          `);
          const typeData = {'name': 'Text', 'age': 'Number'};
          const contacts = manifestAst[0].args[0];
          ref = Refinement.fromAst(contacts.type.type.refinement, typeData);
        }));
        it('field names, query argument names and query argument types', () => {
          assert.deepEqual(JSON.stringify([...ref.expression.getFieldParams()]), '[["name","Text"],["age","Number"]]', 'should infer indexes from refinement');
          assert.deepEqual(JSON.stringify([...ref.expression.getQueryParams()]), '[["?","Text"]]', 'should infer query args from refinement');
          assert.strictEqual(ref.toString(), '[((name == ?) and (age > 10))]');
        });
        it('the algorithm discovers the type', () => {
          const dyn = ((ref.expression as BinaryExpression).leftExpr as BinaryExpression).rightExpr;
          assert.equal(dyn.evalType, 'Text');
        });
        it('without the query param and a valid age', () => {
          const data = {
              name: 'Ghost Busters',
              age: 20,
          };
          assert.isTrue(ref.validateData(data), 'Data is valid');
        });
        it('with the query param and a valid age', () => {
          const data = {
              name: 'Ghost Busters',
              '?': 'Not Ghost Busters',
              age: 20,
          };
          assert.isFalse(ref.validateData(data), 'Data is not valid');
        });
        it('without the query param and an invalid age', () => {
          const data = {
              name: 'Ghost Busters',
              age: 2,
          };
          assert.isFalse(ref.validateData(data), 'Data is not valid');
        });
        it('with the query param and an invalid age', () => {
          const data = {
              name: 'Ghost Busters',
              '?': 'Not Ghost Busters',
              age: 2,
          };
          assert.isFalse(ref.validateData(data), 'Data is not valid');
        });
    });
});

describe('normalisation', () => {
    it('tests if field name is rearranged to left in a binary node', Flags.withFieldRefinementsAllowed(async () => {
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
    }));
    it('tests if primitive boolean expressions are automatically evaluated', Flags.withFieldRefinementsAllowed(async () => {
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
    }));
    it('tests if primitive math expressions are automatically evaluated', Flags.withFieldRefinementsAllowed(async () => {
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
    }));
    it(`tests if multiple 'not's are cancelled. `, Flags.withFieldRefinementsAllowed(async () => {
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
    }));
    it(`tests if expressions are rearranged 1`, Flags.withFieldRefinementsAllowed(async () => {
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
  }));
  it(`tests if expressions are rearranged 2`, Flags.withFieldRefinementsAllowed(async () => {
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
  }));
  it(`tests if expressions are rearranged 3`, Flags.withFieldRefinementsAllowed(async () => {
    const manifestAst1 = parse(`
        particle Foo
            input: reads Something {num: Number [ (num+2)*(num+1)+3 > 6 ] }
    `);
    const typeData = {'num': 'Number'};
    const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.fields[0].type.refinement, typeData);
    ref1.normalize();
    const manifestAst2 = parse(`
        particle Foo
            input: reads Something {num: Number [ num*3 + num*num > 1 ] }
    `);
    const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.fields[0].type.refinement, typeData);
    // normalized version of ref1 should be the same as ref2
    assert.strictEqual(JSON.stringify(ref1), JSON.stringify(ref2));
  }));
  it(`tests if expressions are rearranged 4`, Flags.withFieldRefinementsAllowed(async () => {
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
  }));
  it(`tests if expressions are rearranged 5`, () => {
    const manifestAst1 = parse(`
        particle Foo
            input: reads Something {a: Number, b: Number } [3*(a+b) > a+2*b]
    `);
    const typeData = {'a': 'Number', 'b': 'Number'};
    const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.refinement, typeData);
    ref1.normalize();
    const manifestAst2 = parse(`
        particle Foo
            input: reads Something {a: Number, b: Number } [b + a*2 > 0]
    `);
    const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.refinement, typeData);
    // normalized version of ref1 should be the same as ref2
    assert.strictEqual(JSON.stringify(ref1), JSON.stringify(ref2));
  });
  it(`tests if expressions are rearranged 6`, () => {
    const manifestAst1 = parse(`
        particle Foo
            input: reads Something {a: Number, b: Number } [2*(a+b) > a+2*b]
    `);
    const typeData = {'a': 'Number', 'b': 'Number'};
    const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.refinement, typeData);
    ref1.normalize();
    const manifestAst2 = parse(`
        particle Foo
            input: reads Something {a: Number, b: Number } [a > 0]
    `);
    const ref2 = Refinement.fromAst(manifestAst2[0].args[0].type.refinement, typeData);
    // normalized version of ref1 should be the same as ref2
    assert.strictEqual(JSON.stringify(ref1), JSON.stringify(ref2));
  });

  const evaluatesToTrue = (expr: string, data: object = {}) => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number} [ ${expr} ]
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.refinement, typeData);
      // normalized version of ref1 should be the same as ref2
      assert.isTrue(ref1.validateData(data), `expected expression (${expr}) to evaluate to true`);
  };
  const triviallyTrue = (expr: string) => {
      const manifestAst1 = parse(`
          particle Foo
              input: reads Something {num: Number} [ ${expr} ]
      `);
      const typeData = {'num': 'Number'};
      const ref1 = Refinement.fromAst(manifestAst1[0].args[0].type.refinement, typeData);
      ref1.normalize();
      // normalized version of ref1 should be the same as ref2
      assert.isTrue(ref1.expression.kind === 'BooleanPrimitiveNode');
      assert.isTrue(ref1.expression['value'], `expected expression (${expr}) to be trivially true`);
  };
  describe('Correctly handles date time units', () => {
    it('control (ensure that the test approach works)', async () => {
      triviallyTrue('1 == 1');
      triviallyTrue('1 != 2');
    });
    it('uses millseconds by default', async () => {
      triviallyTrue('1 == 1 milliseconds');
    });
    it('seconds to milliseconds', async () => {
      triviallyTrue('1000 == 1 seconds');
      triviallyTrue('2000 == 2 seconds');
    });
    it('minutes to seconds', async () => {
      triviallyTrue('1 minutes == 60 seconds');
      triviallyTrue('2 minutes == 120000 milliseconds');
    });
    it('hours to minutes', async () => {
      triviallyTrue('1 hours == 60 minutes');
      triviallyTrue('2 hours == 7200 seconds');
    });
    it('days to hours', async () => {
      triviallyTrue('1 days == 24 hours');
      triviallyTrue('2 days == 2880 minutes');
    });
    it('handles singular and plural forms', async () => {
      triviallyTrue('2 * 1 day == 2 days');
      triviallyTrue('1 day == 24 hours');
      triviallyTrue('1 day != 24 hours + 1 second');
    });
  });
  describe('Correctly handles date time using now()', () => {
    it('now() is after time of writing', async () => {
      // Checks that 'now' is after 04/22/2020 @ 7:19am (UTC).
      evaluatesToTrue('now() > 1587539956');
      evaluatesToTrue('not (now() < 1587539956)');
    });
  });
});

describe('NumberRange', () => {
    it('tests union operations on a range', () => {
        const range1 = new NumberRange();
        // range1 = [];
        range1.unionWithSeg(NumberSegment.closedClosed(0, 10));
        // range1 = [0, 10];
        assert.isTrue(range1.equals(new NumberRange([NumberSegment.closedClosed(0, 10)])));
        range1.unionWithSeg(NumberSegment.openClosed(20, 30));
        // range1 = [0, 10] U (20,30];
        assert.isTrue(range1.equals(new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.openClosed(20, 30)])));
        range1.unionWithSeg(NumberSegment.closedOpen(5, 15));
        // range1 = [0, 15) U (20,30];
        assert.isTrue(range1.equals(new NumberRange([NumberSegment.closedOpen(0, 15), NumberSegment.openClosed(20, 30)])));
        const range2 = new NumberRange([NumberSegment.closedClosed(-1, -1), NumberSegment.closedClosed(5, 7), NumberSegment.openClosed(15, 19)]);
        // range2 = [-1, -1] U [5, 7] U (15,19];
        range1.union(range2);
        // range1 = [-1, -1] U [0, 15) U (15, 19] U (20, 30]
        assert.isTrue(range1.equals(new NumberRange([NumberSegment.closedClosed(-1, -1), NumberSegment.closedOpen(0, 15), NumberSegment.openClosed(15, 19), NumberSegment.openClosed(20, 30)])));
    });
    it('tests intersection operations on a range', () => {
        const range1 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
        // range1 = [0, 10] U [20,30];
        range1.intersectWithSeg(NumberSegment.openOpen(5, 25));
        // range1 = (5, 10] U [20, 25);
        assert.isTrue(range1.equals(new NumberRange([NumberSegment.openClosed(5, 10), NumberSegment.closedOpen(20, 25)])));
        range1.intersectWithSeg(NumberSegment.closedOpen(5, 15));
        // range1 = (5, 10];
        assert.isTrue(range1.equals(new NumberRange([NumberSegment.openClosed(5, 10)])));
        const range2 = new NumberRange([NumberSegment.closedClosed(-1, -1), NumberSegment.closedOpen(4, 10), NumberSegment.closedClosed(13, 19)]);
        // range2 = [-1, -1] U [4, 10) U [13,19];
        range1.intersect(range2);
        // range1 = (5, 10);
        assert.isTrue(range1.equals(new NumberRange([NumberSegment.openOpen(5, 10)])));
    });
    it('tests if a range is a subset of another', () => {
        let range1 = NumberRange.universal(Primitive.NUMBER);
        // range1 = (-inf, +inf)
        const range2 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
        // range2 = [0, 10] U [20,30];
        assert.isTrue(range2.isSubsetOf(range1));
        range1 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
        // range1 = [0, 10] U [20,30];
        assert.isTrue(range2.isSubsetOf(range1));
        range1 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(22, 30)]);
        // range1 = [0, 10] U [22,30];
        assert.isFalse(range2.isSubsetOf(range1));
        range1 = new NumberRange();
        // range1 = [];
        assert.isTrue(range1.isSubsetOf(range2));
        range1 = new NumberRange([NumberSegment.closedOpen(0, 10), NumberSegment.closedClosed(20, 30)]);
        // range1 = [0, 10) U [20,30];
        assert.isTrue(range1.isSubsetOf(range2));
    });
    it('tests the difference of ranges', () => {
        let range1 = NumberRange.universal(Primitive.NUMBER);
        // range1 = (-inf, +inf)
        let range2 = new NumberRange();
        range2 = new NumberRange([NumberSegment.closedClosed(0, 10), NumberSegment.closedClosed(20, 30)]);
        // range2 = [0, 10] U [20,30];
        let diff = NumberRange.difference(range1, range2);
        // diff = (-inf, 0) U (10,20) U (30, inf)
        assert.isTrue(diff.equals(new NumberRange([NumberSegment.openOpen(Number.NEGATIVE_INFINITY, 0), NumberSegment.openOpen(10, 20), NumberSegment.openOpen(30, Number.POSITIVE_INFINITY)])));
        range1 = new NumberRange([NumberSegment.closedOpen(0, 20), NumberSegment.openClosed(40, 50)]);
        // range1 = [0,20) U (40, 50]
        range2 = new NumberRange([NumberSegment.openOpen(0, 5), NumberSegment.closedOpen(7, 12), NumberSegment.closedClosed(15, 43), NumberSegment.openClosed(45, 50)]);
        // range2 = (0,5) U [7,12) U [15, 43] U (45, 50]
        diff = NumberRange.difference(range1, range2);
        // diff = [0, 0] U [5,7) U [12,15) U (43, 45]
        assert.isTrue(diff.equals(new NumberRange([NumberSegment.closedClosed(0, 0), NumberSegment.closedOpen(5, 7), NumberSegment.closedOpen(12, 15), NumberSegment.openClosed(43, 45)])));
    });
    it('tests the complement of ranges', () => {
      let range = new NumberRange([NumberSegment.closedClosed(0, 10)]);
      // range =  [0,10]
      let complement = NumberRange.complementOf(range);
      // complement = (-inf, 0) U (10, inf)
      assert.isTrue(complement.equals(new NumberRange([NumberSegment.openOpen(Number.NEGATIVE_INFINITY, 0), NumberSegment.openOpen(10, Number.POSITIVE_INFINITY)])));
      range = NumberRange.unit(0, Primitive.BOOLEAN);
      // range = [0,0]
      complement = NumberRange.complementOf(range);
      // complement = [1,1]
      assert.isTrue(complement.equals(NumberRange.unit(1, Primitive.BOOLEAN)));
    });
});

describe('NumberFractions', () => {
  it('tests fraction addition works', () => {
    const a = new Term({'a': 1});         // a
    const a2 = new Term({'a': 2});        // a^2
    const cnst = new Term({});
    let num1 = new NumberMultinomial({
        [a2.toKey()]: 1,                  // a^2
        [a.toKey()]: 1,                   // a
        [cnst.toKey()]: 9                 // 9
    }); // a^2 + a + 9
    const den1 = new NumberMultinomial({
      [a.toKey()]: 2,                     // 2a
    }); // 2a
    let frac1 = new NumberFraction(num1, den1); // (a^2+a+9)/2a
    let num2 = new NumberMultinomial({
      [a.toKey()]: 1,                     // a
      [cnst.toKey()]: 5                   // 5
    }); // a+5
    let den2 = new NumberMultinomial({
      [cnst.toKey()]: 3                   // 3
    }); // 3
    let frac2 = new NumberFraction(num2, den2); // (a+5)/3
    let sum = NumberFraction.add(frac1, frac2); // (5a^2+13a+27)/6a
    assert.deepEqual(sum.num.terms, {
      [a2.toKey()]: 5,                    // a^2
      [a.toKey()]: 13,                    // a
      [cnst.toKey()]: 27                  // 9
    });
    assert.deepEqual(sum.den.terms, {
      [a.toKey()]: 6                      // a
    });
    num1 = new NumberMultinomial({
      [a.toKey()]: 1,                     // a
    }); // a
    frac1 = new NumberFraction(num1);           // a/1
    num2 = new NumberMultinomial({
      [cnst.toKey()]: 5                   // 5
    }); // 5
    den2 = new NumberMultinomial({
      [cnst.toKey()]: 9                   // 9
    }); // 9
    frac2 = new NumberFraction(num2, den2);     // 5/9
    sum = NumberFraction.add(frac1, frac2);     // (9a+5)/9
    assert.deepEqual(sum.num.terms, {
      [a.toKey()]: 9,                     // 9a
      [cnst.toKey()]: 5                   // 5
    });
    assert.deepEqual(sum.den.terms, {
      [cnst.toKey()]: 9                   // 9
    });
  });
  it('tests fraction subtraction works', () => {
    const a = new Term({'a': 1});                 // a
    const a2 = new Term({'a': 2});                // a^2
    const cnst = new Term({});
    const num1 = new NumberMultinomial({
        [a2.toKey()]: 1,                          // a^2
        [a.toKey()]: 1,                           // a
        [cnst.toKey()]: 9                         // 9
    }); // a^2 + a + 9
    const den1 = new NumberMultinomial({
      [a.toKey()]: 2,                             // 2a
    }); // 2a
    const frac1 = new NumberFraction(num1, den1);       // (a^2+a+9)/2a
    const num2 = new NumberMultinomial({
      [a.toKey()]: 1,                             // a
      [cnst.toKey()]: 5                           // 5
    }); // a+5
    const den2 = new NumberMultinomial({
      [cnst.toKey()]: 3                           // 3
    }); // 3
    const frac2 = new NumberFraction(num2, den2);       // (a+5)/3
    const sum = NumberFraction.subtract(frac1, frac2);  // (a^2-7a+27)/6a
    assert.deepEqual(sum.num.terms, {
      [a2.toKey()]: 1,                            // a^2
      [a.toKey()]: -7,                            // -7a
      [cnst.toKey()]: 27                          // 27
    });
    assert.deepEqual(sum.den.terms, {
      [a.toKey()]: 6,                             // 6a
    });
  });
  it('tests fraction negation works', () => {
    const a = new Term({'a': 1});                 // a
    const a2 = new Term({'a': 2});                // a^2
    const cnst = new Term({});
    const num1 = new NumberMultinomial({
        [a2.toKey()]: 1,                          // a^2
        [a.toKey()]: 1,                           // a
        [cnst.toKey()]: 9                         // 9
    }); // a^2 + a + 9
    const den1 = new NumberMultinomial({
      [a.toKey()]: 2,                             // 2a
    }); // 2a
    const frac1 = new NumberFraction(num1, den1);       // (a^2+a+9)/2a
    const neg = NumberFraction.negate(frac1);           // (-a^2-a+-9)/2a
    assert.deepEqual(neg.num.terms, {
        [a2.toKey()]: -1,                         // a^2
        [a.toKey()]: -1,                          // a
        [cnst.toKey()]: -9                        // 9
    });
    assert.deepEqual(neg.den.terms, {
      [a.toKey()]: 2,  // 2a
    });
  });
  it('tests fraction multiplication works', () => {
    const a = new Term({'a': 1});                 // a
    const a2 = new Term({'a': 2});                // a^2
    const cnst = new Term({});
    let num1 = new NumberMultinomial({
        [a.toKey()]: 1,                           // a
        [cnst.toKey()]: 9                         // 9
    }); // a + 9
    const den1 = new NumberMultinomial({
      [a.toKey()]: 2,                             // 2a
    }); // 2a
    let frac1 = new NumberFraction(num1, den1);         // (a+9)/2a
    const num2 = new NumberMultinomial({
      [a.toKey()]: 1,                             // a
      [cnst.toKey()]: 5                           // 5
    }); // a + 5
    const den2 = new NumberMultinomial({
      [cnst.toKey()]: 3                           // 9
    }); // a + 9
    let frac2 = new NumberFraction(num2, den2);         // (a+5)/3
    let sum = NumberFraction.multiply(frac1, frac2);    // (a^2+14a+45)/6a
    assert.deepEqual(sum.num.terms, {
      [a2.toKey()]: 1,                            // a^2
      [a.toKey()]: 14,                            // 14a
      [cnst.toKey()]: 45                          // 45
    }); // a^2 + 14a + 45
    assert.deepEqual(sum.den.terms, {
      [a.toKey()]: 6,                             // 14a
    });
    num1 = new NumberMultinomial({
      [a2.toKey()]: 1,                            // a^2
      [a.toKey()]: 1,                             // a
    });
    frac1 = new NumberFraction(num1);                   // (a^2+a)/1
    frac2 = new NumberFraction();                       // 0 / 1
    sum = NumberFraction.multiply(frac1, frac2);        // 0/1
    assert.deepEqual(sum.num.terms, {});
    assert.deepEqual(sum.den.terms, {
      [cnst.toKey()]: 1                           // 1
    });
  });
  it('tests fraction division works', () => {
    const a = new Term({'a': 1});                 // a
    const a2 = new Term({'a': 2});                // a^2
    const cnst = new Term({});
    const num1 = new NumberMultinomial({
        [a.toKey()]: 1,                           // a
        [cnst.toKey()]: 9                         // 9
    }); // a + 9
    const den1 = new NumberMultinomial({
      [a.toKey()]: 2,                             // 2a
    }); // 2a
    const frac1 = new NumberFraction(num1, den1);       // (a+9)/2a
    const num2 = new NumberMultinomial({
      [a.toKey()]: 1,                             // a
      [cnst.toKey()]: 5                           // 5
    }); // a + 5
    const den2 = new NumberMultinomial({
      [cnst.toKey()]: 3                           // 9
    }); // a + 9
    const frac2 = new NumberFraction(num2, den2);       // (a+5)/3
    const sum = NumberFraction.divide(frac1, frac2);    // (3a+27)/(2a^2+10a)
    assert.deepEqual(sum.num.terms, {
      [a.toKey()]: 3,                             // 3a
      [cnst.toKey()]: 27                          // 27
    });
    assert.deepEqual(sum.den.terms, {
      [a2.toKey()]: 2,                            // 2a^2
      [a.toKey()]: 10,                            // 10a
    });
  });
});

describe('Terms', () => {
  it('tests to and from key', () => {
    const term1 = new Term({'b': 1, 'a': 1});
    const term2 = new Term({'a': 1, 'b': 1});
    assert.strictEqual(term1.toKey(), term2.toKey());
    assert.deepEqual(Term.fromKey(term1.toKey()), Term.fromKey(term2.toKey()));
  });
});

describe('NumberMultinomials', () => {
  it('tests multinomial setters and getters work', () => {
    const aIb = new Term({'b': 1, 'a': 1});  // ab
    const aIb2 = new Term({'b': 2, 'a': 1}); // ab^2
    const cnst = new Term({});
    const num = new NumberMultinomial({
        [aIb.toKey()]: 2,   // 2ab
        [aIb2.toKey()]: 1,  // ab^2
        [cnst.toKey()]: 5   // 5
    }); // 2ab + ab^2 + 5
    assert.deepEqual(num.terms, {
        [aIb2.toKey()]: 1,  // ab^2
        [cnst.toKey()]: 5,  // 5
        [aIb.toKey()]: 2,   // 2ab
    });
  });
  it('tests multinomial addition works', () => {
    const aIb = new Term({'b': 1, 'a': 1}); // ab
    const aIb2 = new Term({'b': 2, 'a': 1}); // ab^2
    const cnst = new Term({});
    const num1 = new NumberMultinomial({
        [aIb2.toKey()]: 2,  // 2ab^2
        [cnst.toKey()]: 1   // 5
    }); // 2ab^2 + 1
    const num2 = new NumberMultinomial({
      [aIb.toKey()]: 2,   // 2ab
      [aIb2.toKey()]: 1,  // ab^2
      [cnst.toKey()]: 5   // 5
    }); // 2ab + ab^2 + 5
    const sum = NumberMultinomial.add(num1, num2);      // 2ab + 3ab^2 + 5
    assert.deepEqual(sum.terms, {
      [aIb.toKey()]: 2,   // 2ab
      [aIb2.toKey()]: 3,  // 3ab^2
      [cnst.toKey()]: 6   // 6
    });
  });
  it('tests multinomial negation works', () => {
    const aIb2 = new Term({'b': 2, 'a': 1}); // ab^2
    const cnst = new Term({});
    const num1 = new NumberMultinomial({
        [aIb2.toKey()]: 2,  // 2ab^2
        [cnst.toKey()]: 1   // 5
    }); // 2ab^2 + 1
    const sum = NumberMultinomial.negate(num1);      // -2ab^2 - 1
    assert.deepEqual(sum.terms, {
      [aIb2.toKey()]: -2,  // -2ab^2
      [cnst.toKey()]: -1   // -1
    });
  });
  it('tests multinomial subtraction works', () => {
    const aIb = new Term({'b': 1, 'a': 1}); // ab
    const aIb2 = new Term({'b': 2, 'a': 1}); // ab^2
    const cnst = new Term({});
    const num1 = new NumberMultinomial({
        [aIb2.toKey()]: 2,  // 2ab^2
        [cnst.toKey()]: 1   // 5
    }); // 2ab^2 + 1
    const num2 = new NumberMultinomial({
      [aIb.toKey()]: 2,   // 2ab
      [aIb2.toKey()]: 2,  // 2ab^2
      [cnst.toKey()]: 5   // 5
    }); // 2ab + ab^2 + 5
    const sum = NumberMultinomial.subtract(num1, num2);      // -2ab - 4
    assert.deepEqual(sum.terms, {
      [aIb.toKey()]: -2,   // 2ab
      [cnst.toKey()]: -4   // -4
    });
  });
  it('tests multinomial multiplication works', () => {
    const aIb = new Term({'b': 1, 'a': 1}); // ab
    const aIb2 = new Term({'b': 2, 'a': 1}); // ab^2
    const cnst = new Term({});
    const a2Ib3 = new Term({'a': 2, 'b': 3});
    const a2Ib4 = new Term({'a': 2, 'b': 4});
    const num1 = new NumberMultinomial({
        [aIb2.toKey()]: 2,  // 2ab^2
        [cnst.toKey()]: 1   // 1
    }); // 2ab^2 + 1
    const num2 = new NumberMultinomial({
      [aIb.toKey()]: 2,   // 2ab
      [aIb2.toKey()]: 1,  // ab^2
      [cnst.toKey()]: 5   // 5
    }); // 2ab + ab^2 + 5
    const sum = NumberMultinomial.multiply(num1, num2);      // 4a^2b^3 + 2a^2b^4 + 11ab^2 + 2ab + 5
    assert.deepEqual(sum.terms, {
      [aIb.toKey()]: 2,     // 2ab
      [aIb2.toKey()]: 11,   // 11ab^2
      [cnst.toKey()]: 5,    // 5
      [a2Ib3.toKey()]: 4,   // 4a^2b^3
      [a2Ib4.toKey()]: 2,   // 2a^2b^4
    });
  });
});


