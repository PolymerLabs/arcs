/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
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
  const url = json && json.html_url;
  console.log(url);
  return url;
};

// TODO(sjmiles): tokens should generally not available to the front-end, but this particular token
// only allows GIST construction, so the risk is low. Also, this token is only for special use and
// can be revoked at any time.
const tokena = `173158fbf64354062`;
const tokenb = `aad5fae733616cd3e389fbe`;
// TODO(sjmiles): GIST will look like 'sjmiles' made it
const user = 'sjmiles';

export const makeGist = async (description, filename, content) => {
  await post(user, `${tokena}${tokenb}`, `https://api.github.com/gists`, {
    description,
    public: true,
    files: {
      [filename]: {
        content
      }
    }
  });
}
