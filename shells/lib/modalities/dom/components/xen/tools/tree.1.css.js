/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
export default `
ul {
  -webkit-padding-start: 24px;
}
ul, ul ul {
  list-style-type: none;
  background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAAKAQMAAABPHKYJAAAAA1BMVEWIiIhYZW6zAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH1ggGExMZBky19AAAAAtJREFUCNdjYMAEAAAUAAHlhrBKAAAAAElFTkSuQmCC) repeat-y;
  margin: 0;
  padding: 0;
}
ul ul {
  margin-left: 10px;
}
ul > li {
  margin: 0;
  padding: 0 12px;
  line-height: 20px;
  background: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAUAQMAAACK1e4oAAAABlBMVEUAAwCIiIgd2JB2AAAAAXRSTlMAQObYZgAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9YIBhQIJYVaFGwAAAARSURBVAjXY2hgQIf/GTDFGgDSkwqATqpCHAAAAABJRU5ErkJggg==) no-repeat;
}
ul:last-child > li {
  background: #fff url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAUAQMAAACK1e4oAAAABlBMVEUAAwCIiIgd2JB2AAAAAXRSTlMAQObYZgAAAAlwSFlzAAALEwAACxMBAJqcGAAAAAd0SU1FB9YIBhQIIhs+gc8AAAAQSURBVAjXY2hgQIf/GbAAAKCTBYBUjWvCAAAAAElFTkSuQmCC) no-repeat;
}
`;
