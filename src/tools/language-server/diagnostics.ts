/**
 * @license
 * Copyright (c) 2019 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

import {Diagnostic, DiagnosticSeverity, Range} from 'vscode-languageserver';
import {Manifest, ManifestError} from '../../runtime/manifest.js';
import {SourcePosition} from '../../runtime/manifest-ast-nodes.js';
import {Logger, uri2path, normalizeUri} from './util.js';
import {LspLoader} from './lsp-loader.js';

// Gathers a list of problems found by arcs manifest loader to feedback to the
// user via the editor.
export async function gatherDiagnostics(uri: string, logger: Logger):
    Promise<Diagnostic[]> {
      const path = uri2path(normalizeUri(uri));
      // TODO(cypher1): Catch exception and list them for later.
      const errors: ManifestError[] = [];
      try {
        const manifest = await Manifest.load(path, new LspLoader(logger));
        errors.push(...Manifest.getErrors(manifest));
      } catch (e) {
        errors.push(e);
      }
      return errors.map(convertToDiagnostic);
    }

function convertToDiagnostic(error: ManifestError): Diagnostic {
  const convertLocation = (loc: SourcePosition) => ({
    character: loc.column,
    line: loc.line - 1,
  });
  const stripPreamble = (msg: string) => {
    // Remove preamble.
    msg = msg.replace(/^(Parse|Post-parse) [^\n]*line [0-9]*.\n/g, '');
    // Remove preview of code.
    msg = msg.replace(/\n.*/g, '');
    return msg;
  };
  const range: Range = {
    start: convertLocation(error.location.start),
    end: convertLocation(error.location.end)
  };
  return {
    range,
    message: stripPreamble(error.message),
    code: error.key,
    severity: DiagnosticSeverity.Error,
    source: error.location.filename || ''
  };
}
