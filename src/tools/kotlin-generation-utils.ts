/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

/**
 * Kotlin language formatting preferences.
 */
export interface KotlinPreferences {
  indent: number;
  lineLength: number;
}

/**
 * Default language formatting settings.
 */
export const KT_DEFAULT: KotlinPreferences = {indent: 4, lineLength: 100};

/**
 * Collection of utilities for generating Kotlin code.
 */
export class KotlinGenerationUtils {
  constructor(public pref: KotlinPreferences = KT_DEFAULT) {
  }

  /**
   * Formats a function application in Kotlin.
   *
   * @param name name of the function
   * @param args list of arguments to the function
   * @param opts additional options for formatting
   */
  applyFun(name: string, args: string[], {
      // Starting indentation level.
      startIndent = 0,
      // Alternative name for the function with empty arguments.
      emptyName = name,
      // Number of existing indents where the resulting code will be inserted.
      numberOfIndents = 0
    } = {}): string {
    if (args.length === 0) return `${emptyName}()`;
    return `${name}(${this.joinWithIndents(args, {
      startIndent: startIndent + name.length + 2,
      numberOfIndents: numberOfIndents + 1
    })})`;
  }

  /** Formats `mapOf` with correct indentation and defaults. */
  mapOf(args: string[], startIndent: number = 0): string {
    return this.applyFun('mapOf', args, {startIndent, emptyName: 'emptyMap'});
  }

  /** Formats `mutableMapOf` with correct indentation and defaults. */
  mutableMapOf(args: string[], startIndent: number = 0): string {
    return this.applyFun('mutableMapOf', args, {startIndent, emptyName: 'mutableMapOf'});
  }

  /** Formats `listOf` with correct indentation and defaults. */
  listOf(args: string[], startIndent: number = 0): string {
    return this.applyFun('listOf', args, {startIndent, emptyName: 'emptyList'});
  }

  /** Formats `setOf` with correct indentation and defaults. */
  setOf(args: string[], startIndent: number = 0): string {
    return this.applyFun('setOf', args, {startIndent, emptyName: 'emptySet'});
  }

  /**
   * Joins a list of items, taking line length and indentation into account.
   *
   * @param items strings to join
   * @param opts additional options for formatting
   */
  joinWithIndents(items: string[], {
      // Starting indentation level.
      startIndent = 0,
      // Number of existing indents where the resulting code will be inserted.
      numberOfIndents = 1
    } = {}): string {
    const candidate = items.join(', ');
    if (startIndent + candidate.length <= this.pref.lineLength) return candidate;
    return `\n${this.indent(items.join(',\n'), numberOfIndents)}\n${this.indent('', numberOfIndents-1)}`;
  }

  /** Indent a codeblock with the preferred indentation. */
  indent(block: string, numberOfIndents: number = 1): string  {
    return leftPad(block, this.pref.indent * numberOfIndents);
  }
}

/** Everyone's favorite NPM module, install not required. */
export function leftPad(input: string, indent: number, skipFirst: boolean = false) {
  return input
    .split('\n')
    .map((line: string, idx: number) => (idx === 0 && skipFirst) ? line : ' '.repeat(indent) + line)
    .join('\n');
}

/** Format a Kotlin string. */
export function quote(s: string) { return `"${s}"`; }

/** Produces import statement if target is not within the same package. */
export function tryImport(importName: string, packageName: string): string {
  const nonWild = importName.replace('.*', '');
  return packageName === nonWild ? '' : `import ${importName}`;
}

/** Coalesces input string such that the first character is upper case. */
export function upperFirst(s: string): string {
  return s[0].toUpperCase() + s.slice(1);
}
