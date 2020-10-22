/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

export class Dom {
  root: HTMLElement;
  appendTo: (node: HTMLElement) => Dom;
  events: (ctrl: any) => Dom;
  set(scope: any): Template;
}

export class Template extends Dom {
  static stamp(template: string|Template, opts?: any):  Dom;
  static createTemplate(template: string): HTMLElement;
  root: HTMLElement;
}
