/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {assert} from '../../platform/assert-web.js';
import {Modality} from './modality.js';
import {ClaimStatement, CheckStatement} from '../manifest-ast-types/manifest-ast-nodes.js';
import {Direction, SlotDirection} from './enums.js';
import {TypeChecker} from '../type-checker.js';
import {InterfaceType, SlotType, Type, TypeLiteral, TypeVariableInfo, Schema} from '../../types/lib-types.js';
import {Literal, IndentingStringBuilder} from '../../utils/lib-utils.js';
import {Check, HandleConnectionSpecInterface, ConsumeSlotConnectionSpecInterface, ProvideSlotConnectionSpecInterface, createCheck} from './check.js';
import {Claim, createClaim} from './claim.js';
import * as AstNode from '../manifest-ast-types/manifest-ast-nodes.js';
import {AnnotationRef} from './annotation.js';
import {resolveFieldPathType} from '../field-path.js';

// TODO: clean up the real vs. literal separation in this file

type SerializedHandleConnectionSpec = {
  direction: Direction,
  relaxed: boolean,
  name: string,
  type: Type | TypeLiteral,
  isOptional: boolean,
  tags?: string[],
  dependentConnections: SerializedHandleConnectionSpec[],
  check?: string,
  annotations: AnnotationRef[];
  expression?: string;
};

function asType(t: Type | TypeLiteral) : Type {
  return (t instanceof Type) ? t : Type.fromLiteral(t);
}

function asTypeLiteral(t: Type | TypeLiteral) : TypeLiteral {
  return (t instanceof Type) ? t.toLiteral() : t;
}

export function isRoot({name, tags, id, type, fate}: {name: string, tags: string[], id?: string, type?: Type, fate?: string}): boolean {
  const rootNames: string[] = [
    'root',
    'toproot',
    'modal'
  ];

  if ((fate && fate !== '`slot') || (type && !type.slandleType())) {
    // If this is a handle that is not a Slandle, it cannot be a root slot.
    return false;
  }

  // Checks that, if the id exists, it starts with the root id prefx.
  const prefix = 'rootslotid-';
  if (id && id.lastIndexOf(prefix, 0) === 0) {
    const rootName = id.substr(prefix.length);
    if (rootNames.includes(rootName)) {
      return true;
    }
  }
  return rootNames.includes(name) || tags.some(tag => rootNames.includes(tag));
}

export class HandleConnectionSpec implements HandleConnectionSpecInterface {
  private rawData: SerializedHandleConnectionSpec;
  discriminator: 'HCS';
  direction: Direction;
  relaxed: boolean;
  name: string;
  type: Type;
  isOptional: boolean;
  tags: string[];
  dependentConnections: HandleConnectionSpec[];
  pattern?: string;
  parentConnection: HandleConnectionSpec | null = null;
  claims?: Claim[];
  checks?: Check[];
  _annotations: AnnotationRef[];
  expression: string;

  constructor(rawData: SerializedHandleConnectionSpec, typeVarMap: Map<string, Type>) {
    this.discriminator = 'HCS';
    this.rawData = rawData;
    this.direction = rawData.direction;
    this.relaxed = rawData.relaxed;
    this.name = rawData.name;
    this.type = asType(rawData.type).mergeTypeVariablesByName(typeVarMap);
    this.isOptional = rawData.isOptional;
    this.tags = rawData.tags || [];
    this.dependentConnections = [];
    this.annotations = rawData.annotations || [];
    this.expression = rawData.expression;
  }

  instantiateDependentConnections(particle, typeVarMap: Map<string, Type>): void {
    for (const dependentArg of this.rawData.dependentConnections) {
      const dependentConnection = particle.createConnection(dependentArg, typeVarMap);
      dependentConnection.parentConnection = this;
      this.dependentConnections.push(dependentConnection);
    }
  }

  toSlotConnectionSpec(): ConsumeSlotConnectionSpecInterface {
    // TODO: Remove in SLANDLESv2
    const slotType = this.type.slandleType();
    if (!slotType) {
      return undefined;
    }

    const isSet = this.type.isCollectionType();
    const slotInfo = slotType.getSlot();

    return {
      discriminator: 'CSCS',
      name: this.name,
      isOptional: this.isOptional,
      direction: this.direction,
      tags: this.tags,
      dependentConnections: this.dependentConnections.map(conn => conn.toSlotConnectionSpec()),
      // Fakes
      isRequired: !this.isOptional, // TODO: Remove duplicated data isRequired vs isOptional (prefer isOptional)
      isSet,
      type: slotType,
      handles: slotInfo.handle ? [slotInfo.handle] : [],
      formFactor: slotInfo.formFactor,
      provideSlotConnections: this.dependentConnections.map(conn => conn.toSlotConnectionSpec()),
    };
  }

  get isInput() {
    // TODO: we probably don't really want host to be here.
    // TODO: do we want to consider any here?
    return this.direction === 'reads' || this.direction === 'reads writes' || this.direction === 'hosts';
  }

  get isOutput() {
    // TODO: do we want to consider any here?
    return this.direction === 'writes' || this.direction === 'reads writes';
  }

  isCompatibleType(type: Type) {
    return TypeChecker.compareTypes({type}, {type: this.type, direction: this.direction});
  }

  get annotations(): AnnotationRef[] { return this._annotations; }
  set annotations(annotations: AnnotationRef[]) {
    annotations.every(a => assert(a.isValidForTarget('HandleConnection'),
        `Annotation '${a.name}' is invalid for HandleConnection`));
    this._annotations = annotations;
  }
  getAnnotation(name: string): AnnotationRef | null {
    const annotations = this.findAnnotations(name);
    assert(annotations.length <= 1,
        `Multiple annotations found for '${name}'. Use findAnnotations instead.`);
    return annotations.length === 0 ? null : annotations[0];
  }
  findAnnotations(name: string): AnnotationRef[] {
    return this.annotations.filter(a => a.name === name);
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
  expression?: string,
};

export class ConsumeSlotConnectionSpec implements ConsumeSlotConnectionSpecInterface {
  discriminator: 'CSCS';
  name: string;
  isRequired: boolean;
  isSet: boolean;
  tags: string[];
  formFactor: string;
  handles: string[];
  provideSlotConnections: ProvideSlotConnectionSpec[];

  constructor(slotModel: SerializedSlotConnectionSpec) {
    this.discriminator = 'CSCS';
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
  get direction(): string { return '`consumes'; }
  get type(): Type {
    //TODO(jopra): FIXME make the null handle optional.
    const slotT = SlotType.make(this.formFactor, null);
    if (this.isSet) {
      return slotT.collectionOf();
    }
    return slotT;
  }
  get dependentConnections(): ProvideSlotConnectionSpec[] { return this.provideSlotConnections; }
}

export class ProvideSlotConnectionSpec extends ConsumeSlotConnectionSpec implements ProvideSlotConnectionSpecInterface {
  check?: Check;
  discriminator: 'CSCS';

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
  description?: AstNode.Description;
  external: boolean;
  implFile: string;
  implBlobUrl?: string;
  modality: string[];
  slotConnections: SerializedSlotConnectionSpec[];
  trustClaims?: ClaimStatement[];
  trustChecks?: CheckStatement[];
  annotations?: AnnotationRef[];
  manifestNamespace?: string;
}

export interface StorableSerializedParticleSpec extends SerializedParticleSpec {
  id: string;
}

type ParticleSpecOptions = {
  // Map from handle name to type. Used when constructing a ParticleSpec to
  // override the handle types deserialized from the model.
  handleTypeOverrides?: Map<string, Type>,
};

export class ParticleSpec {
  private readonly model: SerializedParticleSpec;
  name: string;
  verbs: string[];
  handleConnectionMap: Map<string, HandleConnectionSpec>;
  pattern: string;
  external: boolean;
  implFile: string;
  implBlobUrl?: string;
  modality: Modality;
  slotConnections: Map<string, ConsumeSlotConnectionSpec>;
  trustClaims: Claim[];
  trustChecks: Check[];
  _annotations: AnnotationRef[] = [];

  constructor(model: SerializedParticleSpec, options?: ParticleSpecOptions) {
    this.model = model;
    this.name = model.name;
    this.verbs = model.verbs;
    const typeVarMap = new Map();
    this.handleConnectionMap = new Map();
    model.args.forEach(arg => this.createConnection(arg, typeVarMap));

    // initialize descriptions patterns.
    model.description = model.description;
    this.validateDescription(model.description);
    this.pattern = model.description && model.description['pattern'];
    this.handleConnectionMap.forEach((connectionSpec, name) => {
      connectionSpec.pattern = model.description && model.description[name];
    });

    // Override handle types with ones provided from the override map. Type
    // variables with resolutions don't survive the cloning process, so they can
    // be added in here.
    if (options && options.handleTypeOverrides) {
      options.handleTypeOverrides.forEach((type, name) => {
        this.handleConnectionMap.get(name).type = type;
      });
    }

    this.external = model.external;
    this.implFile = model.implFile;
    this.implBlobUrl = model.implBlobUrl;
    this.modality = model.modality ? Modality.create(model.modality) : Modality.all;
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
    this.annotations = model.annotations || [];
  }

  createConnection(arg: SerializedHandleConnectionSpec, typeVarMap: Map<string, Type>): HandleConnectionSpec {
    const connection = new HandleConnectionSpec(arg, typeVarMap);
    if (this.handleConnectionMap.get(connection.name)) {
      throw new Error(`Particle Spec ${this.name} already has a handle connection named "${connection.name}".`);
    }
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

  get manifestNamespace(): string | null {
    return this.model.manifestNamespace;
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

  getSlandleSpec(slotName: string): ConsumeSlotConnectionSpec|undefined {
    const slot = this.slotConnections.get(slotName);
    if (slot) return slot;
    const handleConn = this.handleConnectionMap.get(slotName);
    return handleConn.toSlotConnectionSpec();
  }

  slandleConnectionNames(): string[] {
    const slandleNames: string[] = this.handleConnections.filter(
      conn => conn.toSlotConnectionSpec()
    ).map(conn => conn.name);
    return [...this.slotConnections.keys(), ...slandleNames];
  }

  slotConnectionNames(): string[] {
    return [...this.slotConnections.keys()];
  }

  /**
   * Returns true if there's a consume or provide connection named @name.
   */
  hasSlotConnectionName(name: string): boolean {
    if (this.slotConnections.has(name)) {
      return true;
    }
    return [...this.slotConnections.values()].map(connection => {
      return connection.provideSlotConnections.map(pc => pc.name).includes(name);
    }).reduce((a, b) => a || b);
  }

  get primaryVerb(): string|undefined {
    return (this.verbs.length > 0) ? this.verbs[0] : undefined;
  }

  get annotations(): AnnotationRef[] { return this._annotations; }
  set annotations(annotations: AnnotationRef[]) {
    annotations.every(a => assert(a.isValidForTarget('Particle'),
        `Annotation '${a.name}' is invalid for Particle`));
    this._annotations = annotations;
  }
  getAnnotation(name: string): AnnotationRef | null {
    const annotations = this.findAnnotations(name);
    assert(annotations.length <= 1,
        `Multiple annotations found for '${name}'. Use findAnnotations instead.`);
    return annotations.length === 0 ? null : annotations[0];
  }
  findAnnotations(name: string): AnnotationRef[] {
    return this.annotations.filter(a => a.name === name);
  }

  get dataflowType(): ParticleDataflowType {
    const isolated = !!this.getAnnotation('isolated');
    const ingress = !!this.getAnnotation('ingress');
    const egress = !!this.getAnnotation('egress');
    return new ParticleDataflowType({isolated, ingress, egress});
  }

  /**
   * Returns the egress type of this particle, according to the `@egress`
   * annotation on it. Returns null if no egress type was supplied, or if the
   * particle is not an egress particle.
   */
  get egressType(): string | null {
    const egressAnnotation = this.getAnnotation('egress');
    if (!egressAnnotation) {
      return null;
    }
    const egressType = egressAnnotation.params['type'];
    return egressType == null ? null : egressType as string;
  }

  isCompatible(modality: Modality): boolean {
    return this.slandleConnectionNames().length === 0 || this.modality.intersection(modality).isResolved();
  }

  setImplBlobUrl(url: string): void {
    this.model.implBlobUrl = this.implBlobUrl = url;
  }

  toLiteral(): SerializedParticleSpec {
    const {args, name, verbs, description, external, implFile, implBlobUrl, modality, slotConnections, trustClaims, trustChecks, annotations, manifestNamespace} = this.model;
    const connectionToLiteral : (input: SerializedHandleConnectionSpec) => SerializedHandleConnectionSpec =
      ({type, direction, relaxed, name, isOptional, dependentConnections, annotations, expression}) => ({type: asTypeLiteral(type), direction, relaxed, name, isOptional, dependentConnections: dependentConnections.map(connectionToLiteral), annotations: annotations || [], expression});
    const argsLiteral = args.map(a => connectionToLiteral(a));
    return {args: argsLiteral, name, verbs, description, external, implFile, implBlobUrl, modality, slotConnections, trustClaims, trustChecks, annotations, manifestNamespace};
  }

  static fromLiteral(literal: SerializedParticleSpec, options?: ParticleSpecOptions): ParticleSpec {
    let {args, name, verbs, description, external, implFile, implBlobUrl, modality, slotConnections, trustClaims, trustChecks, annotations, manifestNamespace} = literal;
    const connectionFromLiteral = ({type, direction, relaxed, name, isOptional, dependentConnections, expression}: SerializedHandleConnectionSpec) =>
      ({type: asType(type), direction, relaxed, name, isOptional, dependentConnections: dependentConnections ? dependentConnections.map(connectionFromLiteral) : [], annotations: /*annotations ||*/ [], expression});
    args = args.map(connectionFromLiteral);
    return new ParticleSpec({args, name, verbs: verbs || [], description, external, implFile, implBlobUrl, modality, slotConnections, trustClaims, trustChecks, annotations, manifestNamespace}, options);
  }

  // Note: this method shouldn't be called directly.
  clone(options?: ParticleSpecOptions): ParticleSpec {
    return ParticleSpec.fromLiteral(this.toLiteral(), options);
  }

  // Note: this method shouldn't be called directly (only as part of particle copying).
  cloneWithResolutions(variableMap: Map<TypeVariableInfo|Schema, TypeVariableInfo|Schema>): ParticleSpec {
    const handleTypeOverrides: Map<string, Type> = new Map();
    this.handleConnectionMap.forEach((conn, name) => {
      handleTypeOverrides.set(name, conn.type._cloneWithResolutions(variableMap));
    });
    return this.clone({handleTypeOverrides});
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

  toManifestString(builder = new IndentingStringBuilder()): string {
    for (const annotation of this.annotations) {
      builder.push(annotation.toString());
    }
    let verbs = '';
    if (this.verbs.length > 0) {
      verbs = ' ' + this.verbs.map(verb => `&${verb}`).join(' ');
    }
    let line = '';
    if (this.external) {
      line += 'external ';
    }
    line += `particle ${this.name}${verbs}`;
    if (this.implFile) {
      line += ` in '${this.implFile}'`;
    }
    builder.push(line);

    const indentedBuilder = builder.withIndent();

    const writeConnection = (connection: HandleConnectionSpec, builder: IndentingStringBuilder) => {
      const dir = connection.direction === 'any' ? '' : `${AstNode.preSlandlesDirectionToDirection(connection.direction, connection.isOptional)}`;

      const subresults = [
        `${connection.name}:`,
        dir,
        connection.relaxed ? AstNode.RELAXATION_KEYWORD : '',
        connection.type.toString(),
        ...connection.annotations.map(a => a.toString()),
        ...connection.tags.map((tag: string) => `#${tag}`)
      ];

      builder.push(subresults.filter(s => s !== '').join(' '));
      for (const dependent of connection.dependentConnections) {
        writeConnection(dependent, builder.withIndent());
      }
    };

    for (const connection of this.handleConnections) {
      if (connection.parentConnection) {
        continue;
      }
      writeConnection(connection, indentedBuilder);
    }

    indentedBuilder.push(
        ...this.trustClaims.map(claim => claim.toManifestString()),
        ...this.trustChecks.map(check => check.toManifestString()));

    this.modality.names.forEach(a => indentedBuilder.push(`modality ${a}`));
    const slotToString = (s: SerializedSlotConnectionSpec | ProvideSlotConnectionSpec, direction: SlotDirection, builder: IndentingStringBuilder):void => {
      const tokens: string[] = [];
      tokens.push(`${s.name}:`);
      tokens.push(`${direction}${s.isRequired ? '' : '?'}`);

      const fieldSet = [];
      // TODO(jopra): Move the formFactor and handle to the slot type information.
      if (s.formFactor) {
        fieldSet.push(`formFactor: ${s.formFactor}`);
      }
      for (const handle of s.handles) {
        fieldSet.push(`handle: ${handle}`);
      }
      const fields = (fieldSet.length !== 0) ? ` {${fieldSet.join(', ')}}` : '';
      if (s.isSet) {
        tokens.push(`[Slot${fields}]`);
      } else {
        tokens.push(`Slot${fields}`);
      }
      if (s.tags.length > 0) {
        tokens.push(s.tags.map(a => `#${a}`).join(' '));
      }
      builder.push(`${tokens.join(' ')}`);
      if (s.provideSlotConnections) {
        // Provided slots.
        s.provideSlotConnections.forEach(p => slotToString(p, 'provides', builder.withIndent()));
      }
    };

    this.slotConnections.forEach(s => slotToString(s, 'consumes', indentedBuilder));

    // Description
    if (this.pattern) {
      indentedBuilder.push(`description \`${this.pattern}\``);
      indentedBuilder.withIndent(indentedBuilder => {
        this.handleConnectionMap.forEach(cs => {
          if (cs.pattern) {
            indentedBuilder.push(`${cs.name} \`${cs.pattern}\``);
          }
        });
      });
    }
    return builder.toString();
  }

  toString(): string {
    return this.toManifestString();
  }

  private validateTrustClaims(statements: ClaimStatement[]): Claim[] {
    const results: Claim[] = [];
    if (statements) {
      statements.forEach(statement => {
        const target = [statement.handle, ...statement.fieldPath].join('.');
        const handle = this.handleConnectionMap.get(statement.handle);
        if (!handle) {
          throw new Error(`Can't make a claim on unknown handle ${statement.handle}.`);
        }
        if (!handle.isOutput) {
          throw new Error(`Can't make a claim on handle ${statement.handle} (not an output handle).`);
        }
        resolveFieldPathType(statement.fieldPath, handle.type);
        if (!handle.claims) {
          handle.claims = [];
        } else if (handle.claims.some(claim => claim.target === target)) {
          throw new Error(`Can't make multiple claims on the same target (${target}).`);
        }
        const particleClaim = createClaim(handle, statement, this.handleConnectionMap);
        handle.claims.push(particleClaim);
        results.push(particleClaim);
      });
    }
    return results;
  }

  private validateTrustChecks(checks: CheckStatement[]): Check[] {
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
            if (handle.direction === '`consumes' || handle.direction === '`provides') {
              // Do slandles versions of slots checks and claims.
              if (handle.direction === '`consumes') {
                throw new Error(`Can't make a check on handle ${handleName}. Can only make checks on input and provided handles.`);
              }
            } else if (!handle.isInput) {
              throw new Error(`Can't make a check on handle ${handleName} with direction ${handle.direction} (not an input handle).`);
            }
            resolveFieldPathType(check.target.fieldPath, handle.type);
            const checkObject = createCheck(handle, check, this.handleConnectionMap);
            if (!handle.checks) {
              handle.checks = [];
            } else if (handle.checks.some(c => c.targetString === checkObject.targetString)) {
              throw new Error(`Can't make multiple checks on the same target (${checkObject.targetString}).`);
            }
            handle.checks.push(checkObject);
            results.push(checkObject);
            break;
          }
          case 'slot': {
            const slotName = check.target.name;
            const slotSpec = providedSlotNames.get(slotName);
            if (!slotSpec) {
              if (this.slotConnectionNames().includes(slotName)) {
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

export class ParticleDataflowType {
  /**
   * Indicates whether the particle is an isolated particle (i.e. neither
   * ingress nor egress).
   */
  readonly isolated: boolean;

  /**
   * Indicates whether the particle is an ingress (non-isolated) particle,
   * capable of retrieving data from outside the Arcs system.
   */
  readonly ingress: boolean;

  /**
   * Indicates whether the particle is an egress (non-isolated) particle,
   * capable of sending data outside the Arcs system.
   */
  readonly egress: boolean;

  constructor({isolated, ingress, egress}: {isolated: boolean, ingress: boolean, egress: boolean}) {
    assert(!(isolated && ingress), 'Particle cannot be tagged with both @isolated and @ingress.');
    assert(!(isolated && egress), 'Particle cannot be tagged with both @isolated and @egress.');
    if (!isolated && !ingress && !egress) {
      // Particles without any annotations are considered ingress and egress by
      // default.
      ingress = true;
      egress = true;
    }
    this.isolated = isolated;
    this.ingress = ingress;
    this.egress = egress;
  }

  static ISOLATED = new ParticleDataflowType({isolated: true, ingress: false, egress: false});
  static INGRESS = new ParticleDataflowType({isolated: false, ingress: true, egress: false});
  static EGRESS = new ParticleDataflowType({isolated: false, ingress: false, egress: true});
  static INGRESS_AND_EGRESS = new ParticleDataflowType({isolated: false, ingress: true, egress: true});
}
