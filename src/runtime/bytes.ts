// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

/**
 * Represents a Blob of binary data. Intended for use in storing things such as
 * media data.
 */

import {encode, decode} from './keymgmt/base64.js';

/**
 * A wrapper around a set of Bytes that roughly mimics the browser
 * Blob type as used in the File API.  This is a separate
 * implementation that works across Node and the Browser.
 *
 * here's a way to construct a Blob from a Bytes object:
 *
 * ```
 *   const blob = new Blob([bytes.content()]);
 * ```
 */
export class Bytes {
  private blob: Uint8Array;

  /**
   * Constructs a Bytes object from a base64 string.
   */
  constructor(base64bytes: string) {
    this.blob = decode(base64bytes);
  }

  /**
   * Returns a Promise with the Blob.
   */
  async content(): Promise<Uint8Array> {
    return this.blob;
  }

  /**
   * Returns a Promise with the bytes for the specified range of data.
   */
  async range(offset: number, length: number): Promise<Uint8Array> {
    // TODO(wkorman): Slice out the right portion.
    throw new Error('NotImplemented');
  }

  /**
   * Returns a Promise with the String for a URL that can fetch the contents
   * of the stored Blob.
   */
  async url(): Promise<string> {
    // TODO(wkorman): Consider returning as a data url ex.
    // 'data:image/png;base64,...' for now.'
    throw new Error('NotImplemented');
  }

  toString(): string {
    return `Bytes{blob=${this.blob}}`;
  }
  // TODO(wkorman): Perhaps rangeUrl, type (mimetype), size.
}
