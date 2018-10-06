// Copyright (c) 2018 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt
'use strict';

// Represents a Blob of binary data. Intended for use in storing things such as
// media data.
export class Bytes {
  constructor(blob) {
    this._blob = blob;
  }
  // Returns a Promise with the Blob.
  async content() {
    return new Promise((resolve, reject) => resolve(this._blob));
  }
  // Returns a Promise with the Blob for the specified range of data.
  async range(offset, length) {
    // TODO(wkorman): Slice out the right portion.
    throw 'NotImplemented';
  }
  // Returns a Promise with the String for a URL that can fetch the contents
  // of the stored Blob.
  async url() {
    // TODO(wkorman): Consider returning as a data url ex.
    // 'data:image/png;base64,...' for now.'
    throw 'NotImplemented';
  }
  toString() {
    return `Bytes{blob=${this._blob}}`;
  }
  // TODO(wkorman): Perhaps rangeUrl, type (mimetype), size.
}
