/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../platform/assert-web.js';

import {Modality} from './modality.js';
import {Direction} from './manifest-ast-nodes.js';
import {TypeChecker} from './recipe/type-checker.js';
import {Schema} from './schema.js';
import {TypeVariableInfo} from './type-variable-info.js';
import {InterfaceType, SlotType, Type, TypeLiteral} from './type.js';
import {Literal} from './hot.js';

// TODO: clean up the real vs. literal separation in this file

type SerializedHandleConnectionSpec = {
  direction: Direction,
  name: string,
  type: Type | TypeLiteral,
  isOptional: boolean,
  tags?: string[],
  dependentConnections: SerializedHandleConnectionSpec[]
};

function asType(t: Type | TypeLiteral) : Type {
  return (t instanceof Type) ? t : Type.fromLiteral(t);
}

function asTypeLiteral(t: Type | TypeLiteral) : TypeLiteral {
  return (t instanceof Type) ? t.toLiteral() : t;
}

export class HandleConnectionSpec {
  rawData: SerializedHandleConnectionSpec;
  direction: Direction;
  name: string;
  type: Type;
  isOptional: boolean;
  tags: string[];
  dependentConnections: HandleConnectionSpec[];
  pattern?: string;
  parentConnection: HandleConnectionSpec | null = null;

  constructor(rawData: SerializedHandleConnectionSpec, typeVarMap: Map<string, Type>) {
    this.rawData = rawData;
    this.direction = rawData.direction;
    this.name = rawData.name;
    this.type = asType(rawData.type).mergeTypeVariablesByName(typeVarMap);
    this.isOptional = rawData.isOptional;
    this.tags = rawData.tags || [];
    this.dependentConnections = [];
  }

  instantiateDependentConnections(particle, typeVarMap: Map<string, Type>): void {
    for (const dependentArg of this.rawData.dependentConnections) {
      const dependentConnection = particle.createConnection(dependentArg, typeVarMap);
      dependentConnection.parentConnection = this;
      this.dependentConnections.push(dependentConnection);
    }
  }

  get isInput() {
    // TODO: we probably don't really want host to be here.
    return this.direction === 'in' || this.direction === 'inout' || this.direction === 'host';
  }

  get isOutput() {
    return this.direction === 'out' || this.direction === 'inout';
  }

  isCompatibleType(type: Type) {
    return TypeChecker.compareTypes({type}, {type: this.type, direction: this.direction});
  }
}

type SerializedSlotConnectionSpec = {
  name: string,
  isRequired?: boolean,
  isSet?: boolean,
  tags?: string[],
  formFactor?: string,
  handles?: string[]
  provideSlotConnections?: SerializedSlotConnectionSpec[]
};

export class ConsumeSlotConnectionSpec {
  name: string;
  isRequired: boolean;
  isSet: boolean;
  tags: string[];
  formFactor: string;
  handles?: string[];
  provideSlotConnections: ProvideSlotConnectionSpec[];

  constructor(slotModel: SerializedSlotConnectionSpec) {
    this.name = slotModel.name;
    this.isRequired = slotModel.isRequired || false;
    this.isSet = slotModel.isSet || false;
    this.tags = slotModel.tags || [];
    this.formFactor = slotModel.formFactor; // TODO: deprecate form factors?
    this.handles = slotModel.handles || [];
    this.provideSlotConnections = [];
    if (!slotModel.provideSlotConnections) {
      return;
    }
    slotModel.provideSlotConnections.forEach(ps => {
      this.provideSlotConnections.push(new ProvideSlotConnectionSpec(ps));
    });
  }

  // Getters to 'fake' being a Handle.
  get isOptional(): boolean { return !this.isRequired; }
  get direction(): string { return '`consume'; }
  get type(): SlotType { return SlotType.make(this.formFactor, null); } //TODO(jopra): FIX THIS NULL!
  get dependentConnections(): ProvideSlotConnectionSpec[] { return this.provideSlotConnections; }
}

export class ProvideSlotConnectionSpec extends ConsumeSlotConnectionSpec {}

export interface SerializedParticleTrustClaimSpec extends Literal {
  handle: string;
  trustTag: string;
}

export interface SerializedParticleTrustCheckSpec extends Literal {
  handle: string;
  trustTags: string[];
}

export interface SerializedParticleSpec extends Literal {
  name: string;
  id?: string;
  verbs: string[];
  args: SerializedHandleConnectionSpec[];
  description: {pattern?: string};
  implFile: string;
  implBlobUrl: string | null;
  modality: string[];
  slotConnections: SerializedSlotConnectionSpec[];
  trustClaims?: SerializedParticleTrustClaimSpec[];
  trustChecks?: SerializedParticleTrustCheckSpec[];
}

export class ParticleSpec {
  private readonly model: SerializedParticleSpec;
  name: string;
  verbs: string[];
  handleConnectionMap: Map<string, HandleConnectionSpec>;
  pattern: string;
  implFile: string;
  implBlobUrl: string | null;
  modality: Modality;
  slotConnections: Map<string, ConsumeSlotConnectionSpec>;

  // Trust claims/checks: maps from handle name to a "trust tag".
  trustClaims: Map<string, string>;
  trustChecks: Map<string, string[]>;

  constructor(model: SerializedParticleSpec) {
    this.model = model;
    this.name = model.name;
    this.verbs = model.verbs;
    const typeVarMap = new Map();
    this.handleConnectionMap = new Map();
    model.args.forEach(arg => this.createConnection(arg, typeVarMap));

    // initialize descriptions patterns.
    model.description = model.description || {};
    this.validateDescription(model.description);
    this.pattern = model.description['pattern'];
    this.handleConnectionMap.forEach((connectionSpec, name) => {
      connectionSpec.pattern = model.description[name];
    });

    this.implFile = model.implFile;
    this.implBlobUrl = model.implBlobUrl;
    this.modality = Modality.create(model.modality || []);
    this.slotConnections = new Map();
    if (model.slotConnections) {
      model.slotConnections.forEach(s => this.slotConnections.set(s.name, new ConsumeSlotConnectionSpec(s)));
    }
    // Verify provided slots use valid handle connection names.
    this.slotConnections.forEach(slot => {
      slot.provideSlotConnections.forEach(ps => {
        ps.handles.forEach(v => assert(this.handleConnectionMap.has(v), 'Cannot provide slot for nonexistent handle constraint ' + v));
      });
    });

    this.trustClaims = this.validateTrustClaims(model.trustClaims);
    this.trustChecks = this.validateTrustChecks(model.trustChecks);
  }

  createConnection(arg: SerializedHandleConnectionSpec, typeVarMap: Map<string, Type>): HandleConnectionSpec {
    const connection = new HandleConnectionSpec(arg, typeVarMap);
    this.handleConnectionMap.set(connection.name, connection);
    connection.instantiateDependentConnections(this, typeVarMap);
    return connection;
  }

  get handleConnections() {
    return this.connections;
  }

  get connections(): HandleConnectionSpec[] {
    return [...this.handleConnectionMap.values()];
  }

  get inputs(): HandleConnectionSpec[] {
    return this.connections.filter(a => a.isInput);
  }

  get outputs(): HandleConnectionSpec[] {
    return this.connections.filter(a => a.isOutput);
  }

  isInput(param: string): boolean {
    const connection = this.handleConnectionMap.get(param);
    return connection && connection.isInput;
  }

  isOutput(param: string): boolean {
    const connection = this.handleConnectionMap.get(param);
    return connection && connection.isOutput;
  }

  getConnectionByName(name: string): HandleConnectionSpec|undefined {
    return this.handleConnectionMap.get(name);
  }

  getSlotSpec(slotName: string) {
    return this.slotConnections.get(slotName);
  }

  get slotConnectionNames(): string[] {
    return [...this.slotConnections.keys()];
  }

  get primaryVerb(): string|undefined {
    return (this.verbs.length > 0) ? this.verbs[0] : undefined;
  }

  isCompatible(modality: Modality): boolean {
    return this.slotConnections.size === 0 || this.modality.intersection(modality).isResolved();
  }

  setImplBlobUrl(url: string): void {
    this.model.implBlobUrl = this.implBlobUrl = url;
  }

  toLiteral(): SerializedParticleSpec {
    const {args, name, verbs, description, implFile, implBlobUrl, modality, slotConnections, trustClaims, trustChecks} = this.model;
    const connectionToLiteral : (input: SerializedHandleConnectionSpec) => SerializedHandleConnectionSpec =
      ({type, direction, name, isOptional, dependentConnections}) => ({type: asTypeLiteral(type), direction, name, isOptional, dependentConnections: dependentConnections.map(connectionToLiteral)});
    const argsLiteral = args.map(a => connectionToLiteral(a));
    return {args: argsLiteral, name, verbs, description, implFile, implBlobUrl, modality, slotConnections, trustClaims, trustChecks};
  }

  static fromLiteral(literal: SerializedParticleSpec): ParticleSpec {
    let {args, name, verbs, description, implFile, implBlobUrl, modality, slotConnections, trustClaims, trustChecks} = literal;
    const connectionFromLiteral = ({type, direction, name, isOptional, dependentConnections}) =>
      ({type: asType(type), direction, name, isOptional, dependentConnections: dependentConnections ? dependentConnections.map(connectionFromLiteral) : []});
    args = args.map(connectionFromLiteral);
    return new ParticleSpec({args, name, verbs: verbs || [], description, implFile, implBlobUrl, modality, slotConnections, trustClaims, trustChecks});
  }

  // Note: this method shouldn't be called directly.
  clone(): ParticleSpec {
    return ParticleSpec.fromLiteral(this.toLiteral());
  }

  // Note: this method shouldn't be called directly (only as part of particle copying).
  cloneWithResolutions(variableMap: Map<TypeVariableInfo|Schema, TypeVariableInfo|Schema>): ParticleSpec {
    const spec = this.clone();
    this.handleConnectionMap.forEach((conn, name) => {
      spec.handleConnectionMap.get(name).type = conn.type._cloneWithResolutions(variableMap);
    });
    return spec;
  }

  equals(other): boolean {
    return JSON.stringify(this.toLiteral()) === JSON.stringify(other.toLiteral());
  }

  validateDescription(description): void {
    Object.keys(description || []).forEach(d => {
      assert(['kind', 'location', 'pattern'].includes(d) || this.handleConnectionMap.has(d), `Unexpected description for ${d}`);
    });
  }

  toInterface(): InterfaceType {
    // TODO: wat do?
    assert(!this.slotConnections.size, 'please implement slots toInterface');
    const handles = this.model.args.map(({type, name, direction}) => ({type: asType(type), name, direction}));
    const slots = [];
    return InterfaceType.make(this.name, handles, slots);
  }

  toString(): string {
    const results: string[] = [];
    let verbs = '';
    if (this.verbs.length > 0) {
      verbs = ' ' + this.verbs.map(verb => `&${verb}`).join(' ');
    }
    results.push(`particle ${this.name}${verbs} in '${this.implFile}'`.trim());
    const indent = '  ';
    const writeConnection = (connection, indent) => {
      const tags = connection.tags.map((tag) => ` #${tag}`).join('');
      results.push(`${indent}${connection.direction}${connection.isOptional ? '?' : ''} ${connection.type.toString()} ${connection.name}${tags}`);
      for (const dependent of connection.dependentConnections) {
        writeConnection(dependent, indent + '  ');
      }
    };

    for (const connection of this.handleConnections) {
      if (connection.parentConnection) {
        continue;
      }
      writeConnection(connection, indent);
    }

    this.modality.names.forEach(a => results.push(`  modality ${a}`));
    const slotToString = (s: SerializedSlotConnectionSpec | ProvideSlotConnectionSpec, direction: string, indent: string):void => {
      const tokens: string[] = [];
      if (s.isRequired) {
        tokens.push('must');
      }
      tokens.push(direction);
      if (s.isSet) {
        tokens.push('set of');
      }
      tokens.push(s.name);
      if (s.tags.length > 0) {
        tokens.push(s.tags.map(a => `#${a}`).join(' '));
      }
      results.push(`${indent}${tokens.join(' ')}`);
      if (s.formFactor) {
        results.push(`${indent}  formFactor ${s.formFactor}`);
      }
      for (const handle of s.handles) {
        results.push(`${indent}  handle ${handle}`);
      }
      if (s.provideSlotConnections) {
        // Provided slots.
        s.provideSlotConnections.forEach(p => slotToString(p, 'provide', indent+'  '));
      }
    };

    this.slotConnections.forEach(
      s => slotToString(s, 'consume', '  ')
    );
    // Description
    if (this.pattern) {
      results.push(`  description \`${this.pattern}\``);
      this.handleConnectionMap.forEach(cs => {
        if (cs.pattern) {
          results.push(`    ${cs.name} \`${cs.pattern}\``);
        }
      });
    }
    return results.join('\n');
  }

  toManifestString(): string {
    return this.toString();
  }

  private validateTrustClaims(claims: SerializedParticleTrustClaimSpec[]): Map<string, string> {
    const results: Map<string, string> = new Map();
    if (claims) {
      claims.forEach(claim => {
        assert(this.handleConnectionMap.has(claim.handle), `Can't make a claim on unknown handle ${claim.handle}.`);
        const handle = this.handleConnectionMap.get(claim.handle);
        assert(handle.isOutput, `Can't make a claim on handle ${claim.handle} (not an output handle).`);
        results.set(claim.handle, claim.trustTag);
      });
    }
    return results;
  }

  private validateTrustChecks(checks?: SerializedParticleTrustCheckSpec[]): Map<string, string[]> {
    const results: Map<string, string[]> = new Map();
    if (checks) {
      checks.forEach(check => {
        assert(this.handleConnectionMap.has(check.handle), `Can't make a check on unknown handle ${check.handle}.`);
        const handle = this.handleConnectionMap.get(check.handle);
        assert(handle.isInput, `Can't make a check on handle ${check.handle} (not an input handle).`);
        results.set(check.handle, check.trustTags);
      });
    }
    return results;
  }
}
