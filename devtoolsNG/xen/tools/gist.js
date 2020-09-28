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
const token = '9b603ddcb35d871ff93d393b381b3f49c9822a0f';
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
