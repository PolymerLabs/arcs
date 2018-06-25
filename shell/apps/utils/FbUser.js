import {DbField} from './FbGraph.js';
import Xen from '../../components/xen/xen.js';

export const FbUser = class extends Xen.Base {
  static get observedAttributes() {
    return ['userid'];
  }
  _update(props, state) {
    if (props.userid !== state.userid) {
      state.userid = props.userid;
      state.user = this._queryUser(props.userid);
    }
  }
  _queryUser(userid) {
    let user = null;
    if (userid) {
      user = new DbField(null, `/users/${userid}`, userid, this._userSchema);
      this._fire('field', user);
      user.activate();
    }
    return user;
  }
  get _userSchema() {
    return {
      info: true,
      arcs: {
        '*': this._userProfileArcReferenceSchema
      }
    };
  }
  get _userProfileArcReferenceSchema() {
    return {
      '$key': (parent, field, datum) => ({
        $join: {
          path: `/arcs/${parent}`,
          schema: {
            'shim_handles': {
              '*': (parent, field, datum) => {
                const schema = {
                  $changed: (sender, event) => this._onProfileHandleChanged(sender, event)
                };
                switch (field) {
                  case 'friends':
                    return Object.assign(schema, this._friendSchema);
                }
                return schema;
              }
            }
          }
        }
      })
    };
  }
  _onProfileHandleChanged(field, {type, detail}) {
    switch (type) {
      case 'changed':
        this._fire('profile-changed', field);
        break;
      case 'removed':
        this._fire('profile-removed', field);
        break;
    }
  }
  get _friendSchema() {
    return {
      data: {
        '*': {
          $changed: (sender, event) => this._onFriendChanged(sender, event),
          rawData: {
            id: (parent, field, datum) => {
              return {
                $join: {
                  path: `/users/${datum}`,
                  schema: {
                    arcs: this._arcsHandlesSchema
                  }
                }
              };
            }
          }
        }
      }
    };
  }
  _onFriendChanged(field, {type, detail}) {
    switch (type) {
      case 'changed':
         this._fire('friend-changed', field);
        break;
      case 'removed':
        this._fire('friend-removed', field);
        break;
    }
  }
  get _arcsHandlesSchema() {
    return {
      '*': {
        '$key': (parent, field, datum) => ({
          $join: {
            path: `/arcs/${parent}`
          }
        })
      }
    };
  }
};

customElements.define('fb-user', FbUser);
