import {Field} from './Field.js';
import Xen from '../../../components/xen/xen.js';

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
  '*': {
    $changed: (field) => {
      //console.log(field.key);
      onUserRemoved(field);
      if (!field.disposed) {
        onUserChanged(field);
      }
    }
  }
};

const users = window.users = new Field(null, `users/`, 'users', usersSchema);
users.activate();

// user

let userid, user, userProfile;

const selectUser = (node, detail) => {
  userid = detail;
  //
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
  window.user = user = createUserField(userid);
};

const createUserField = userid => {
  window.userProfile = userProfile = Object.create(null);
  const userField = new Field(null, `users/${userid}`, `${userid}`, userSchema);
  userField.activate();
  return userField;
};

let profDeb;

const onProfileHandleEvent = field => {
  //console.log(`profile: `, field.key, field.value);
  const {path, key, value} = field;
  const profile = userProfile[key] || (userProfile[key] = Object.create(null));
  const arcid = path.split('/').slice(2).shift();
  profile[arcid] = value;
  //
  window.outprofile.textContent = '';
  profDeb = Xen.debounce(profDeb, () => {
    window.renderValue(userProfile, 3, window.outprofile);
  }, 300);
};

const removeAvatar = arcid => {
  const node = window.avatarsTable.querySelector(`[id=${arcid}]`);
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
  const arcid = field.path.split('/').slice(2).shift();
  removeAvatar(arcid);
  if (!field.disposed) {
    addAvatar(arcid, field);
  }
  onProfileHandleEvent(field);
};

const removeFriend = (field) => {
  const old = window.friendsTable.querySelector(`[id="${field.key}"]`);
  old && old.remove();
};

const addFriend = (field) => {
  const {path, key, value, fields} = field;
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
  let node = window.friendsTable.querySelector(`[id="${key}"]`);
  if (!node) {
    node = window.friendsTable.appendChild(document.createElement('tr'));
  }
  Object.assign(node, {
    onclick: e => selectUser(e.currentTarget, key),
    innerHTML: `<td mono>${userid}</td><td>${name}</id>`
  });
  node.setAttribute('id', key);
};

const onFriendChangeEvent = field => {
  if (field.disposed) {
    removeFriend(field);
  } else {
    addFriend(field);
  }
};

const userSchema = {
  arcs: {
    '*': {
      $key: (parent, key, datum) => ({
        $join: {
          path: `/arcs/${parent}`,
          schema: {
            'shim_handles': {
              '*': (parent, key, datum) => {
                //console.log(parent, key, datum);
                switch (key) {
                  case 'avatar':
                    return _avatarSchema;
                  case 'friends':
                    return _friendSchema;
                  default:
                    return {
                      $changed: onProfileHandleEvent
                    };
                }
              }
            }
          }
        }
      })
    }
  }
};

const _avatarSchema = {
  $changed: field => {
    onProfileHandleEvent(field);
    onAvatarHandleEvent(field);
  }
};

const _friendSchema = {
  $changed: onProfileHandleEvent,
  data: {
    '*': {
      $changed: onFriendChangeEvent,
      rawData: {
        id: (parent, key, value) => ({
          $join: {
            path: `/users/${value}`,
            schema: {
              arcs: _friendsArcsSchema
            }
          }
        })
      }
    }
  }
};

const shares = {};

const removeShare = field => {
  const arcid = field.path.split('/')[2];
  delete shares[arcid];
  //
  const old = window.shareTable.querySelector(`[id="${arcid}"]`);
  old && old.remove();
};

const addShare = field => {
  const arcid = field.path.split('/')[2];
  shares[arcid] = field;
  //
  const friendid = field.parent.path.split('/')[2];
  const user = users.data[friendid];
  const name = user.info && user.info.name || '(Anonymous)';
  const meta = field.data.metadata;
  let node = window.shareTable.querySelector(`[id="${arcid}"]`);
  if (!node) {
    node = window.shareTable.appendChild(document.createElement('tr'));
  }
  Object.assign(node, {
    onclick: e => selectUser(e.currentTarget, arcid),
    innerHTML: `<td mono>${name}</td><td>${meta.description}</id>`
  });
  node.setAttribute('id', arcid);
  //
  const value = field.value.shim_handles;
  Object.keys(value).forEach(key => {
    const boxed = {
      key: key,
      owner: {
        id: friendid,
        name: name
      },
      store: value[key]
    };
    console.log(`BOX[${key}]:`, boxed);
  });
};

const onShareChanged = field => {
  if (field.disposed) {
    removeShare(field);
  } else {
    const meta = field.data.metadata;
    if (meta && meta.share > 2) {
      addShare(field);
    }
  }
};

const _friendsArcsSchema = {
  '*': {
    '$key': (parent, key, value) => ({
      $join: {
        path: `/arcs/${parent}`,
        schema: {
          $changed: onShareChanged
        }
      }
    })
  }
};

