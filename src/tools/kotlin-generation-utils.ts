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
export const KT_DEFAULT: KotlinPreferences = {indent: 4, lineLength: 120};

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
   * @param emptyName alternative name for the function with empty arguments.
   */
  applyFun(name: string, args: string[], emptyName: string = name): string {
    if (args.length === 0) return `${emptyName}()`;
    return `${name}(${this.joinWithIndents(args)})`;
  }

  /** Formats `mapOf` with correct indentation and defaults. */
  mapOf(args: string[]): string {
    return this.applyFun('mapOf', args, 'emptyMap');
  }

  /** Formats `mutableMapOf` with correct indentation and defaults. */
  mutableMapOf(args: string[]): string {
    return this.applyFun('mutableMapOf', args);
  }

  /** Formats `listOf` with correct indentation and defaults. */
  listOf(args: string[]): string {
    return this.applyFun('listOf', args, 'emptyList');
  }

  /** Formats `setOf` with correct indentation and defaults. */
  setOf(args: string[]): string {
    return this.applyFun('setOf', args, 'emptySet');
  }

  /**
   * Joins a list of items, taking line length and indentation into account.
   *
   * @param items strings to join
   * @param lineStart (optional) add the starting indentation when calculating line limits.
   */
  joinWithIndents(items: string[], lineStart: number = 0): string {
    const candidate = items.join(', ');
    if (lineStart + candidate.length <= this.pref.lineLength) return candidate;
    return '\n' + leftPad(leftPad(items.join(',\n'), this.pref.indent), lineStart) + '\n';
  }
}

/** Everyone's favorite NPM module, install not required. */
export function leftPad(input: string, indent: number, skipFirst: boolean = false) {
  return input
    .split('\n')
    .map((line: string, idx: number) => (idx === 0 && skipFirst) ? line : ' '.repeat(indent) + line)
    .join('\n');
}

