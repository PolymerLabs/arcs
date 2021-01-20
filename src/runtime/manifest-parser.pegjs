/**
 * @license
 * Copyright (c) 2017 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// WARNING: To ensure that the typechecking is valid the types and the list of
// checked parsers must be kept up to date.
// These can be found in src/runtime/manifest-ast-nodes.ts.
// Pegjs (with ts-pegjs) use these to transpile this file into TypeScript in
// src/gen/runtime/manifest-parser.ts and then into JavaScript in
// build/gen/runtime/manifest-parser.js.
//
// TODO(jopra): Remove this requirement (i.e. autogenerate the list of types).

{
  let indent = '';
  let startIndent = '';
  const indents: string[] = [];

  const emptyRef = () => ({kind: 'handle-ref', id: null, name: null, tags: [], location: location()}) as AstNode.HandleRef;

  const paxelModes: boolean[] = [false];

  function resetPaxelModes() {
    while(paxelModes.length) { paxelModes.pop(); }
    pushPaxelMode(false);
  }

  function isPaxelMode() {
    return paxelModes[paxelModes.length - 1];
  }

  function pushPaxelMode(mode) {
    paxelModes.push(mode);
  }

  function popPaxelMode() {
    paxelModes.pop();
  }

  function extractIndented(items) {
    return items[1].map(item => item[1]);
  }

  /**
   * Utility for extracting values out of comma-separated lists, of the form:
   * `items:(X (commaOrNewline X)*)?`.
   */
  function extractCommaSeparated(items) {
    if (items == null || items.length === 0) {
      return [];
    }
    const [first, rest] = items;
    return [first, ...rest.map(item => item[1])];
  }

  function optional<S, R>(result: S, extract: (source: S) => R, defaultValue: R): R {
    if (result !== null) {
      const value = extract(result);
      if (value !== null) {
        return value;
      }
    }
    return defaultValue === null ? null : defaultValue;
  }

  function checkNormal(result, path: string = '') {
    if (['string', 'number', 'bigint', 'boolean'].includes(typeof result) || result === null) {
      return;
    }
    if (result === undefined) {
      internalError(`Result was undefined at ${path}`);
    }
    if (Array.isArray(result)) {
      let i = 0;
      for (const item of result) {
        checkNormal(item, `${path}/${i}`);
        i++;
      }
      return;
    }
    if (result instanceof Map) {
      for (const [key, value] of result) {
        checkNormal(value, `${path}/${key}`);
      }
      return;
    }
    if (result.model) {
      internalError(`Unexpected 'model' in ${JSON.stringify(result)} at ${path}`);
    }

    if (!result.location) {
      internalError(`No 'location' in ${JSON.stringify(result)} at ${path}`);
    }
    if (!result.kind) {
      internalError(`No 'kind' in ${JSON.stringify(result)} at ${path}`);
    }
    if (result.kind === 'entity-inline') {
      return;
    }
    for (const key of Object.keys(result)) {
      if (['location', 'kind'].includes(key)) {
        continue;
      }
      checkNormal(result[key], `${path}/${key}`);
    }
  }

  function toAstNode<T extends {location: IFileRange} & Omit<T, 'location'>>(data: Omit<T, 'location'>): T {
    const loc = location();
    loc['text'] = text();
    return {...data, location: loc} as T;
  }

  function buildInterfaceArgument(name: string, direction: AstNode.Direction | AstNode.SlotDirection, isOptional: boolean, type: AstNode.ParticleHandleConnectionType) {
    if (direction === 'hosts') {
      error(`Interface cannot have arguments with a 'hosts' direction.`);
    }
    if (direction === 'consumes' || direction === 'provides') {
      let isSet = false;
      if (type && type.kind === 'collection-type') {
        isSet = true;
        type = type.type; // unwrap the inner type of the collection type;
      }
      if (type && type.kind === 'slot-type') {
        const slotType = type as AstNode.SlotType;
        slotType.fields.forEach(({name, value}) => {
          error(`interface slots do not currently support fields`);
        });
      } else if (type !== null) {
        error('cannot consume or provide non slot types');
      }
      return toAstNode<AstNode.InterfaceSlot>({
        kind: 'interface-slot',
        name,
        isRequired: !isOptional,
        direction,
        isSet,
      });
    }
    if (isOptional) {
      // TODO: Support interface optionality
      error('interface handles do not support optionality');
    }
    return toAstNode<AstNode.InterfaceArgument>({
      kind: 'interface-argument',
      direction,
      type,
      name: name || '*',
    });
  }

  function descapeString(parts: [string[], string, string][], tail: string[]): string {
    const converted = parts.map(([text, _slash, char]) => {
      switch (char) {
        case 't': char = '\t'; break;
        case 'n': char = '\n'; break;
        case 'b': char = '\b'; break;
        case 'r': char = '\r'; break;
        case '\\': char = '\\'; break;
        case '"': char = '"'; break;
        case "'": char = "'"; break;
      }
      return text.join('') + char;
    });
    return converted.join('') + tail.join('');
  }

  // Expected usage to parse a list of bracket-enclosed Things:
  // '[' multiLineSpace parts:(Thing whiteSpace? ',' multiLineSpace)* end:Thing? multiLineSpace ']'
  function combineMultiLine<T>(parts: [T, ...any[]][], end: T | null): T[] {
    const res = parts.map(p => p[0]);
    if (end != null) {
      res.push(end);
    }
    return res;
  }

  function internalError(message: string) {
    error(`Internal Parser Error: ${message}`);
  }
}

Manifest
  = eolWhiteSpace? Indent? items:(Annotation SameIndent ManifestItem)*
  {
    resetPaxelModes();
    const result: AstNode.ManifestItem[] = items.map(item => {
      const annotations = item[0];
      const manifestItem = item[2];
      manifestItem.annotationRefs = annotations.annotationRefs;
      return manifestItem;
    });
    checkNormal(result);
    return result;
  }

ManifestItem
  = RecipeNode
  / Particle
  / Import
  / Schema
  / SchemaAlias
  / ManifestStorage
  / Interface
  / Meta
  / Resource
  / AnnotationNode
  / Policy

Annotation = annotationRefs:(SameIndent AnnotationRef eolWhiteSpace)*
  {
    return toAstNode<AstNode.Annotation>({
      kind: 'annotation',
      annotationRefs: annotationRefs.map(aRef => aRef[1]),
    });
  }

Resource = 'resource' whiteSpace name:upperIdent eolWhiteSpace Indent SameIndent ResourceStart body:ResourceBody eolWhiteSpace? {
  return toAstNode<AstNode.Resource>({
    kind: 'resource',
    name,
    data: body
  });
}

ResourceStart = 'start' eol { startIndent = indent; }

ResourceBody = lines:(SameOrMoreIndent ResourceLine)+ {
  return lines.map(line => line[0].substring(startIndent.length) + line[1]).join('');
}

ResourceLine = [^\n]* eol { return text(); }

ManifestStorage
  = 'store' whiteSpace name:upperIdent whiteSpace 'of' whiteSpace type:ManifestStorageType id:(whiteSpace id)? originalId:('!!' id)?
    version:(whiteSpace Version)? tags:(whiteSpace TagList)? whiteSpace source:ManifestStorageSource eolWhiteSpace
    items:(Indent (SameIndent ManifestStorageItem)+)?
  {
    items = optional(items, extractIndented, []);
    let description: string | null = null;
    const claims: AstNode.ManifestStorageClaim[] = [];

    for (const item of items) {
      if (item[0] === 'description') {
        if (description) {
          error('You cannot provide more than one description.');
        }
        description = item[2];
      } else if (item['kind'] === 'manifest-storage-claim') {
        claims.push(item);
      } else {
        error(`Unknown ManifestStorageItem: ${item}`);
      }
    }

    return toAstNode<AstNode.ManifestStorage>({
      kind: 'store',
      name,
      type,
      id: optional(id, id => id[1], null),
      originalId: optional(originalId, originalId => originalId[1], null),
      version: optional(version, version => version[1], null),
      tags: optional(tags, tags => tags[1], null),
      source: source.source,
      origin: source.origin,
      storageKey: source.storageKey || null,
      entities: source.entities || null,
      description,
      claims,
    });
  }

ManifestStorageType
  = SchemaInline / SingletonType / CollectionType / BigCollectionType / TypeName

ManifestStorageSource
  = ManifestStorageFileSource / ManifestStorageResourceSource / ManifestStorageStorageSource / ManifestStorageInlineSource

ManifestStorageFileSource
  = 'in' whiteSpace source:id { return toAstNode<AstNode.ManifestStorageFileSource>({kind: 'manifest-storage-source', origin: 'file', source }); }

ManifestStorageResourceSource
  = 'in' whiteSpace source:upperIdent storageKey:(whiteSpace 'at' whiteSpace id)?
  {
    return toAstNode<AstNode.ManifestStorageResourceSource>({
      kind: 'manifest-storage-source',
      origin: 'resource',
      source,
      storageKey: optional(storageKey, sk => sk[3], null)
    });
  }

ManifestStorageStorageSource
  = 'at' whiteSpace source:id { return toAstNode<AstNode.ManifestStorageStorageSource>({kind: 'manifest-storage-source', origin: 'storage', source }); }

// TODO: allow a single entity to be declared without the outermost enclosing braces: store ... with {n: 3, t: 'a'}
ManifestStorageInlineSource
  = 'with' multiLineSpace '{' multiLineSpace parts:(ManifestStorageInlineEntity whiteSpace? ',' multiLineSpace)*
    end:ManifestStorageInlineEntity? multiLineSpace '}'
  {
    return toAstNode<AstNode.ManifestStorageInlineSource>({
      kind: 'manifest-storage-source',
      origin: 'inline',
      source: 'inline',
      entities: combineMultiLine(parts, end)
    });
  }

ManifestStorageInlineEntity
  = '{' multiLineSpace parts:(ManifestStorageInlineEntityField whiteSpace? ',' multiLineSpace)*
    end:ManifestStorageInlineEntityField? multiLineSpace '}'
  {
    return toAstNode<AstNode.ManifestStorageInlineEntity>({
      kind: 'entity-inline',
      fields: Object.assign({}, ...combineMultiLine(parts, end))
    });
  }

ManifestStorageInlineEntityField
  = name:fieldName whiteSpace? ':' multiLineSpace
    value:(ManifestStorageInlineValue / ManifestStorageInlineCollection / ManifestStorageInlineTuple)
  {
    return {[name]: value};
  }

ManifestStorageInlineValue
  = value:ManifestStorageInlineData
  {
    return {kind: 'entity-value', value};
  }

ManifestStorageInlineCollection
  = '[' multiLineSpace parts:(ManifestStorageInlineData whiteSpace? ',' multiLineSpace)*
    end:ManifestStorageInlineData? multiLineSpace ']'
  {
    const value = combineMultiLine(parts, end);
    if (value.length > 1) {
      const typeFor = v => v.constructor.name === 'Uint8Array' ? 'bytes' : typeof(v);
      const firstType = typeFor(value[0]);
      if (value.some(item => typeFor(item) !== firstType)) {
        error('Collection fields for inline entities must have a consistent value type');
      }
    }
    return {kind: 'entity-collection', value};
  }

ManifestStorageInlineTuple
  = '(' multiLineSpace parts:(ManifestStorageInlineData whiteSpace? ',' multiLineSpace)*
    end:ManifestStorageInlineData? multiLineSpace ')'
  {
    return {kind: 'entity-tuple', value: combineMultiLine(parts, end)};
  }

ManifestStorageInlineData
  = QuotedString
  / value: NumericValue {
    // TODO(cypher1): This should not discard type and unit information.
    return value.value;
  }
  / bool:('true'i / 'false'i)
  {
    return bool.toLowerCase() === 'true';
  }
  / '|' multiLineSpace parts:(HexByte whiteSpace? ',' multiLineSpace)* end:HexByte? multiLineSpace '|'
  {
    return new Uint8Array(combineMultiLine(parts, end));
  }
  / '<' multiLineSpace id:QuotedString whiteSpace? ',' multiLineSpace entityStorageKey:QuotedString multiLineSpace '>'
  {
    if (id.length === 0 || entityStorageKey.length === 0) {
      error('Reference fields for inline entities must have both an id and a storage key');
    }
    return {id, entityStorageKey};
  }

HexByte = [0-9a-f]i[0-9a-f]i?
  {
    return Number('0x' + text());
  }

ManifestStorageItem
  = ManifestStorageDescription
  / ManifestStorageClaim

ManifestStorageDescription
  = 'description' whiteSpace backquotedString eolWhiteSpace

ManifestStorageClaim
  = 'claim' whiteSpace field:('field' whiteSpace dottedFields whiteSpace)? 'is' whiteSpace tag:lowerIdent rest:(whiteSpace 'and' whiteSpace 'is' whiteSpace lowerIdent)* eolWhiteSpace
  {
    const fieldPath = field ? field[2].split('.') : [];
    return toAstNode<AstNode.ManifestStorageClaim>({
      kind: 'manifest-storage-claim',
      fieldPath,
      tags: [tag, ...rest.map(item => item[5])],
    });
  }

Import
  = 'import' whiteSpace path:id eolWhiteSpace
  {
    return toAstNode<AstNode.Import>({
      kind: 'import',
      path,
    });
  }

Interface "an interface"
  = 'interface' whiteSpace name:upperIdent typeVars:(whiteSpace? '<' whiteSpace? TypeVariableList whiteSpace? '>')? eolWhiteSpace items:(Indent (SameIndent InterfaceArgument)*)? eolWhiteSpace?
  {
    return toAstNode<AstNode.Interface>({
      kind: 'interface',
      name,
      args: optional(items, extractIndented, []).filter(item => item.kind === 'interface-argument'),
      slots: optional(items, extractIndented, []).filter(item => item.kind === 'interface-slot'),
    });
  }

// This rule is effectively capturing name? direction? '?'? type? &{name || direction || isOptional || type} but is
// split into multiple capture clauses because the combined one is able to match against an empty string (this would
// cause an infinite loop).
InterfaceArgument
  = name:NameWithColon direction:(Direction / SlotDirection)? isOptional:'?'? type:(whiteSpace? ParticleHandleConnectionType)? eolWhiteSpace
  { return buildInterfaceArgument(name, direction || 'any', isOptional, optional(type, t => t[1], null)); }
  / direction:(Direction / SlotDirection) isOptional:'?'? type:(whiteSpace? ParticleHandleConnectionType)? eolWhiteSpace
  { return buildInterfaceArgument(null, direction || 'any', isOptional, optional(type, t => t[1], null)); }
  / isOptional:'?'? type:(whiteSpace? ParticleHandleConnectionType) eolWhiteSpace
  { return buildInterfaceArgument(null, 'any', isOptional, type); }

Meta
  = 'meta' eolWhiteSpace items:(Indent (SameIndent MetaItem)*)? eolWhiteSpace?
{
  items = items ? extractIndented(items): [];
  return toAstNode<AstNode.Meta>({kind: 'meta', items: items});
}

MetaItem = MetaStorageKey / MetaName / MetaNamespace

MetaName = 'name' whiteSpace? ':' whiteSpace? name:id eolWhiteSpace
{
  return toAstNode<AstNode.MetaName>({ key: 'name', value: name, kind: 'name' });
}

MetaStorageKey = 'storageKey' whiteSpace? ':' whiteSpace? key:id eolWhiteSpace
{
  return toAstNode<AstNode.MetaStorageKey>({key: 'storageKey', value: key, kind: 'storage-key' });
};

MetaNamespace = 'namespace' whiteSpace? ':' whiteSpace? namespace:dottedName eolWhiteSpace
{
  return toAstNode<AstNode.MetaNamespace>({key: 'namespace', value: namespace, kind: 'namespace' });
};

Particle
  = external:('external' whiteSpace)? 'particle' whiteSpace name:upperIdent verbs:(whiteSpace VerbList)? implFile:(whiteSpace 'in' whiteSpace id)? eolWhiteSpace items:(Indent (SameIndent ParticleItem)*)? eolWhiteSpace?
  {
    const args: AstNode.ParticleHandleConnection[] = [];
    const modality: string[] = [];
    let slotConnections: AstNode.ParticleSlotConnection[] = [];
    const trustClaims: AstNode.ClaimStatement[] = [];
    const trustChecks: AstNode.CheckStatement[] = [];
    let description: AstNode.Description | null = null;
    let hasParticleHandleConnection = false;
    verbs = optional(verbs, parsedOutput => parsedOutput[1], []);
    external = !!external;
    implFile = optional(implFile, implFile => implFile[3], null);
    if (external && implFile) {
      error('Particles marked external cannot have an implementation file.');
    }
    items = optional(items, extractIndented, []);
    items.forEach(item => {
      if (item.kind === 'particle-interface') {
        if (/[A-Z]/.test(item.verb[0]) && item.verb !== name) {
          error(`Verb ${item.verb} must start with a lower case character or be same as particle name.`);
        }
        verbs.push(item.verb);
        args.push(...item.args);
        hasParticleHandleConnection = true;
      } else if (item.kind === 'particle-argument') {
        args.push(item);
      } else if (item.kind === 'particle-slot') {
        slotConnections.push(item);
      } else if (item.kind === 'description') {
        description = {
          kind: 'description',
          location: location() // TODO: FIXME Get the locations of the item descriptions.
        } as AstNode.Description;
        item.description.forEach(d => description[d.name] = d.pattern || d.patterns[0]);
      } else if (item.kind === 'claim') {
        trustClaims.push(item);
      } else if (item.kind === 'check') {
        trustChecks.push(item);
      } else if (item.modality) {
        modality.push(item.modality);
      } else {
        error(`Particle ${name} contains an unknown element: ${item.name} / ${item.kind}`);
      }
    });
    if (modality.length === 0) {
      // Add default modality
      modality.push('dom');
    }

    const buildHandleConnection = (slotConnection: AstNode.ParticleSlotConnection | AstNode.ParticleProvidedSlot, direction: AstNode.Direction) => {
      let type: AstNode.SlotType | AstNode.CollectionType = toAstNode<AstNode.SlotType>({kind: 'slot-type', fields: []});
      if (slotConnection.formFactor) {
        type.fields.push(toAstNode<AstNode.SlotField>({
          kind: 'slot-field',
          name: 'formFactor',
          value: slotConnection.formFactor.formFactor
        }));
      }
      if (direction === '`provides') {
        const provideConnection = slotConnection as AstNode.ParticleProvidedSlot;
        if (provideConnection.handles && provideConnection.handles.length > 0) {
          if (provideConnection.handles.length > 1) {
            throw new Error("Only a single handle name per dependent provide connection is supported by slandles");
          }
          type.fields.push(toAstNode<AstNode.SlotField>({
            kind: 'slot-field',
            name: 'handle',
            value: provideConnection.handles[0]
          }));
        }
      }
      if (slotConnection.isSet) {
        type = toAstNode<AstNode.CollectionType>({
          kind: 'collection-type',
          type: type
        });
      }
      return toAstNode<AstNode.ParticleHandleConnection>({
        kind: 'particle-argument',
        direction: direction,
        type,
        isOptional: !slotConnection.isRequired,
        dependentConnections: [],
        name: slotConnection.name,
        tags: slotConnection.tags,
        annotations: [],
        expression: null
      });
    };

    if (Flags.defaultToSlandles) {
      for (const slotConnection of slotConnections) {
          const handleConnection = buildHandleConnection(slotConnection, '`consumes');
          for (const provideSlotConnection of slotConnection.provideSlotConnections) {
            const dependentConnection = buildHandleConnection(provideSlotConnection, '`provides');
            handleConnection.dependentConnections.push(dependentConnection);
          }
          args.push(handleConnection);
      }
      slotConnections = [];
    }

    return  toAstNode<AstNode.Particle>({
      kind: 'particle',
      name,
      external,
      implFile,
      verbs,
      args,
      modality,
      slotConnections,
      description,
      hasParticleHandleConnection,
      trustClaims,
      trustChecks
    });
  }

ParticleItem "a particle item"
  = ParticleModality
  / ParticleSlotConnection
  / Description
  / ParticleHandleConnection
  / ClaimStatement
  / CheckStatement

ClaimStatement
  = 'claim' whiteSpace target:dottedFields whiteSpace expression:ClaimExpression eolWhiteSpace
  {
    const targetParts = target.split('.');
    const handle = targetParts[0];
    const fieldPath = targetParts.slice(1);
    return toAstNode<AstNode.ClaimStatement>({
      kind: 'claim',
      handle,
      fieldPath,
      expression,
    });
  }

ClaimExpression
  = first:Claim rest:(whiteSpace 'and' whiteSpace Claim)*
  {
    return [first, ...rest.map(item => item[3])] as AstNode.ClaimExpression;
  }

Claim
  = ClaimIsTag
  / ClaimDerivesFrom

ClaimIsTag
  = 'is' whiteSpace not:('not' whiteSpace)? tag:lowerIdent
  {
    return toAstNode<AstNode.ClaimIsTag>({
      kind: 'claim-is-tag',
      claimType: AstNode.ClaimType.IsTag,
      isNot: not != null,
      tag,
    });
  }

ClaimDerivesFrom
  = 'derives' whiteSpace 'from' whiteSpace target:dottedFields
  {
    const targetParts = target.split('.');
    const handle = targetParts[0];
    const fieldPath = targetParts.slice(1);
    return toAstNode<AstNode.ClaimDerivesFrom>({
      kind: 'claim-derives-from',
      claimType: AstNode.ClaimType.DerivesFrom,
      parentHandle: handle,
      fieldPath,
    });
  }

CheckStatement
  = 'check' whiteSpace target:CheckTarget whiteSpace expression:CheckExpressionBody eolWhiteSpace
  {
    return toAstNode<AstNode.CheckStatement>({
      kind: 'check',
      target,
      expression,
    });
  }

CheckTarget
  = target:dottedFields isSlot:(whiteSpace 'data')?
  {
    const targetParts = target.split('.');
    const name = targetParts[0];
    const fieldPath = targetParts.slice(1);
    if (isSlot && fieldPath.length) {
      error('Checks on slots cannot specify a field');
    }
    return toAstNode<AstNode.CheckTarget>({
      kind: 'check-target',
      targetType: isSlot ? 'slot' : 'handle',
      name,
      fieldPath,
    });
  }

// A series of check conditions using `and`/`or` operations (doesn't need to be surrounded by parentheses).
CheckExpressionBody
  = left:CheckExpression rest:(whiteSpace ('or'/'and') whiteSpace CheckExpression)*
  {
    if (rest.length === 0) {
      return left;
    }
    const operators: Set<string> = new Set(rest.map(item => item[1]));
    if (operators.size > 1) {
      expected(`You cannot combine 'and' and 'or' operations in a single check expression. You must nest them inside parentheses.`);
    }
    const operator = rest[0][1];
    return toAstNode<AstNode.CheckBooleanExpression>({
      kind: 'check-boolean-expression',
      operator,
      children: [left, ...rest.map(item => item[3])],
    });
  }

// Can be either a single check condition, or a series of conditions using `and`/`or` operations surrounded by parentheses.
CheckExpression
  = condition:CheckCondition { return condition; }
  / '(' whiteSpace? condition:CheckExpressionBody whiteSpace? ')' { return condition; }

CheckCondition
  = CheckImplication
  / CheckIsFromHandle
  / CheckIsFromStore
  / CheckIsFromOutput
  / CheckHasTag

CheckImplication
  = '(' whiteSpace? antecedent:CheckExpression whiteSpace? '=>' whiteSpace? consequent:CheckExpression whiteSpace? ')'
  {
    return toAstNode<AstNode.CheckImplication>({
      kind: 'check-implication',
      checkType: AstNode.CheckType.Implication,
      antecedent,
      consequent,
    });
  }

CheckHasTag
  = 'is' whiteSpace isNot:('not' whiteSpace)? tag:lowerIdent
  {
    return toAstNode<AstNode.CheckHasTag>({
      kind: 'check-has-tag',
      checkType: AstNode.CheckType.HasTag,
      isNot: !!isNot,
      tag,
    });
  }

CheckIsFromHandle
  = 'is' isNot:(whiteSpace 'not')? whiteSpace 'from' whiteSpace 'handle' whiteSpace parentHandle:lowerIdent
  {
    return toAstNode<AstNode.CheckIsFromHandle>({
      kind: 'check-is-from-handle',
      checkType: AstNode.CheckType.IsFromHandle,
      isNot: !!isNot,
      parentHandle,
    });
  }

CheckIsFromOutput
  = 'is' isNot:(whiteSpace 'not')? whiteSpace 'from' whiteSpace 'output' whiteSpace output:lowerIdent
  {
    return toAstNode<AstNode.CheckIsFromOutput>({
      kind: 'check-is-from-output',
      checkType: AstNode.CheckType.IsFromOutput,
      isNot: !!isNot,
      output,
    });
  }

CheckIsFromStore
  = 'is' isNot:(whiteSpace 'not')? whiteSpace 'from' whiteSpace 'store' whiteSpace storeRef:StoreReference
  {
    return toAstNode<AstNode.CheckIsFromStore>({
      kind: 'check-is-from-store',
      checkType: AstNode.CheckType.IsFromStore,
      isNot: !!isNot,
      storeRef,
    });
  }

StoreReference
  = name:upperIdent { return toAstNode<AstNode.StoreReference>({kind: 'store-reference', type: 'name', store: name}); }
  / id:id { return toAstNode<AstNode.StoreReference>({kind: 'store-reference', type: 'id', store: id}); }

ParticleHandleConnection
  = arg:ParticleHandleConnectionBody eolWhiteSpace dependentConnections:(Indent (SameIndent ParticleHandleConnection)*)?
  {
    arg.dependentConnections = optional(dependentConnections, extractIndented, []);
    return arg;
  }

NameWithColon
  = &(unsafeLowerIdent whiteSpace? ':') name:lowerIdent whiteSpace? ':' whiteSpace?
  {
    return name;
  }

PaxelMode
  = '=' {
    pushPaxelMode(true);
    return text();
  }

ParticleHandleConnectionBody
  = name:NameWithColon? direction:(Direction '?'?)? whiteSpace type:ParticleHandleConnectionType annotations:SpaceAnnotationRefList? maybeTags:SpaceTagList? expression:(whiteSpace? PaxelMode multiLineSpace PaxelExpression)?
  {
    if (expression) {
      popPaxelMode();
    }

    return toAstNode<AstNode.ParticleHandleConnection>({
      kind: 'particle-argument',
      direction: optional(direction, d => d[0], 'any'),
      type,
      isOptional: optional(direction, d => !!d[1], false),
      dependentConnections: [],
      name: name || (maybeTags && maybeTags[0]) || expected(`either a name or tags to be supplied ${name} ${maybeTags}`),
      tags: maybeTags || [],
      annotations: annotations || [],
      expression: optional(expression, e => e[3], null)
    });
  }

Direction "a direction (e.g. reads writes, reads, writes, hosts, `consumes, `provides, any')"
  = (('reads' ('?'?) ' writes') / 'reads' / 'writes' / 'hosts' / '`consumes' / '`provides') &([^a-zA-Z0-9] / !.)
  {
    // TODO(jopra): Parse optionality properly.
    let dir = text();
    if (dir === 'reads? writes') {
      // Fix for faking proper capability set support with optionality.
      dir = 'reads writes';
    }
    return dir as AstNode.Direction;
  }

ParticleHandleConnectionType
  = TypeVariable
  / SingletonType
  / CollectionType
  / BigCollectionType
  / ReferenceType
  / MuxType
  / SlotType
  / TupleType
  / type: SchemaInline whiteSpace? refinement:Refinement?
  {
    type.refinement = refinement;
    return type;
  }
  / TypeName

SingletonType
 = '![' type:ParticleHandleConnectionType ']'
 {
   return toAstNode<AstNode.SingletonType>({
     kind: 'singleton-type',
     type
   });
 }

CollectionType
  = '[' type:ParticleHandleConnectionType ']'
  {
    return toAstNode<AstNode.CollectionType>({
      kind: 'collection-type',
      type,
    });
  }

BigCollectionType
  = 'BigCollection<' type:ParticleHandleConnectionType '>'
  {
    return toAstNode<AstNode.BigCollectionType>({
      kind: 'big-collection-type',
      type,
    });
  }

ReferenceType
  = '&' type:ParticleHandleConnectionType
  {
    return toAstNode<AstNode.ReferenceType>({
      kind: 'reference-type',
      type,
    });
  }

MuxType
  = '#' type:ParticleHandleConnectionType
  {
    return toAstNode<AstNode.MuxType>({
      kind: 'mux-type',
      type,
    });
  }

TupleType  "a tuple of types (e.g. (A, &B, [C]))"
  = '(' multiLineSpace first:ParticleHandleConnectionType rest:(multiLineSpace ',' multiLineSpace ParticleHandleConnectionType)* multiLineSpace ',' ? multiLineSpace ')'
  {
    return toAstNode<AstNode.TupleType>({
      kind: 'tuple-type',
      types: [first].concat(rest.map(t => t[3])),
    });
  }

TypeVariable "a type variable (e.g. ~foo)"
  = '~' name:lowerIdent constraint:(whiteSpace 'with' whiteSpace type:ParticleHandleConnectionType)?
  {
    return toAstNode<AstNode.TypeVariable>({
      kind: 'variable-type',
      name,
      constraint: optional(constraint, constraint => constraint[3], null),
    });
  }

SlotType
  = 'Slot' &(!. / [^a-z0-9_]i) fields:(whiteSpace? '{' (SlotField (',' whiteSpace SlotField)*)? '}')?
{
  fields = optional(fields, fields => {
    const data = fields[2];
    if (data) {
      return [data[0]].concat(data[1].map(tail => tail[2]));
    } else {
      return [];
    }
  }, []);

  // TODO(jopra): Check for duplicate field names.

  return toAstNode<AstNode.SlotType>({
    kind: 'slot-type',
    fields,
  });
}

SlotField
  = name:fieldName whiteSpace? ':' whiteSpace? value:lowerIdent
{
  return toAstNode<AstNode.SlotField>({
    kind: 'slot-field',
    name,
    value
  });
}

TypeName
  = name:upperIdent
  {
    return toAstNode<AstNode.TypeName>({
      kind: 'type-name',
      name,
    });
  }

TypeVariableList
  = head:TypeVariable tail:(',' multiLineSpace TypeVariable)*
  {
    return [head, ...tail.map(a => a[2])];
  }

ParticleModality
  = 'modality' whiteSpace modality:fieldName eolWhiteSpace
  {
    return toAstNode<AstNode.ParticleModality>({
      kind: 'particle-modality',
      modality,
    });
  }

SlandleType = whiteSpace type:ParticleHandleConnectionType {
    let isSet = false;
    if (type.kind === 'collection-type') {
      isSet = true;
      type = type.type;
    }
    if (type.kind !== 'slot-type') {
      expected('a slot type');
    }
    type.isSet = isSet;
    return type;
  }

ParticleSlotConnection
  = name:NameWithColon? 'consumes' isOptional:'?'? type:SlandleType? maybeTags:SpaceTagList? eolWhiteSpace
    items:(Indent (SameIndent ParticleProvidedSlot)*)?
  {
    const provideSlotConnections: AstNode.ParticleProvidedSlot[] = [];
    items = optional(items, extractIndented, []);
    items.forEach(item => {
      if (item.kind === 'provided-slot') {
        provideSlotConnections.push(item);
      } else {
        error('Unsupported particle slot item ', item);
      }
    });
    let formFactor: AstNode.SlotFormFactor|null = null;
    let isSet = false;
    if (type) {
      isSet = type.isSet;
      type.fields.forEach(({name, value}) => {
        if (name === 'formFactor') {
          if (!formFactor) {
            formFactor = value;
          } else {
            error('duplicate form factor for a slot');
          }
        } else {
          error(`unknown slot field named ${name} with value ${value}`);
        }
      });
    }

    return toAstNode<AstNode.ParticleSlotConnection>({
      kind: 'particle-slot',
      name,
      tags: maybeTags || [],
      isRequired: !isOptional,
      isSet,
      formFactor,
      provideSlotConnections
    });
  }

ParticleProvidedSlot
  = name:NameWithColon? 'provides' isOptional:'?'? type:SlandleType? maybeTags:SpaceTagList? eolWhiteSpace?
  {
    const provideSlotConnections: AstNode.ParticleProvidedSlot[] = [];
    let formFactor: AstNode.SlotFormFactor|null = null;
    const handles: string[] = [];
    let isSet = false;
    if (type) {
      isSet = type.isSet;
      type.fields.forEach(({name, value}) => {
        if (name === 'formFactor') {
          if (!formFactor) {
            formFactor = value;
          } else {
            error('duplicate form factor for a slot');
          }
        } else if (name === 'handle') {
          handles.push(value);
        } else {
          error(`unknown slot field named ${name} with value ${value}`);
        }
      });
    }

    return toAstNode<AstNode.ParticleProvidedSlot>({
      kind: 'provided-slot',
      name,
      tags: maybeTags || [],
      isRequired: !isOptional,
      isSet,
      formFactor,
      handles
    });
  }

Description
  = 'description' whiteSpace pattern:backquotedString eolWhiteSpace? handleDescriptions:(Indent (SameIndent ParticleHandleDescription)+)?
  {
    handleDescriptions = optional(handleDescriptions, extractIndented, []);
    const patterns = [];
    if (pattern) {
      patterns.push(pattern);
    }
    handleDescriptions.filter(desc => desc.name === 'pattern').forEach(p => patterns.push(p));
    handleDescriptions = handleDescriptions.filter(desc => desc.name !== 'pattern');
    return {
      kind: 'description',
      location: location(),
      description: [
        {
          // TODO: this should be stored in a different field.
          // TODO: FIXME
          kind: 'default-description?',
          location: location(),
          name: 'pattern',
          patterns: patterns,
        },
        ...handleDescriptions,
      ],
    } as AstNode.Description;
  }

ParticleHandleDescription
  = name:lowerIdent whiteSpace pattern:backquotedString eolWhiteSpace
  {
    return toAstNode<AstNode.ParticleHandleDescription>({
      kind: 'handle-description',
      name,
      pattern,
    });
  }

AnnotationNode
  = 'annotation' whiteSpace name:lowerIdent params:('(' whiteSpace? first:AnnotationParam rest:(whiteSpace? ',' whiteSpace? AnnotationParam)* whiteSpace? ')')? eolWhiteSpace items:(Indent (SameIndent AnnotationNodeItem)*)?
  {
    const targets = optional(items, extractIndented, []).find(item => item.kind === 'annotation-targets');
    const multiple = optional(items, extractIndented, []).find(item => item.kind === 'annotation-multiple');
    return toAstNode<AstNode.AnnotationNode>({
        kind: 'annotation-node',
        name,
        params: optional(params, params => [params[2], ...(params[3].map(item => item[3]))], []),
        targets: targets ? targets.targets : [],
        retention: optional(items, extractIndented, []).find(item => item.kind === 'annotation-retention').retention,
        allowMultiple: multiple ? multiple.allowMultiple : false,
        doc: optional(optional(items, extractIndented, []).find(item => item.kind === 'annotation-doc'), d => d.doc, '')
    });
  }

// TODO: reuse SchemaInlineField? allow more types?
AnnotationParam = name:fieldName ':' whiteSpace? type:SchemaPrimitiveType {
  return toAstNode<AstNode.AnnotationParam>({
    kind: 'annotation-param',
    name,
    type: type.type
  });
}

AnnotationNodeItem
  = AnnotationTargets
  / AnnotationRetention
  / AnnotationMultiple
  / AnnotationDoc

AnnotationTargetValue
  = 'Recipe'
  / 'Particle'
  / 'HandleConnection'
  / 'Store'
  / 'Handle'
  / 'SchemaField'
  / 'Schema'
  / 'PolicyField'
  / 'PolicyTarget'
  / 'Policy'

AnnotationTargets = 'targets:'  whiteSpace '[' whiteSpace? targets:(AnnotationTargetValue (',' whiteSpace? AnnotationTargetValue)*) whiteSpace? ']' eolWhiteSpace? {
  return toAstNode<AstNode.AnnotationTargets>({
    kind: 'annotation-targets',
    targets: optional(targets, t => [t[0], ...t[1].map(tail => tail[2])], [])
  });
}

AnnotationRetentionValue = 'Source' / 'Runtime'

AnnotationRetention = 'retention:' whiteSpace retention:AnnotationRetentionValue eolWhiteSpace? {
  return toAstNode<AstNode.AnnotationRetention>({
    kind: 'annotation-retention',
    retention
  });
}

AnnotationMultiple = 'allowMultiple:' whiteSpace bool:('true'i / 'false'i) eolWhiteSpace? {
  return toAstNode<AstNode.AnnotationMultiple>({
    kind: 'annotation-multiple',
    allowMultiple: bool.toLowerCase() === 'true'
  });
}

AnnotationDoc = 'doc:' whiteSpace doc:QuotedString eolWhiteSpace? {
  return toAstNode<AstNode.AnnotationDoc>({
    kind: 'annotation-doc',
    doc
  });
}

// Reference to an annotation (for example: `@foo(bar='hello', baz=5)`)
AnnotationRef = '@' name:lowerIdent params:(whiteSpace? '(' whiteSpace? AnnotationRefParam whiteSpace? (whiteSpace? ',' whiteSpace? AnnotationRefParam)* ')')? {
  return toAstNode<AstNode.AnnotationRef>({
    kind: 'annotation-ref',
    name,
    params: optional(params, p => [p[3], ...p[5].map(tail => tail[3])], [])
  });
}

AnnotationRefParam
  = AnnotationRefNamedParam
  / AnnotationRefSimpleParam

AnnotationRefNamedParam = name:lowerIdent whiteSpace? ':' whiteSpace? value:AnnotationRefSimpleParam {
  return toAstNode<AstNode.AnnotationRefNamedParam>({
    kind: 'annotation-named-param',
    name,
    value: value.value
  });
}

AnnotationRefSimpleParam = value:ManifestStorageInlineData {
  return toAstNode<AstNode.AnnotationRefSimpleParam>({
    kind: 'annotation-simple-param',
    value
  });
}

AnnotationRefList
  = head:AnnotationRef tail:SpaceAnnotationRefList?
  { return [head, ...(tail || [])]; }

SpaceAnnotationRefList
  = whiteSpace tags:AnnotationRefList
  { return tags; }

RecipeNode
  = 'recipe' name:(whiteSpace upperIdent)? verbs:(whiteSpace VerbList)? eolWhiteSpace items:(Indent (SameIndent RecipeItem)*)?
  {
    verbs = optional(verbs, parsedOutput => parsedOutput[1], []);
    return toAstNode<AstNode.RecipeNode>({
      kind: 'recipe',
      name: optional(name, name => name[1], null),
      verbs,
      items: optional(items, extractIndented, []),
    });
  }

// RequireHandleSection is intended to replace RecipeHandle but for now we allow for both ways to create a handle.
RecipeItem
  = RecipeParticle
  / RecipeHandle
  / RecipeSyntheticHandle
  / RequireHandleSection
  / RecipeRequire
  / RecipeSlot
  / RecipeSearch
  / RecipeConnection
  / Description

LocalName
  = 'as' whiteSpace name:(lowerIdent / [a-zA-Z0-9]* { expected(`lower identifier`); })
  {
    return name;
  }

TopLevelAlias
  = 'as' whiteSpace name:upperIdent
  {
    return name;
  }

RecipeParticle
  = ref:(ParticleRef / '*') name:(whiteSpace LocalName)? eolWhiteSpace connections:(Indent (SameIndent RecipeParticleConnection)*)?
  {
    const handleConnections: AstNode.RecipeParticleConnection[]  = [];
    const slotConnections: AstNode.RecipeParticleSlotConnection[] = [];
    if (connections) {
      connections = extractIndented(connections);
      for (const conn of connections) {
        if (conn.kind === 'handle-connection') {
          handleConnections.push(conn);
        } else {
          slotConnections.push(conn);
        }
      }
    }
    return toAstNode<AstNode.RecipeParticle>({
      kind: 'recipe-particle',
      name: optional(name, name => name[1], null),
      ref,
      connections: handleConnections,
      slotConnections: slotConnections,
    });
  }

RecipeParticleConnection
  = param:NameWithColon? direction:((SlotDirection / Direction) whiteSpace?) relaxed:('someof' whiteSpace)? target:ParticleConnectionTargetComponents? eolWhiteSpace dependentConnections:(Indent (SameIndent RecipeParticleConnection)*)?
  {
    direction = optional(direction, d => d[0], null);
    target = optional(target, t => t, toAstNode<AstNode.ParticleConnectionTargetComponents>({
      kind: 'handle-connection-components',
      name: null,
      particle: null,
      tags: []
      }
    ));
    if (Flags.defaultToSlandles) {
      if (direction === 'consumes') {
        direction = '`consumes';
      } else if (direction === 'provides') {
        direction = '`provides';
      }
    }
    if (!Flags.useSlandles && (direction === 'consumes' || direction === 'provides')) {
      // RecipeParticleSlotConnection
      return toAstNode<AstNode.RecipeParticleSlotConnection>({
        kind: 'slot-connection',
        param: param || '*',
        direction,
        target,
        dependentSlotConnections: optional(dependentConnections, extractIndented, []),
      });
    }
    // RecipeParticleConnection
    return toAstNode<AstNode.RecipeParticleConnection>({
      kind: 'handle-connection',
      param: param || '*',
      direction,
      relaxed: !!relaxed,
      target,
      dependentConnections: optional(dependentConnections, extractIndented, []),
    });
  }
  / param:NameWithColon? relaxed:('someof' whiteSpace)? target:ParticleConnectionTargetComponents eolWhiteSpace dependentConnections:(Indent (SameIndent RecipeParticleConnection)*)?
  {
    return toAstNode<AstNode.RecipeParticleConnection>({
      kind: 'handle-connection',
      param: param || '*',
      direction: 'any',
      relaxed: !!relaxed,
      target,
      dependentConnections: optional(dependentConnections, extractIndented, []),
    });
  }

ParticleConnectionTargetComponents "a particle connection target"
  = param:(upperIdent / lowerIdent) tags:(whiteSpace TagList)?
  {
    param = optional(param, param => param, null);
    let name: string|null = null;
    let particle = null;
    if (param) {
      if (param[0].toUpperCase() === param[0]) {
        particle = param;
      } else {
        name = param;
      }
    }

    return toAstNode<AstNode.ParticleConnectionTargetComponents>({
      kind: 'handle-connection-components',
      name,
      particle,
      tags: optional(tags, t => t[1], []),
    });
  }
  / tags:TagList
  {
    return toAstNode<AstNode.ParticleConnectionTargetComponents>({
      kind: 'handle-connection-components',
      name: null,
      particle: null,
      tags
    });
  }

SlotDirection
  = 'provides' / 'consumes'

RecipeConnection
  = from:ConnectionTargetWithColon? direction:(Direction whiteSpace)? relaxed:('someof' whiteSpace)? to:ConnectionTarget eolWhiteSpace
  {
    const anyTarget = toAstNode<AstNode.NameConnectionTarget>({
      kind: 'connection-target',
      targetType: 'localName',
      name: null,
      param: '*',
      tags: [],
    });
    return toAstNode<AstNode.RecipeConnection>({
      kind: 'connection',
      direction: optional(direction, d => d[0], 'any'),
      relaxed: !!relaxed,
      from: from || anyTarget,
      to,
    });
  }

ConnectionTargetWithColon
  = target:ConnectionTarget ':' whiteSpace?
  {
    return target;
  }

RecipeSearch
  = 'search' whiteSpace phrase:backquotedString eolWhiteSpace tokens:(Indent (SameIndent 'tokens' t:(whiteSpace backquotedString)+ eolWhiteSpace))?

  {
    return toAstNode<AstNode.RecipeSearch>({
      kind: 'search',
      phrase,
      tokens: optional(tokens, tokens => tokens[1][2].map(t => t[1]), null)
    });
  }

ConnectionTarget
  = VerbConnectionTarget / TagConnectionTarget / ParticleConnectionTarget / NameConnectionTarget

VerbConnectionTarget
  = verbs:VerbList components:ConnectionTargetHandleComponents?
  {
    const {param, tags} = components || {param: null, tags: []};
    return toAstNode<AstNode.VerbConnectionTarget>({
      kind: 'connection-target',
      targetType: 'verb',
      verbs,
      param,
      tags
    });
  }

TagConnectionTarget
  = tags:TagList {
    return toAstNode<AstNode.TagConnectionTarget>({
      kind: 'connection-target',
      targetType: 'tag',
      tags
    });
  }

NameConnectionTarget
  = name:lowerIdent components:ConnectionTargetHandleComponents?
  {
    const {param, tags} = components || {param: null, tags: []};
    return toAstNode<AstNode.NameConnectionTarget>({
      kind: 'connection-target',
      targetType: 'localName',
      name,
      param,
      tags
    });
  }

ParticleConnectionTarget
  = particle:upperIdent components:ConnectionTargetHandleComponents?
  {
    const {param, tags} = components || {param: null, tags: []};
    return toAstNode<AstNode.ParticleConnectionTarget>({
      kind: 'connection-target',
      targetType: 'particle',
      particle,
      param,
      tags
    });
  }

ConnectionTargetHandleComponents
  = '.' param:lowerIdent? tags:(whiteSpace? TagList)?
  {
    return toAstNode<AstNode.ConnectionTargetHandleComponents>({
      kind: 'connection-target-handle-components',
      param: optional(param, param => param, null),
      tags: optional(tags, tags => tags[1], []),
    });
  }

RecipeHandleFate
  = '?'
  / 'use'
  / 'map'
  / 'create'
  / 'copy'
  / '`slot'

RecipeHandle
  = name:NameWithColon? fate:RecipeHandleFate ref:(whiteSpace HandleRef)? annotations:SpaceAnnotationRefList? whiteSpace? eolWhiteSpace
  {
    return toAstNode<AstNode.RecipeHandle>({
      kind: 'handle',
      name,
      ref: optional(ref, ref => ref[1], emptyRef()) as AstNode.HandleRef,
      fate,
      annotations: annotations || []
    });
  }

RecipeSyntheticHandle
  = name:NameWithColon? 'join' whiteSpace '(' whiteSpace? first:lowerIdent rest:(whiteSpace? ',' whiteSpace? lowerIdent)* ')' whiteSpace? eolWhiteSpace
  {
    return toAstNode<AstNode.RecipeSyntheticHandle>({
      kind: 'synthetic-handle',
      name,
      associations: [first].concat(rest.map(t => t[3])),
    });
  }

RecipeRequire
  = 'require' eolWhiteSpace items:(Indent (SameIndent (RecipeParticle / RequireHandleSection / RecipeSlot))*)?
  {
    return toAstNode<AstNode.RecipeRequire>({
      kind: 'require',
      items: extractIndented(items),
    });
  }

RequireHandleSection
  = 'handle' name:(whiteSpace LocalName)? ref:(whiteSpace HandleRef)? eolWhiteSpace
  {
    return toAstNode<AstNode.RequireHandleSection>({
      kind: 'require-handle',
      name: optional(name, name => name[1], null),
      ref: optional(ref, ref => ref[1], emptyRef()) as AstNode.HandleRef,
    });
  }

Tag
  = '#' tag:simpleName {return tag;}

TagList
  = head:Tag tail:(whiteSpace TagList)?
  { return [head, ...(tail && tail[1] || [])]; }

Verb "a verb (e.g. &Verb)"
  = '&' verb:simpleName {return verb;}

VerbList
  = head:Verb tail:(whiteSpace VerbList)?
  { return [head, ...(tail && tail[1] || [])]; }


SpaceTagList
  = whiteSpace tags:TagList
  { return tags; }

// Allow for an optional name followed by a TagList
// - If name is not specified the first tag is used for the name
// - Syntax error if no name or taglist are provided.
NameAndTagList
   = name:lowerIdent tags:(whiteSpace TagList)?
   {
     return toAstNode<AstNode.NameAndTagList>({
       kind: 'name-and-tag-list',
       name: name,
       tags: tags = optional(tags, list => list[1], [])
     });
   }
   / whiteSpace name:lowerIdent
   {
     // TODO(jopra): Likely covered by previous case.
     return toAstNode<AstNode.NameAndTagList>({
       kind: 'name-and-tag-list',
       name: name,
       tags: []
     });
   }
   / whiteSpace tags:TagList
   {
      return toAstNode<AstNode.NameAndTagList>({
       kind: 'name-and-tag-list',
        name: tags[0],
        tags: tags
      });
   }

ParticleRef
  = name:upperIdent
  {
    return toAstNode<AstNode.ParticleRef>({
      kind: 'particle-ref',
      name,
      verbs: [],
      tags: []
    });
  }
  / verb:Verb
  {
    return toAstNode<AstNode.ParticleRef>({
      kind: 'particle-ref',
      verbs: [verb],
      tags: []
    });
  }

HandleRef
  = id:id tags:SpaceTagList?
  {
    return toAstNode<AstNode.HandleRef>({
      kind: 'handle-ref',
      id,
      tags: tags || [],
    });
  }
  / name:upperIdent tags:SpaceTagList?
  {
    return toAstNode<AstNode.HandleRef>({
      kind: 'handle-ref',
      name,
      tags: tags || [],
    });
  }
  / '*' tags:SpaceTagList?
  {
    return toAstNode<AstNode.HandleRef>({
      kind: 'handle-ref',
      tags: tags || [],
    });
  }
  / tags:TagList
  {
    return toAstNode<AstNode.HandleRef>({
      kind: 'handle-ref',
      tags,
    });
  }

RecipeSlot
  = name:NameWithColon? 'slot' ref:(whiteSpace HandleRef)? eolWhiteSpace
  {
    if (Flags.defaultToSlandles) {
      return toAstNode<AstNode.RecipeHandle>({
        kind: 'handle',
        name,
        ref: optional(ref, ref => ref[1], emptyRef()) as AstNode.HandleRef,
        fate: '`slot',
        annotations: []
      });
    }

    return toAstNode<AstNode.RecipeSlot>({
      kind: 'slot',
      ref: optional(ref, ref => ref[1], emptyRef()) as AstNode.HandleRef,
      name,
    });
  }

SchemaInline
  = names:((upperIdent / '*') whiteSpace?)* openBrace fields:(SchemaInlineField commaOrNewline?)* closeBrace
  {
    return toAstNode<AstNode.SchemaInline>({
      kind: AstNode.SchemaFieldKind.Inline,
      names: optional(names, names => names.map(name => name[0]).filter(name => name !== '*'), ['*']),
      fields: optional(fields, fields => fields.map(x => x[0]), [])
    });
  }

SchemaInlineField
  = name:fieldName type:(':' whiteSpace? SchemaType)?
  {
    if (type) {
      type = optional(type, ty => ty[2], null);
    }
    return toAstNode<AstNode.SchemaInlineField>({
      kind: AstNode.SchemaFieldKind.InlineField,
      name,
      type
    });
  }
  / '*'
  {
    return toAstNode<AstNode.SchemaInlineField>({
      kind: AstNode.SchemaFieldKind.InlineField,
      name: '*',
      type: null,
    });
  }

SchemaSpec
  = 'schema' names:(whiteSpace ('*' / upperIdent))+ parents:SchemaExtends?
  {
    return toAstNode<AstNode.SchemaSpec>({
      kind: 'schema',
      names: names.map(name => name[1]).filter(name => name !== '*'),
      parents: optional(parents, parents => parents, []),
    });
  }

SchemaBody
  = (openBrace items:(SchemaItem commaOrNewline?)* closeBrace multiLineSpace?
  {
    return items.map(item => item[0]);
  })
  / (eolWhiteSpace items:(Indent (SameIndent SchemaItem eolWhiteSpace?)*)?
  {
    return optional(items, extractIndented, []);
  })

SchemaAlias
  = 'alias' whiteSpace spec:SchemaSpec whiteSpace alias:TopLevelAlias items:SchemaBody
  {
    return toAstNode<AstNode.SchemaAlias>({
      ...spec,
      kind: 'schema',
      items,
      alias
    });
  }

Schema
  = spec:SchemaSpec items:SchemaBody
  {
    return toAstNode<AstNode.Schema>({
      ...spec,
      kind: 'schema',
      items,
    });
  }

SchemaExtends
  = whiteSpace 'extends' whiteSpace first:upperIdent rest:(whiteSpace? ',' whiteSpace upperIdent)*
{
  return [first, ...(rest.map(item => item[3]))] as string[];
}

SchemaItem
  = Description
  / SchemaField

SchemaField
  = field:SchemaInlineField
  {
    if (!field.type) {
      expected('a type (required for schema fields)');
    }
    field.kind = 'schema-field';
    return toAstNode<AstNode.SchemaField>(field);
  }

SchemaType
  = type:(SchemaReferenceType
  / SchemaCollectionType
  / SchemaOrderedListType
  / SchemaPrimitiveType
  / KotlinPrimitiveType
  / SchemaUnionType
  / SchemaTupleType
  / NestedSchemaType
  / [^\n\]}]* { expected('a schema type'); }
  ) whiteSpace? refinement:Refinement? whiteSpace? annotations:AnnotationRefList?
  {
    if (!Flags.fieldRefinementsAllowed && refinement) {
      error('field refinements are unsupported');
    }
    type.refinement = refinement;
    type.annotations = annotations || [];
    return type;
  }

SchemaCollectionType = '[' whiteSpace? schema:SchemaType whiteSpace? ']'
  {
    return toAstNode<AstNode.SchemaCollectionType>({
      kind: AstNode.SchemaFieldKind.Collection,
      schema,
      refinement: null
    });
  }

SchemaOrderedListType = 'List<' whiteSpace? schema:(SchemaType) whiteSpace? '>'
  {
    return toAstNode<AstNode.SchemaOrderedListType>({
      kind: AstNode.SchemaFieldKind.OrderedList,
      schema
    });
  }

SchemaReferenceType = '&' whiteSpace? schema:(SchemaInline / TypeName)
  {
    return toAstNode<AstNode.SchemaReferenceType>({
      kind: AstNode.SchemaFieldKind.Reference,
      schema
    });
  }

SchemaPrimitiveType
  = type:('Text' / 'URL' / 'Number' / 'BigInt' / 'Boolean' / 'Bytes' / 'Instant' / 'Duration')
  {
    return toAstNode<AstNode.SchemaPrimitiveType>({
      kind: AstNode.SchemaFieldKind.Primitive,
      type,
      refinement: null,
      annotations: [],
    });
  }

NestedSchemaType = 'inline' whiteSpace? schema:(SchemaInline / TypeName)
  {
    return toAstNode<AstNode.NestedSchema>({
      kind: AstNode.SchemaFieldKind.Nested,
      schema
    });
  }

QualifiedExpression
  = FromExpression / WhereExpression / LetExpression / SelectExpression

ExpressionWithQualifier
  = qualifier:QualifiedExpression rest:(multiLineSpace rest:QualifiedExpression)* {
    const result = [qualifier, ...rest.map(x => x[1])];
    for (let i = result.length - 1; i > 0; i--) {
      result[i].qualifier = result[i-1];
    }

    for (let i = result.length - 2; i > 0; i--) {
      if (result[i].kind === 'paxel-select') {
        error('Paxel expressions cannot have non-trailing \'select\'');
      }
    }

    if (qualifier.kind !== 'paxel-from') {
      error('Paxel expressions must begin with \'from\'');
    }

    const select = result.pop();
    if (select.kind !== 'paxel-select') {
      error('Paxel expressions must end with \'select\'');
    }
    return select;
  }

PaxelExpression
  = expr:(NewExpression / ExpressionWithQualifier / RefinementExpression) {
    // Attaches entire expression text to the top level paxel expression node.
    expr.unparsedPaxelExpression = text();
    return expr;
  }

SourceExpression "a scope lookup or a sub-expression,e.g. from p in (paxel expression)"
  = ExpressionScopeLookup / '(' whiteSpace? expr:PaxelExpression whiteSpace? ')' {
    return expr;
  }
  
FromExpression "Expression for iterating over a sequence stored in a scope, e.g. from p in inputHandle"
  = 'from' whiteSpace iterVar:fieldName whiteSpace 'in' whiteSpace source:SourceExpression {
    return toAstNode<AstNode.FromExpressionNode>({
       kind: 'paxel-from',
       iterationVar: iterVar,
       qualifier: null,
       source
    });
  }

WhereExpression "Expression for filtering a sequence, e.g. where p < 10"
  = 'where' whiteSpace condition:RefinementExpression {
    return toAstNode<AstNode.WhereExpressionNode>({
       kind: 'paxel-where',
       condition
    });
  }

LetExpression "Expression for introducing a new identifier, e.g. let x = 10"
  = 'let' whiteSpace varName:fieldName whiteSpace '=' whiteSpace expression:PaxelExpression {
    return toAstNode<AstNode.LetExpressionNode>({
      kind: 'paxel-let',
      varName: varName,
      expression
    });
  }

SelectExpression "Expression for mapping a sequence to new values, e.g. select p + 1"
  = 'select' whiteSpace expression:PaxelExpression {
    return toAstNode<AstNode.SelectExpressionNode>({
      kind: 'paxel-select',
      expression
    });
  }

NewExpression "Expression instantiating a new Arcs entity, e.g. new Foo {x: bar.x}"
  = 'new' whiteSpace names:((upperIdent / '*') whiteSpace?)* '{' multiLineSpace fields:ExpressionEntityFields? ','? multiLineSpace '}' {
     return toAstNode<AstNode.ExpressionEntity>({
        kind: 'expression-entity',
        names: optional(names, names => names.map(name => name[0]).filter(name => name !== '*'), ['*']),
        fields
     });
  }

ExpressionEntityFields
  = field:ExpressionEntityField rest:(',' multiLineSpace ExpressionEntityField)* {
    return [field].concat(rest.map(rfield => rfield[2]));
  }

ExpressionEntityField
  = fieldName:fieldName whiteSpace? ':' whiteSpace? expression:PaxelExpression {
    return toAstNode<AstNode.ExpressionEntityField>({
        kind: 'expression-entity-field',
        name: fieldName,
        expression
    });
  }

ExpressionScopeLookup "a dotted scope chain, starting at a root param, e.g. param.schemaFieldName.schemaFieldName"
  = RefinementExpression

KotlinPrimitiveType
  = type:('Byte' / 'Short' / 'Int' / 'Long' / 'Char' / 'Float' / 'Double')
  {
    return toAstNode<AstNode.KotlinPrimitiveType>({
      kind: AstNode.SchemaFieldKind.KotlinPrimitive,
      type,
      refinement: null
    });
  }

SchemaUnionType
  = '(' whiteSpace? first:SchemaPrimitiveType rest:(whiteSpace 'or' whiteSpace SchemaPrimitiveType)+ whiteSpace? ')'
  {
    const types = [first];
    for (const type of rest) {
      types.push(type[3]);
    }
    return toAstNode<AstNode.SchemaUnionType>({kind: AstNode.SchemaFieldKind.Union, types, refinement: null, annotations: []});
  }

SchemaTupleType
  = '(' whiteSpace? first:SchemaPrimitiveType rest:(whiteSpace? ',' whiteSpace? SchemaPrimitiveType)* whiteSpace? ')'
  {
    const types = [first];
    for (const type of rest) {
      types.push(type[3]);
    }
    return toAstNode<AstNode.SchemaTupleType>({kind: AstNode.SchemaFieldKind.Tuple, types, refinement: null, annotations: []});
  }

Refinement
  = '[' multiLineSpace? expression:RefinementExpression multiLineSpace? ']'
  {
      return toAstNode<AstNode.RefinementNode>({kind: 'refinement', expression});
  }
  / '[' [^\]]* { expected("a valid refinement expression"); }

RefinementExpression
  = OrExpression

OrExpression
  = leftExpr:AndExpression tail:(multiLineSpace 'or' multiLineSpace AndExpression)*
  {
    for (const part of tail) {
      const operator = part[1];
      const rightExpr = part[3];
      leftExpr = toAstNode<AstNode.BinaryExpressionNode>({kind: 'binary-expression-node', leftExpr, rightExpr, operator});
    }
    return leftExpr;
  }

AndExpression
  = leftExpr:EqualityExpression tail:(multiLineSpace 'and' multiLineSpace EqualityExpression)*
  {
    for (const part of tail) {
      const operator = part[1];
      const rightExpr = part[3];
      leftExpr = toAstNode<AstNode.BinaryExpressionNode>({kind: 'binary-expression-node', leftExpr, rightExpr, operator});
    }
    return leftExpr;
  }

EqualityExpression
  = leftExpr:ComparisonExpression tail:(multiLineSpace? ('==' / '!=') multiLineSpace? ComparisonExpression)*
  {
    for (const part of tail) {
      const operator = part[1];
      const rightExpr = part[3];
      leftExpr = toAstNode<AstNode.BinaryExpressionNode>({kind: 'binary-expression-node', leftExpr, rightExpr, operator});
    }
    return leftExpr;
  }

ComparisonExpression
  = leftExpr:IfNullExpression tail:(multiLineSpace? ('<=' / '<' / '>=' / '>') multiLineSpace? IfNullExpression)*
  {
    for (const part of tail) {
      const operator = part[1];
      const rightExpr = part[3];
      leftExpr = toAstNode<AstNode.BinaryExpressionNode>({kind: 'binary-expression-node', leftExpr, rightExpr, operator});
    }
    return leftExpr;
  }

IfNullExpression
  = leftExpr:AdditiveExpression tail:(multiLineSpace? '?:' multiLineSpace? AdditiveExpression)*
  {
    for (const part of tail) {
      if (!isPaxelMode()) error(`If null operator '?:' is only allowed in paxel expressions`);

      const operator = part[1];
      const rightExpr = part[3];
      leftExpr = toAstNode<AstNode.BinaryExpressionNode>({kind: 'binary-expression-node', leftExpr, rightExpr, operator});
    }
    return leftExpr;
  }

AdditiveExpression
  = leftExpr:MultiplicativeExpression tail:(multiLineSpace? ('+' / '-') multiLineSpace? MultiplicativeExpression)*
  {
    for (const part of tail) {
      const operator = part[1];
      const rightExpr = part[3];
      leftExpr = toAstNode<AstNode.BinaryExpressionNode>({kind: 'binary-expression-node', leftExpr, rightExpr, operator});
    }
    return leftExpr;
  }

MultiplicativeExpression
  = leftExpr:PrimaryExpression tail:(multiLineSpace? ('*' / '/') multiLineSpace? PrimaryExpression)*
  {
    for (const part of tail) {
      const operator = part[1];
      const rightExpr = part[3];
      leftExpr = toAstNode<AstNode.BinaryExpressionNode>({kind: 'binary-expression-node', leftExpr, rightExpr, operator});
    }
    return leftExpr;
  }

FunctionArguments
  = multiLineSpace? arg: PaxelExpression multiLineSpace? rest:(',' multiLineSpace? PaxelExpression multiLineSpace?)*
  {
    return [arg, ...rest.map(item => item[2])];
  }

FunctionCall
  = fnName:fieldName '(' args:FunctionArguments? ')'
  {
    // TODO: fieldName is too restrictive here (and will give misleading error messages).
    args = args || [];
    if (!isPaxelMode()) {
      if (args.length > 0) {
        error("Functions may have arguments only in paxel expressions.");
      }
      const allBuiltIns = Object.values(AstNode.BuiltInFuncs);
      if (!allBuiltIns.includes(fnName)) {
        error(`Function '${fnName}' is only supported in paxel expressions.`);
      }
      return toAstNode<AstNode.BuiltInNode>({kind: 'built-in-node', value: fnName});
    }
    return toAstNode<AstNode.FunctionExpressionNode>({
      kind: 'paxel-function',
      function: fnName,
      arguments: args
    });
  }

PrimaryExpression
  = '(' multiLineSpace? expr:PaxelExpression multiLineSpace? ')'
  {
    if (!isPaxelMode() && expr.kind.indexOf('paxel-') !== -1) {
      error('Paxel expressions are not allowed in refinements.');
    }
    return expr;
  }
  / op:(('not' whiteSpace) / ('-' whiteSpace?)) expr:PrimaryExpression
  {
    const operator = op[0];
    return toAstNode<AstNode.UnaryExpressionNode>({kind: 'unary-expression-node', expr, operator});
  }
  / NumericValue
  / bool:('true'i / 'false'i)
  {
    return toAstNode<AstNode.BooleanNode>({kind: 'boolean-node', value: bool.toLowerCase() === 'true'});
  }
  / 'null'
  {
    if (!isPaxelMode()) error('Null literal is only allowed in paxel expressions');
    return toAstNode<AstNode.NullNode>({kind: 'null-node'});
  }
  / fn: (FunctionCall / fieldName) nested:(('.' / '?.') fieldName)*
  {
    const fieldNode = typeof(fn) === 'string' && toAstNode<AstNode.FieldNode>({kind: 'field-name-node', value: fn}) || fn;
    // nested is ignored, used only to allow Paxel expressions to parse as text
    if (!isPaxelMode()) {
      if (nested && nested.length > 0) {
        // TODO(jopra): Support scope lookups in refinements.
        error('Scope lookups are not currently supported in refinements, only in paxel expressions.');
      }
      return fieldNode;
    } else {
      // TODO: placeholder, doesn't actually construct the correct/full AST node
      return toAstNode<AstNode.FieldExpressionNode>({kind: 'paxel-field', scopeExpression: null, field: fieldNode});
    }
  }
  / value: '?'
  {
    // TODO(cypher1): Add support for named query arguments
    if (isPaxelMode()) error('Query argument is only allowed in refinement expressions');
    return toAstNode<AstNode.QueryNode>({kind: 'query-argument-node', value});
  }
  / value: QuotedString
  {
    return toAstNode<AstNode.TextNode>({kind: 'text-node', value});
  }

Units = name:(whiteSpace? UnitName)? {
  // TODO: Support complex units like metres per second.
  if (name) {
    return [name[1]];
  }
  return [];
}

UnitName
  = unit:('day'
  / 'hour'
  / 'minute'
  / 'second'
  / 'millisecond'
  / 'milli'
  ) 's'? {
    if (unit === 'milli') {
      unit = 'millisecond';
    }
    return unit+'s';
  }

// This is a suffix to add to a value (e.g. 12.3f) that marks the type associated with the value.
LiteralTypeAnnotation = typeIdentifier:('n'/'i'/'l'/'f'/'d') &[^a-zA-Z0-9_] {
  return text();
}

NumericValue
  = neg:'-'? whole:[0-9_]+ decimal:('.' [0-9_]*)? typeIdentifier:LiteralTypeAnnotation? units:Units {
    const type = (() => {
      switch (typeIdentifier) {
        case 'n': return 'BigInt';
        case 'i': return 'Int';
        case 'l': return 'Long';
        case 'f': return 'Float';
        case 'd': return 'Double';
        case null:
          // Require a unit (that implies the appropriate type)
          if (units.length === 1 && AstNode.timeUnits.includes(units[0])) {
            return 'Instant';
          } else {
            // TODO: Infer the type from the number etc.
            // For now, default to number for backwards compatibility.
            return 'Number';
          }
      }
      throw new Error(`Unexpected type identifier '${typeIdentifier}' (expected one of n, i, l, f, d)`);
    })();
    const getDigits = (chars) => chars.filter(x => x !== '_').join('');
    const decimalStr = decimal ? `.${getDigits(decimal[1])}` : '';
    const repr = `${neg || ''}${getDigits(whole)}${decimalStr}`;
    // The following is a work around, because TS can't infer subtyping based on membership.
    const discreteType = type as AstNode.DiscreteType;
    if (AstNode.discreteTypes.includes(discreteType)) {
      const value = BigInt(repr);
      return toAstNode<AstNode.DiscreteNode>({kind: 'discrete-node', value, units, type: discreteType});
    }
    const value = Number(repr);
    // TODO: Float + Double typing.
    return toAstNode<AstNode.NumberNode>({kind: 'number-node', value, units});
  }

Version "a version number (e.g. @012)"
  = '@' version:[^ ]+
  {
    return version.join('');
  }

Policy
  = 'policy' whiteSpace name:upperIdent openBrace items:(PolicyItem (commaOrNewline PolicyItem)*)? closeBrace eolWhiteSpace?
  {
    const targets: AstNode.PolicyTarget[] = [];
    const configs: AstNode.PolicyConfig[] = [];
    for (const item of extractCommaSeparated(items)) {
      switch (item.kind) {
        case 'policy-target':
          targets.push(item);
          break;
        case 'policy-config':
          configs.push(item);
          break;
        default:
          error(`Unknown PolicyItem: ${item}`);
      }
    }
    return toAstNode<AstNode.Policy>({
      kind: 'policy',
      name,
      targets,
      configs,
      annotationRefs: [], // This gets overridden by the Manifest rule.
    });
  }

PolicyItem
  = PolicyTarget
  / PolicyConfig

PolicyTarget
  = annotationRefs:(AnnotationRef multiLineSpace)* 'from' whiteSpace schemaName:upperIdent whiteSpace 'access' fields:PolicyFieldSet
  {
    return toAstNode<AstNode.PolicyTarget>({
      kind: 'policy-target',
      schemaName,
      fields,
      annotationRefs: annotationRefs.map(item => item[0]),
    });
  }

PolicyFieldSet 'Set of policy fields enclosed in curly braces'
  = openBrace fields:(PolicyField (commaOrNewline PolicyField)*)? closeBrace
  {
    return extractCommaSeparated(fields);
  }

PolicyField
  = annotationRefs:(AnnotationRef multiLineSpace)* name:fieldName subfields:PolicyFieldSet?
  {
    return toAstNode<AstNode.PolicyField>({
      kind: 'policy-field',
      name,
      subfields: subfields || [],
      annotationRefs: annotationRefs.map(item => item[0]),
    });
  }

PolicyConfig
  = 'config' whiteSpace name:simpleName openBrace items:(PolicyConfigKeyValuePair (commaOrNewline PolicyConfigKeyValuePair)*)? closeBrace
  {
    const metadata: Map<string, string> = new Map();
    for (const [key, value] of extractCommaSeparated(items)) {
      if (metadata.has(key)) {
        error(`Duplicate key in policy config: ${key}.`);
      }
      metadata.set(key, value);
    }
    return toAstNode<AstNode.PolicyConfig>({
      kind: 'policy-config',
      name,
      metadata,
    });
  }

PolicyConfigKeyValuePair
  = key:simpleName whiteSpace? ':' whiteSpace? value:QuotedString
  {
    return [key, value];
  }

Indent "indentation" = &(i:" "+ &{
  i = i.join('');
  if (i.length > indent.length) {
    indents.push(indent);
    indent = i;
    return true;
  }
  return false;
})

SameIndent "same indentation" = &(i:" "* &{
  i = i.join('');
  if (i.length === indent.length) {
    return true;
  } else if (i.length < indent.length) {
    indent = indents.pop();
    return false;
  }
  return false;
}) " "*

SameOrMoreIndent "same or more indentation" = &(i:" "* &{
  i = i.join('');
  if (i.length >= indent.length) {
    return true;
  } else if (i.length < indent.length) {
    indent = indents.pop();
    return false;
  }
  return undefined;
}) " "* { return text(); }

// Should only be used as a negative match.
UpperReservedWord
  = keyword:( SchemaPrimitiveType
  ) &([^a-zA-Z0-9_] / !.)  // '!.' matches end-of-input
{
  expected(`an upper case identifier`);
}

// Should only be used as a negative match.
ReservedWord
  = keyword:( Direction
  / SlotDirection
  / SchemaPrimitiveType
  / KotlinPrimitiveType
  / RecipeHandleFate
  / 'particle'
  / 'recipe'
  / 'import'
  / 'in'
  / 'interface'
  / 'schema'
  / 'require'
  / 'handle'
  / 'external'
  ) ([^a-zA-Z0-9_] / !.)  // '!.' matches end-of-input
{
  error(`Expected an identifier (but found reserved word '${keyword}')`);
}

QuotedString "a 'multiline quoted string'"
  = ("'" parts:( [^\\']* "\\" . )* end:[^']* ("'" / . { expected('\' at the end of a quoted string'); })
  { return descapeString(parts, end); })
  / ('"' parts:( [^\\"]* "\\" . )* end:[^"]* ('"' / . { expected('\" at the end of a quoted string'); })
  { return descapeString(parts, end); })

// Helpers for creating curly brace blocks with comma or newline separated
// items, optional whitespace, and optional trailing commas.
//
// Example: openBrace X (commaOrNewline X)* closeBrace
commaOrNewline
  = multiLineSpace ',' multiLineSpace
  / eolWhiteSpace multiLineSpace
openBrace
  = multiLineSpace '{' multiLineSpace
closeBrace
  = commaOrNewline? multiLineSpace '}'

backquotedString "a `backquoted string`" // Note: This may contain ${expressions}
  = '`' pattern:([^`]+) '`' { return pattern.join(''); }
id "an identifier (e.g. 'id')"
  = txt: QuotedString {
      const newlineIndex = txt.indexOf('\n');
      if (newlineIndex !== -1) {
        error('Identifiers must be a single line (possibly missing a quote mark " or \')');
      }
      return txt;
    }
upperIdent "an uppercase identifier (e.g. Foo)"
  = !UpperReservedWord [A-Z][a-z0-9_]i* { return text(); }
lowerIdent "a lowercase identifier (e.g. foo)"
  = !ReservedWord unsafeLowerIdent { return text(); }
unsafeLowerIdent "a lowercase identifier or keyword"
  = [a-z][a-z0-9_]i* &([^a-zA-Z0-9_] / !.)  // '!.' matches end-of-input
  { return text(); }
fieldName "a field name (e.g. foo9)" // Current handle, formFactor or any entity field.
  = [a-z][a-z0-9_]i* { return text(); }
dottedFields "a sequence of field names, descending into subfields (e.g. someField.someRef.someOtherField)."
  = $ (fieldName ("." fieldName)*) // Note that a single fieldName matches too
dottedName "a name conforming to the rules of an android app name, per https://developer.android.com/guide/topics/manifest/manifest-element.html#package"
  = $ (simpleName ("." simpleName)*) // Note that a single simpleName matches too
simpleName "a name starting with a letter and containing letters, digits and underscores"
  = [a-zA-Z][a-zA-Z0-9_]* { return text(); }
whiteSpace "one or more whitespace characters"
  = spaceChar+
spaceChar "a 'plain' space (use whiteSpace instead)"
  = blockComment / ' ' / ("\u00A0" / "\t" / "\f" / "\r" / "\v") {expected('space');}
blockComment "a block comment /* */"
  = '/*' blockCommentBody* ('*/' / !. {error('Unfinished block comment');})
blockCommentBody
  = blockComment / ((!'*/').)
eolWhiteSpace "a group of new lines (and optionally comments)"
  = spaceChar* !.
  / spaceChar* '//' [^\n]* eolWhiteSpace
  / spaceChar* eol eolWhiteSpace?
multiLineSpace "optional whitespace including newlines and comments"
  = eolWhiteSpace? whiteSpace?
eol "a new line"
  = "\r"? "\n" "\r"?
