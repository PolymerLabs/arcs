/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Claim} from '../../runtime/particle-claim';
import {Check} from '../../runtime/particle-check';

export abstract class Node {
  abstract readonly inEdges: readonly Edge[];
  abstract readonly outEdges: readonly Edge[];

  abstract addInEdge(edge: Edge): void;
  abstract addOutEdge(edge: Edge): void;

  get inNodes(): Node[] {
    return this.inEdges.map(e => e.start);
  }

  get outNodes(): Node[] {
    return this.outEdges.map(e => e.end);
  }

  abstract inEdgesFromOutEdge(outEdge: Edge): readonly Edge[];
}

export interface Edge {
  readonly start: Node;
  readonly end: Node;

  /** The name of the handle/slot this edge represents, e.g. "output1". */
  readonly connectionName: string;

  /** The qualified name of the handle/slot this edge represents, e.g. "MyParticle.output1". */
  readonly label: string;

  readonly claim?: Claim;
  readonly check?: Check;
}
