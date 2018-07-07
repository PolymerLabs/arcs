import {Field} from './Field.mjs';
import {FbUser} from './FbUser.mjs';

let user;
const users = {};

const usersField = new Field(null, '/users', 'users', {
  '*': {
    $changed: field => {
      const old = users[field.key];
      const neo = users[field.key] = field.value;
      if (!neo || !neo.info || old && neo && old.info && neo.info && old.info.name === neo.info.name) {
        return;
      }
      //console.log(field.key, neo.info.name);
      if (!user) {
        const user = new FbUser((type, field) => {
          console.log(type, field.key);
        });
        user.queryUser(field.key);
      }
    }
  }
});
usersField.activate();

