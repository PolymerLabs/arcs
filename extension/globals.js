// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at
// http://polymer.github.io/PATENTS.txt

// the root of the CDN. This is also (unfortunately) hardcoded in
// event-page.html
//const cdn = 'http://localhost:5001/dev';
const cdn = 'https://polymerlabs.github.io/arcs-cdn/dev';

const manifestType = 'text/x-arcs-manifest';
const manifestRel = 'arcs-manifest';

// ----------------------------------------------------------
// defaultManifest specifies a manifest to always load; or, leave empty to
// skip.

// This is our central store for Product-related manifests
const defaultManifest = cdn + '/artifacts/Products/recipes.manifest';
