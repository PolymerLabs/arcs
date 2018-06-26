import {Field} from './FbField.js';

// users

const onUserChanged = field => {
  onUserRemoved(field);
  const user = field.value;
  const name = user.info && user.info.name || '(Anonymous)';
  const node = window.usersTable.appendChild(
    Object.assign(document.createElement('tr'), {
      onclick: e => selectUser(e.currentTarget, field.key),
      innerHTML: `<td mono>${field.key}</td><td>${name}</id>`
    })
  );
  node.setAttribute('id', field.key);
};

const onUserRemoved = field => {
  const node = window.usersTable.querySelector(`[id="${field.key}"]`);
  node && node.remove();
};

const usersSchema = {
  '*': true,
  $changed: ({type, field}) => {
    //console.log(type, field.key);
    switch (type) {
      case 'child-added':
      case 'child-changed':
        onUserChanged(field);
        break;
      case 'child-removed':
        onUserRemoved(field);
        break;
    }
  }
};

const users = new Field(null, `users/`, 'users', usersSchema);
users.activate();

// user

let user, userProfile;

const selectUser = (node, detail) => {
  if (selectUser.lastNode) {
    selectUser.lastNode.style.backgroundColor = '';
  }
  selectUser.lastNode = node;
  selectUser.userid = detail;
  node.style.backgroundColor = '#b3e5fc';
  //
  [...window.friendsTable.querySelectorAll('tr')].slice(2).forEach(tr => tr.remove());
  [...window.avatarsTable.querySelectorAll('tr')].slice(2).forEach(tr => tr.remove());
  //
  if (user) {
    user.dispose();
  }
  window.user = user = createUserField(detail);
};

const createUserField = userid => {
  window.userProfile = userProfile = Object.create(null);
  const userField = new Field(null, `users/${userid}`, `${userid}`, userSchema);
  userField.activate();
  return userField;
};

const onProfileHandleEvent = ({type, field}) => {
  //console.log(type, field.key);
  switch (type) {
    case 'child-added':
      onProfileHandleChanged(field);
      break;
    case 'child-changed':
      onProfileHandleChanged(field);
      break;
    case 'child-removed':
      //onProfileHandleChanged(field);
      break;
  }
};

const onProfileHandleChanged = field => {
  const {path, key, value} = field;
  //console.log(path, key, value);
  //
  const profile = userProfile[key] || (userProfile[key] = Object.create(null));
  const arcid = path.split('/').slice(2).shift();
  profile[arcid] = value;
  //
  if (key === 'avatar') {
    removeAvatar(arcid);
    addAvatar(arcid, field);
  }
};

const removeAvatar = key => {
  const node = window.avatarsTable.querySelector(`[id=${key}]`);
  node && node.remove();
};

const addAvatar = (arcid, {path, key, value}) => {
  const url = value.data.rawData.url.replace(`https://$cdn/`, `../../../`).replace(`https://$shell/`, `../../../`);
  const node = window.avatarsTable.appendChild(
    Object.assign(document.createElement('tr'), {
      innerHTML: `<td><img src="${url}"></td>`
    })
  );
  node.setAttribute('id', arcid);
};

const onAvatarHandleEvent = field => {
  console.warn('Specialicismo!');
  onProfileHandleChanged(field);
};

const userSchema = {
  //info: true,
  arcs: {
    '*': {
      '$key': (parent, key, datum) => ({
        $join: {
          path: `/arcs/${parent}`,
          schema: {
            'shim_handles': {
              $changed: onProfileHandleEvent,
              '*': (parent, key, datum) => {
                switch (key) {
                  case 'friends':
                    return _friendSchema;
                }
                return true;
              }
            }
          }
        }
      })
    }
  }
};

// friends

const onFriendRemoved = (field) => {
  const old = window.friendsTable.querySelector(`[id="${field.key}"]`);
  old && old.remove();
};

const onFriendChanged = (field) => {
  const {path, key, value, fields} = field;
  //
  onFriendRemoved(field);
  //
  let user, userid;
  try {
    // TODO(sjmiles): field name `id` is the join point to `users` subtree, so the actual data here is
    // `id: users[id]` ... this means we've hidden the actual 'id' value
    user = value.rawData.id;
    // TODO(sjmiles): a better way?
    userid = fields.rawData.data.id;
  } catch (x) {
    console.warn(`added friend had incomplete join`);
    return;
  }
  //
  const name = user.info && user.info.name || '(Anonymous)';
  const node = window.friendsTable.appendChild(
    Object.assign(document.createElement('tr'), {
      onclick: e => selectUser(e.currentTarget, key),
      innerHTML: `<td mono>${userid}</td><td>${name}</id>`
    })
  );
  node.setAttribute('id', key);
};

const onFriendChangeEvent = ({type, field}) => {
  //console.log(type, field.key);
  switch (type) {
    case 'child-added':
    case 'child-changed':
      onFriendChanged(field);
      break;
    case 'child-removed':
      onFriendRemoved(field);
      break;
  }
};

const _friendSchema = {
  data: {
    $changed: onFriendChangeEvent,
    '*': {
      rawData: {
        id: (parent, field, datum) => {
          return {
            $join: {
              path: `/users/${datum}`,
              schema: {
                arcs: _arcsHandlesSchema
              }
            }
          };
        }
      }
    }
  }
};

const _arcsHandlesSchema = {
  '*': {
    '$key': (parent, field, datum) => ({
      $join: {
        path: `/arcs/${parent}`,
        schema: {
          '*': true
        }
      }
    })
  }
};
