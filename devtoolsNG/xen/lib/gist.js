/**
 * @license
 * Copyright 2019 Google LLC.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */
const post = async (user, password, url, body) => {
  const response = await fetch(url, {
    method: 'POST',
    //mode: 'cors',
    cache: 'no-cache',
    //credentials: 'include',
    headers: {
      'Authorization': `Basic ${btoa(`${user}:${password}`)}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  console.log(response);
  const json = await response.json();
  console.log(json);
  console.log(json?.html_url);
  return json?.html_url;
};

// TODO(sjmiles): tokens should generally not available to the front-end, but this particular token
// only allows GIST construction, so the risk is low. Also, this token is only for special use and
// can be revoked at any time.
const token = 'TOKEN_GOES_HERE';
// TODO(sjmiles): GIST will look like 'sjmiles' made it
const user = 'sjmiles';

export const makeGist = async (description, filename, content) => {
  await post(user, token, `https://api.github.com/gists`, {
    description,
    public: true,
    files: {
      [filename]: {
        content
      }
    }
  });
}
