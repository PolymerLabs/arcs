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

import {atob} from '../../platform/atob-web.js';

export class Bytes {
  // TODO consider using Uint8Array
  private blob: ByteString;

  /**
   * Construct a blob from a base64 string
   */
  constructor(base64bytes: string) {
    this.blob = atob(base64bytes);
  }

  /**
   * Returns a Promise with the Blob.
   */
  async content(): Promise<ByteString> {
    return this.blob;
  }

  /**
   * Returns a Promise with the Blob for the specified range of data.
   */
  async range(offset: number, length: number): Promise<ByteString> {
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
