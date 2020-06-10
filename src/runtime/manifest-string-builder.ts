/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

const spacesPerIndent = 2;

export class ManifestStringBuilder {
  private readonly lines: string[];
  private readonly indent: number;
  private readonly startIndex: number;

  constructor(parentBuilder?: ManifestStringBuilder) {
    if (parentBuilder) {
      this.lines = parentBuilder.lines;
      this.indent = parentBuilder.indent + 1;
      this.startIndex = this.lines.length;
    } else {
      this.lines = [];
      this.indent = 0;
      this.startIndex = 0;
    }
  }

  /** Add the given line(s) with the correct indent level. */
  push(...lines: string[]) {
    this.lines.push(...lines.map(line => ' '.repeat(this.indent * spacesPerIndent) + line));
  }

  /**
   * Allow indenting a block at a time. Can be used either via a lambda argument
   * or via the return value.
   *
   * Example 1:
   *
   * ```
   * const indented = builder.withIndent();
   * indented.push('a');
   * indented.push('a');
   * ```
   *
   * Example 2:
   *
   * ```
   * builder.withIndent(indented => {
   *   indented.push('a');
   *   indented.push('a');
   * });
   * ```
   */
  withIndent(fn?: (builder: ManifestStringBuilder) => void): ManifestStringBuilder {
    const indentedBuilder = new ManifestStringBuilder(this);
    if (fn) {
      fn(indentedBuilder);
    }
    return indentedBuilder;
  }

  toString() {
    return this.lines.slice(this.startIndex).join('\n');
  }
}
