/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
import {assert} from '../../platform/chai-web.js';
import {Manifest} from '../../runtime/manifest.js';
import {Dictionary} from '../../runtime/hot.js';
import {SchemaGraph} from '../schema2graph.js';

interface NodeInfo {
  name: string;      // generated class name
  parents: string;   // parent class names, sorted and stringified
  children: string;  // child class names, sorted and stringified
}

function convert(graph: SchemaGraph) {
  const nodes: NodeInfo[] = [];
  const aliases: Dictionary<string[]> = {};
  for (const node of graph.walk()) {
    nodes.push({
      name: node.name,
      parents: node.parents.map(p => p.name).sort().join(', '),
      children: node.children.map(p => p.name).sort().join(', '),
    });
    if (node.aliases.length) {
      aliases[node.name] = [...node.aliases].sort();
    }
  }
  return {nodes, aliases};
}

describe('schema2graph', () => {
  it('empty graph', async () => {
    const manifest = await Manifest.parse(`
      particle E
        root: consumes Slot
          tile: provides Slot
    `);
    const graph = new SchemaGraph(manifest.particles[0]);
    assert.isEmpty([...graph.walk()]);
  });

  it('linear graph', async () => {
    const manifest = await Manifest.parse(`
      particle L
        h1: reads * {a: Text}                     // 1 -> 2 -> 3
        h2: reads * {a: Text, b: Text}
        h3: reads * {a: Text, b: Text, c: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'L_H1', parents: '',     children: 'L_H2'},
      {name: 'L_H2', parents: 'L_H1', children: 'L_H3'},
      {name: 'L_H3', parents: 'L_H2', children: ''},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('diamond graph', async () => {
    const manifest = await Manifest.parse(`
      particle D
        h1: reads * {a: Text}                       //   1
        h2: reads * {a: Text, b: Text}              //  2 3
        h3: reads * {a: Text, c: Text}              //   4
        h4: reads * {a: Text, b: Text, c: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'D_H1', parents: '',           children: 'D_H2, D_H3'},
      {name: 'D_H2', parents: 'D_H1',       children: 'D_H4'},
      {name: 'D_H3', parents: 'D_H1',       children: 'D_H4'},
      {name: 'D_H4', parents: 'D_H2, D_H3', children: ''},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('aliased schemas', async () => {
    const manifest = await Manifest.parse(`
      particle A
        h1: reads * {a: Text}                       //   1
        h2: reads * {a: Text, b: Text}              //  2 3
        h3: reads * {a: Text, c: Text}              //   4
        h4: reads * {a: Text, b: Text, c: Text}
        d2: reads * {a: Text, b: Text}
        d4: reads * {a: Text, b: Text, c: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'A_H1',       parents: '',                 children: 'AInternal1, A_H3'},
      {name: 'AInternal1', parents: 'A_H1',             children: 'AInternal2'},
      {name: 'A_H3',       parents: 'A_H1',             children: 'AInternal2'},
      {name: 'AInternal2', parents: 'AInternal1, A_H3', children: ''},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'AInternal1': ['A_D2', 'A_H2'],
      'AInternal2': ['A_D4', 'A_H4'],
    });
  });

  it('pyramid and vee as separate graphs', async () => {
    const manifest = await Manifest.parse(`
      particle S
        p0: reads * {a: Text}                       //    0
        p1: reads * {a: Text, b: Text}              //   1 2
        p2: reads * {a: Text, c: Text}              //  3   4
        p3: reads * {a: Text, b: Text, d: Text}
        p4: reads * {a: Text, c: Text, e: Text}
        v5: reads * {a: URL}                        //  5   6
        v6: reads * {c: URL}                        //   7 8
        v7: reads * {a: URL, b: URL}                //    9
        v8: reads * {c: URL, d: URL}
        v9: reads * {a: URL, b: URL, c: URL, d: URL}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));

    // Traversal is breadth-first; nodes within a row are in the same order as in the manifest.
    assert.deepStrictEqual(res.nodes, [
      {name: 'S_P0', parents: '',           children: 'S_P1, S_P2'},
      {name: 'S_V5', parents: '',           children: 'S_V7'},
      {name: 'S_V6', parents: '',           children: 'S_V8'},
      {name: 'S_P1', parents: 'S_P0',       children: 'S_P3'},
      {name: 'S_P2', parents: 'S_P0',       children: 'S_P4'},
      {name: 'S_V7', parents: 'S_V5',       children: 'S_V9'},
      {name: 'S_V8', parents: 'S_V6',       children: 'S_V9'},
      {name: 'S_P3', parents: 'S_P1',       children: ''},
      {name: 'S_P4', parents: 'S_P2',       children: ''},
      {name: 'S_V9', parents: 'S_V7, S_V8', children: ''},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('mesh graph', async () => {
    //    1:a  2:b
    //    |  \/  |
    //    |  /\  |
    //  3:abc  4:abd
    //      \  /
    //    5:abcde
    const manifest = await Manifest.parse(`
      particle M
        h1: reads * {a: Text}
        h2: reads * {b: Text}
        h3: reads * {a: Text, b: Text, c: Text}
        h4: reads * {a: Text, b: Text, d: Text}
        h5: reads * {a: Text, b: Text, c: Text, d: Text, e: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'M_H1', parents: '',           children: 'M_H3, M_H4'},
      {name: 'M_H2', parents: '',           children: 'M_H3, M_H4'},
      {name: 'M_H3', parents: 'M_H1, M_H2', children: 'M_H5'},
      {name: 'M_H4', parents: 'M_H1, M_H2', children: 'M_H5'},
      {name: 'M_H5', parents: 'M_H3, M_H4', children: ''},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('jump graph', async () => {
    // Check that a descendant connection that jumps past multiple levels of the
    // graph doesn't cause incorrect ordering.
    //
    //  1:a   2:x
    //   |     |
    //  3:ab   |
    //   |     |
    //  4:abc  |
    //     \   |
    //     5:abcx
    const manifest = await Manifest.parse(`
      particle J
        h1: reads * {a: Text}
        h2: reads * {x: Text}
        h3: reads * {a: Text, b: Text}
        h4: reads * {a: Text, b: Text, c: Text}
        h5: reads * {a: Text, b: Text, c: Text, x: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'J_H1', parents: '',           children: 'J_H3'},
      {name: 'J_H2', parents: '',           children: 'J_H5'},
      {name: 'J_H3', parents: 'J_H1',       children: 'J_H4'},
      {name: 'J_H4', parents: 'J_H3',       children: 'J_H5'},
      {name: 'J_H5', parents: 'J_H2, J_H4', children: ''},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('unconnected graph with aliased schema', async () => {
    // Use more realistic field names and connection types, and check that schema names are
    // ignored outside of the more-specific-than comparison.
    const manifest = await Manifest.parse(`
      particle Test
        name: reads Widget {t: Text}
        age: writes Data {n: Number}
        moniker: reads [Thing Product {z: Text}]
        oldness: reads writes [Data {n: Number}]
        mainAddress: writes &* {u: URL}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'Test_Name',        parents: '', children: ''},
      {name: 'TestInternal1',    parents: '', children: ''},
      {name: 'Test_Moniker',     parents: '', children: ''},
      {name: 'Test_MainAddress', parents: '', children: ''},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'TestInternal1': ['Test_Age', 'Test_Oldness']
    });
  });

  it('collections and handle-level references do not affect the graph', async () => {
    const manifest = await Manifest.parse(`
      particle W
        h1: reads &* {a: Text}
        h2: reads [* {a: Text, b: Text}]
        h3: reads [&* {a: Text, b: Text, c: Text}]
        h4: reads * {a: Text, b: Text, r: [&* {d: Text}]}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'W_H1',   parents: '',     children: 'W_H2'},
      {name: 'W_H4_R', parents: '',     children: ''},
      {name: 'W_H2',   parents: 'W_H1', children: 'W_H3, W_H4'},
      {name: 'W_H3',   parents: 'W_H2', children: ''},
      {name: 'W_H4',   parents: 'W_H2', children: ''},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('complex graph', async () => {
    // Handles are declared in a different order from their graph "position" but
    // named using their numeric order in which their classes are generated.
    //
    //          1:a
    //           |
    //          3:ab      2:d
    //         /    \     / \
    //       6:abc   5:abd   4:dx
    //       /   \    /
    //  8:abcy   7:abcd
    //              |
    //           9:abcde
    const manifest = await Manifest.parse(`
      particle X
        h4: reads * {d: Text, x: Text}
        h8: reads * {a: Text, b: Text, c: Text, y: Text}
        h1: reads * {a: Text}
        h6: reads * {a: Text, b: Text, c: Text}
        h9: reads * {a: Text, b: Text, c: Text, d: Text, e: Text}
        h2: reads * {d: Text}
        h7: reads * {a: Text, b: Text, c: Text, d: Text}
        h5: reads * {a: Text, b: Text, d: Text}
        h3: reads * {a: Text, b: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'X_H1', parents: '',           children: 'X_H3'},
      {name: 'X_H2', parents: '',           children: 'X_H4, X_H5'},
      {name: 'X_H3', parents: 'X_H1',       children: 'X_H5, X_H6'},
      {name: 'X_H4', parents: 'X_H2',       children: ''},
      {name: 'X_H5', parents: 'X_H2, X_H3', children: 'X_H7'},
      {name: 'X_H6', parents: 'X_H3',       children: 'X_H7, X_H8'},
      {name: 'X_H7', parents: 'X_H5, X_H6', children: 'X_H9'},
      {name: 'X_H8', parents: 'X_H6',       children: ''},
      {name: 'X_H9', parents: 'X_H7',       children: ''},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('nested schemas use camel-cased path names', async () => {
    const manifest = await Manifest.parse(`
      particle Names
        data: reads * {outer: &* {t: Text, inner: &* {u: URL}}}
        dupe: reads * {t: Text, inner: &* {u: URL}}
    `);
    const graph = new SchemaGraph(manifest.particles[0]);
    const res = convert(graph);
    assert.deepStrictEqual(res.nodes.map(x => x.name), [
      'NamesInternal2', 'NamesInternal1', 'Names_Data'
    ]);
    assert.deepStrictEqual(res.aliases, {
      'NamesInternal1': ['Names_Data_Outer', 'Names_Dupe'],
      'NamesInternal2': ['Names_Data_Outer_Inner', 'Names_Dupe_Inner'],
    });
  });

  it('aliased nested schemas', async () => {
    // The handle schemas form a linear chain (h1 -> h2 -> h3) and the reference schemas
    // create a separate, single class with two aliases.
    const manifest = await Manifest.parse(`
      particle N
        h1: reads * {a: Text}
        h2: reads * {a: Text, r: &* {b: Text}}
        h3: reads * {a: Text, r: &* {b: Text}, c: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'N_H1',       parents: '',     children: 'N_H2'},
      {name: 'NInternal1', parents: '',     children: ''},
      {name: 'N_H2',       parents: 'N_H1', children: 'N_H3'},
      {name: 'N_H3',       parents: 'N_H2', children: ''},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'NInternal1': ['N_H2_R', 'N_H3_R']
    });
  });

  it('all shared nested schemas are aliased appropriately', async () => {
    // For h1: fields r and s both have multiply-nested references leading to the same innermost
    // schema '* {a: Text}'. We want a common class name for each level of the nesting stack, with
    // type aliases set up for both "sides" of the reference chain. h2 and h3 also end up using
    // the same innermost schema, so they should also have aliases set up.
    const manifest = await Manifest.parse(`
      particle Q
        h1: reads * {r: &* {t: &* {u: &* {a: Text}}}, \
                     s: &* {t: &* {u: &* {a: Text}}}}
        h2: reads * {a: Text}
        h3: reads * {v: &* {a: Text}}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'QInternal3', parents: '', children: ''},
      {name: 'Q_H3',       parents: '', children: ''},
      {name: 'QInternal2', parents: '', children: ''},
      {name: 'QInternal1', parents: '', children: ''},
      {name: 'Q_H1',       parents: '', children: ''},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'QInternal1': ['Q_H1_R', 'Q_H1_S'],
      'QInternal2': ['Q_H1_R_T', 'Q_H1_S_T'],
      'QInternal3': ['Q_H1_R_T_U', 'Q_H1_S_T_U', 'Q_H2', 'Q_H3_V'],
    });
  });

  it('diamond graph using nested schemas', async () => {
    //       1:a      3:rs
    //      /   \
    //  3R:ab   3S:ac
    //      \   /
    //      2:abc
    const manifest = await Manifest.parse(`
      particle I
        h1: reads * {a: Text}
        h2: reads * {a: Text, b: Text, c: Text}
        h3: reads * {r: &* {a: Text, b: Text}, s: &* {a: Text, c: Text}}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'I_H1',   parents: '',               children: 'I_H3_R, I_H3_S'},
      {name: 'I_H3_R', parents: 'I_H1',           children: 'I_H2'},
      {name: 'I_H3_S', parents: 'I_H1',           children: 'I_H2'},
      {name: 'I_H3',   parents: '',               children: ''},
      {name: 'I_H2',   parents: 'I_H3_R, I_H3_S', children: ''},
    ]);
    assert.isEmpty(res.aliases);
  });

  it('deeply nested schemas', async () => {
    const manifest = await Manifest.parse(`
      particle Y
        h1: reads * {r: &* {a: Text}}
        h2: reads * {a: Text, s: &* {a: Text}}
        h3: reads * {t: &* {b: Text, u: &* {b: Text, c: Text, v: &* {d: Text}}}}
        h4: reads * {a: Text, d: Text, e: Text}
        h5: reads * {b: Text, c: Text, v: &* {d: Text}}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'YInternal1', parents: '',                       children: 'Y_H2, Y_H4'},
      {name: 'YInternal3', parents: '',                       children: 'Y_H4'},
      {name: 'Y_H1',       parents: '',                       children: ''},
      {name: 'Y_H2',       parents: 'YInternal1',             children: ''},
      {name: 'Y_H4',       parents: 'YInternal1, YInternal3', children: ''},
      {name: 'YInternal2', parents: '',                       children: ''},
      {name: 'Y_H3_T',     parents: '',                       children: ''},
      {name: 'Y_H3',       parents: '',                       children: ''},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'YInternal1': ['Y_H1_R', 'Y_H2_S'],
      'YInternal2': ['Y_H3_T_U', 'Y_H5'],
      'YInternal3': ['Y_H3_T_U_V', 'Y_H5_V'],
    });
  });

  it('nested schema matching one further down the graph outputs in correct order', async () => {
    //      1:a
    //     /   \
    //  3:ab   2:ar
    //    |
    //  4:abc == 2R:abc
    const manifest = await Manifest.parse(`
      particle V
        h1: reads * {a: Text}
        h2: reads * {a: Text, r: &* {a: Text, b: Text, c: Text}}
        h3: reads * {a: Text, b: Text}
        h4: reads * {a: Text, b: Text, c: Text}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'V_H1',       parents: '',     children: 'V_H2, V_H3'},
      {name: 'V_H3',       parents: 'V_H1', children: 'VInternal1'},
      {name: 'VInternal1', parents: 'V_H3', children: ''},
      {name: 'V_H2',       parents: 'V_H1', children: ''},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'VInternal1': ['V_H2_R', 'V_H4']
    });
  });

  it('nested schemas with various descendant patterns', async () => {
    const manifest = await Manifest.parse(`
      particle R
        // Starting node with a reference
        h1: reads * {r: &* {a: Text}}

        // Starting node with a reference descending from h1
        h2: reads * {s: &* {a: Text, b: Text}}

        // Separate starting node
        k1: reads * {i: &* {n: Number}}

        // Descendant node with multiple independent references
        h3: reads * {r: &* {a: Text}, t: &* {c: Text}, u: &* {d: Text}}

        // Descendant node with co-descendant reference
        h4: reads * {r: &* {a: Text}, v: &* {a: Text, e: Text}}

        // Separate starting node with co-descendant reference
        k2: reads * {j: &* {n: Number, o: Number}}
    `);
    const res = convert(new SchemaGraph(manifest.particles[0]));
    assert.deepStrictEqual(res.nodes, [
      {name: 'RInternal1', parents: '',           children: 'R_H2_S, R_H4_V'},
      {name: 'R_K1_I',     parents: '',           children: 'R_K2_J'},
      {name: 'R_H3_T',     parents: '',           children: ''},
      {name: 'R_H3_U',     parents: '',           children: ''},
      {name: 'R_H1',       parents: '',           children: 'R_H3, R_H4'},
      {name: 'R_H2_S',     parents: 'RInternal1', children: ''},
      {name: 'R_H4_V',     parents: 'RInternal1', children: ''},
      {name: 'R_H2',       parents: '',           children: ''},
      {name: 'R_K1',       parents: '',           children: ''},
      {name: 'R_K2_J',     parents: 'R_K1_I',     children: ''},
      {name: 'R_K2',       parents: '',           children: ''},
      {name: 'R_H3',       parents: 'R_H1',       children: ''},
      {name: 'R_H4',       parents: 'R_H1',       children: ''},
    ]);
    assert.deepStrictEqual(res.aliases, {
      'RInternal1': ['R_H1_R', 'R_H3_R', 'R_H4_R']
    });
  });
});
