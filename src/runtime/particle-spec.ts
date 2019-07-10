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
import {Direction, ParticleClaimStatement, ParticleCheckStatement} from './manifest-ast-nodes.js';
import {TypeChecker} from './recipe/type-checker.js';
import {Schema} from './schema.js';
import {TypeVariableInfo} from './type-variable-info.js';
import {InterfaceType, SlotType, Type, TypeLiteral} from './type.js';
import {Literal} from './hot.js';
import {Check, createCheck} from './particle-check.js';
import {Claim, createClaim} from './particle-claim.js';

// TODO: clean up the real vs. literal separation in this file

type SerializedHandleConnectionSpec = {
  direction: Direction,
  name: string,
  type: Type | TypeLiteral,
  isOptional: boolean,
  tags?: string[],
  dependentConnections: SerializedHandleConnectionSpec[],
  check?: string,
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
  claim?: Claim;
  check?: Check;

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
    // TODO: do we want to consider any here?
    return this.direction === 'in' || this.direction === 'inout' || this.direction === 'host';
  }

  get isOutput() {
    // TODO: do we want to consider any here?
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
  handles?: string[],
  provideSlotConnections?: SerializedSlotConnectionSpec[],
  check?: Check,
};

export class ConsumeSlotConnectionSpec {
  name: string;
  isRequired: boolean;
  isSet: boolean;
  tags: string[];
  formFactor: string;
  handles: string[];
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

export class ProvideSlotConnectionSpec extends ConsumeSlotConnectionSpec {
  check?: Check;

  constructor(slotModel: SerializedSlotConnectionSpec) {
    super(slotModel);
    this.check = slotModel.check;
  }
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
  trustClaims?: ParticleClaimStatement[];
  trustChecks?: ParticleCheckStatement[];
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
  trustClaims: Map<string, Claim>;
  trustChecks: Check[];

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

  getSlotSpec(slotName: string): ConsumeSlotConnectionSpec|undefined {
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

    this.trustClaims.forEach(claim => results.push(`  ${claim.toManifestString()}`));
    this.trustChecks.forEach(check => results.push(`  ${check.toManifestString()}`));

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

  private validateTrustClaims(claims: ParticleClaimStatement[]): Map<string, Claim> {
    const results: Map<string, Claim> = new Map();
    if (claims) {
      claims.forEach(claim => {
        const handle = this.handleConnectionMap.get(claim.handle);
        if (!handle) {
          throw new Error(`Can't make a claim on unknown handle ${claim.handle}.`);
        }
        if (!handle.isOutput) {
          throw new Error(`Can't make a claim on handle ${claim.handle} (not an output handle).`);
        }
        if (handle.claim) {
          throw new Error(`Can't make multiple claims on the same output (${claim.handle}).`);
        }
        handle.claim = createClaim(handle, claim, this.handleConnectionMap);
        results.set(claim.handle, handle.claim);
      });
    }
    return results;
  }

  private validateTrustChecks(checks: ParticleCheckStatement[]): Check[] {
    const results: Check[] = [];
    if (checks) {
      const providedSlotNames = this.getProvidedSlotsByName();
      checks.forEach(check => {
        switch (check.target.targetType) {
          case 'handle': {
            const handleName = check.target.name;
            const handle = this.handleConnectionMap.get(handleName);
            if (!handle) {
              throw new Error(`Can't make a check on unknown handle ${handleName}.`);
            }
            if (!handle.isInput) {
              throw new Error(`Can't make a check on handle ${handleName} (not an input handle).`);
            }
            if (handle.check) {
              throw new Error(`Can't make multiple checks on the same input (${handleName}).`); 
            }
            
            handle.check = createCheck(handle, check, this.handleConnectionMap);
            results.push(handle.check);
            break;
          }
          case 'slot': {
            const slotName = check.target.name;
            const slotSpec = providedSlotNames.get(slotName);
            if (!slotSpec) {
              if (this.slotConnectionNames.includes(slotName)) {
                throw new Error(`Slot ${slotName} is a consumed slot. Can only make checks on provided slots.`);
              } else {
                throw new Error(`Can't make a check on unknown slot ${slotName}.`);
              }
            }
            slotSpec.check = createCheck(slotSpec, check, this.handleConnectionMap);
            results.push(slotSpec.check);
            break;
          }
          default:
            throw new Error('Unknown check target type.');
        }
      });
    }
    return results;
  }

  private getProvidedSlotsByName(): ReadonlyMap<string, ProvideSlotConnectionSpec> {
    const result: Map<string, ProvideSlotConnectionSpec> = new Map();
    for (const consumeConnection of this.slotConnections.values()) {
      for (const provideConnection of consumeConnection.provideSlotConnections) {
        const name = provideConnection.name;
        if (result.has(name)) {
          throw new Error(`Another slot with name '${name}' has already been provided by this particle.`);
        }
        result.set(name, provideConnection);
      }
    }
    return result;
  }
}
