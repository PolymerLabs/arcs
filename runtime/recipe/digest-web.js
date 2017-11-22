export default async function(str) {
  let buffer = new TextEncoder('utf-8').encode(str);
  let digest = await crypto.subtle.digest('SHA-1', buffer)
  return Array.from(new Uint8Array(digest)).map(x => ('00' + x.toString(16)).slice(-2)).join('');
};
