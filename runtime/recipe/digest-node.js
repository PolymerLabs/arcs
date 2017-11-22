import crypto from 'crypto';

export default function(str) {
  let sha = crypto.createHash('sha1');
  sha.update(str);
  return sha.digest('hex');
};
