
import './FbUsers.js';
import './FbUser.js';

const renderjson = window.renderjson;

renderjson.set_icons(' ▶ ', ' ▼ ');
renderjson.set_show_to_level(2);

const renderValue = (value, level) => {
  renderjson.set_show_to_level(level || 1);
  window.outdiv.textContent = '';
  window.outdiv.appendChild(renderjson(value));
};

// users

const users = document.querySelector('fb-users');
users.addEventListener('changed', ({detail}) => onUserChanged(detail));
users.addEventListener('removed', ({detail}) => onUserRemoved(detail));

const onUserRemoved = field => {
  const node = window.usersTable.querySelector(`[id="${field.key}"]`);
  node && node.remove();
};

const onUserChanged = field => {
  onUserRemoved(field.key);
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

// user

const user = document.querySelector('fb-user');
user.addEventListener('profile-changed', ({detail}) => onProfileChanged(detail));
user.addEventListener('friend-changed', ({detail}) => onFriendChanged(detail));

let userProfile;

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
  userProfile = Object.create(null);
  user.userid = detail;
};

const removeAvatar = arcid => {
  const node = window.avatarsTable.querySelector(`[id=${arcid}]`);
  node && node.remove();
};

// const onProfileRemoved = (sender, detail) => {
//   const arcid = sender.path.split('/').slice(2).shift();
//   const profile = userProfile[field];
//   delete profile[arcid];
//   if (detail === 'avatar') {
//     removeAvatar(arcid);
//   }
// };

const onProfileChanged = ({path, key, value}) => {
  //console.log(path, key, value);
  const arcid = path.split('/').slice(2).shift();
  const profile = userProfile[key] || (userProfile[key] = Object.create(null));
  profile[arcid] = value;
  if (key === 'avatar') {
    removeAvatar(arcid);
    const url = value.data.rawData.url.replace(`https://$cdn/`, `../../../`).replace(`https://$shell/`, `../../../`);
    const node = window.avatarsTable.appendChild(
      Object.assign(document.createElement('tr'), {
        innerHTML: `<td><img src="${url}"></td>`
      })
    );
    node.setAttribute('id', arcid);
  }
};

const onFriendChanged = ({path, key, value, fields}) => {
  let user, userid;
  try {
    // TODO(sjmiles): field name `id` is the join point to `users` subtree, so the actual data here is
    // `id: users[id]` ... this means we've hidden the actual 'id' value
    user = value.rawData.id;
    // TODO(sjmiles): must be a better way
    userid = fields.rawData.data.id;
  } catch (x) {
    console.warn(`added friend had incomplete join`);
    return;
  }
  //
  const old = window.friendsTable.querySelector(`[id="${key}"]`);
  old && old.remove();
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

window.user = user;
window.users = users;

window.testUsersValue = () => {
  renderValue(users.value);
};

window.testUserValue = () => {
  renderValue(user.value, 2);
};

window.testProfileValue = () => {
  renderValue(userProfile, 2);
};

