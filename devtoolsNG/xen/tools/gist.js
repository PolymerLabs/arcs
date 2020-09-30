/**
 * @license
 * Copyright (c) 2020 Google Inc. All rights reserved.
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 * Code distributed by Google as part of this project is also
 * subject to an additional IP rights grant found at
 * http://polymer.github.io/PATENTS.txt
 */

// A GitHub personal access token is required to create GISTs.
// Committing tokens is not allowed. To use this library, replace the value below with an actual token,
// ideally allowing only 'create gists' permission.
//
// Instructions for generating tokens is here:
// https://docs.github.com/en/free-pro-team@latest/github/authenticating-to-github/creating-a-personal-access-token`

// GitHub token that authorizes GIST creation goes here
const token = `github-personal-access-token`;
// GIST is attributed to this user
const user = 'GIST-writer';

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
  const htmlUrl = json && json.html_url;
  console.log(htmlUrl);
  return htmlUrl;
};

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
};
