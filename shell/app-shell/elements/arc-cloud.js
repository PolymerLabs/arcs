// code
import ArcsUtils from '../lib/arcs-utils.js';
import Xen from '../../components/xen/xen.js';
import Const from '../constants.js';

// elements
import './persistent-arc.js';
import './persistent-users.js';
import './persistent-user.js';
import './persistent-manifests.js';
import './persistent-handles.js';
import './remote-profile-handles.js';
import './remote-friends-shared-handles.js';
import './arc-steps.js';
import './remote-visited-arcs.js';

// globals
const shellPath = window.shellPath;

// templates
const template = Xen.html`
  <!-- systemwide user list -->
  <persistent-users on-users="_onData"></persistent-users>
  <!-- user data from database -->
  <persistent-user id="{{userid}}" user="{{user}}" key="{{key}}" on-user="_onUser"></persistent-user>
  <!-- manifest lists -->
  <persistent-manifests manifests="{{manifests}}" on-manifests="_onData" exclusions="{{exclusions}}" on-exclusions="_onData"></persistent-manifests>
  <!-- provisions arc database keys and provides metadata -->
  <persistent-arc key="{{key}}" on-key="_onKey" metadata="{{metadata}}" on-metadata="_onMetadata"></persistent-arc>
  <!-- access to playback data -->
  <arc-steps plans="{{plans}}" active="{{active}}" steps="{{steps}}" on-step="_onStep" on-steps="_onData"></arc-steps>
  <!-- handles, database syncing -->
  <persistent-handles arc="{{arc}}" key="{{key}}"></persistent-handles>
  <remote-profile-handles arc="{{arc}}" user="{{user}}" on-profile="_onProfile"></remote-profile-handles>
  <remote-friends-shared-handles arc="{{arc}}" friends="{{friends}}" user="{{user}}" on-handle="_onHandle"></remote-friends-shared-handles>
  <!-- set of arcs visited by user, only used by launcher -->
  <remote-visited-arcs user="{{launcherUser}}" arcs="{{launcherarcs}}" on-arcs="_onArcs"></remote-visited-arcs>
`;

// PROPS
// `plans` are all possible plans
// `plan` is the most recently applied plan
//
// STATE
// `steps` are plans objects stored in arc metadata

const log = Xen.logFactory('ArcCloud', '#bb4d00');

class ArcCloud extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['config', 'userid', 'user', 'manifests', 'arc', 'key', 'metadata',
        'plans', 'active', 'exclusions', 'share', 'launcherarcs'];
  }
  get template() {
    return template;
  }
  _update(props, state, oldProps, oldState) {
    const {user, share, metadata, key} = props;
    const {avatar, steps} = state;
    //
    if (user && avatar) {
      // TODO(sjmiles): double-time encapsulation breakage
      user.avatar = props.arc._loader._resolve(avatar.url);
    }
    //
    if (props.exclusions) {
      state.exclusions = props.exclusions;
    }
    if (key && user) {
      // `share` setting is implicit in user record, and explicit in `share` property,
      // disambiguate here (user record wins)
      if (user !== state.user || key !== state.key) {
        const share = this._calculateShareState(user, key);
        log('have new user, calcuated share as', share);
        this._fire('share', share);
      } else if (share !== state.share) {
        if (this._consumeShareState(user, key, share)) {
          log('have novel share, calcuated user as', user);
          this._fire('user', Xen.clone(user));
        }
      }
      state.user = user;
      state.key = key;
      state.share = share;
    }
    // Assumption is that user, key, and share are Truth from On High ... if they ever are not, we have a problem.
    // This means intermediaries must never store values fired from here and send them back to us if they
    // are also sending them farther up the tree.
    if (user && key && share) {
      this._consumeShareState(user, key, share);
    }
    //
    if (steps && metadata) {
      this._consumeSteps(steps, metadata);
    }
    this._fire('users', state.users);
    this._fire('friends', state.friends);
    this._fire('avatars', state.avatars);
    this._fire('manifests', state.manifests);
    this._fire('exclusions', state.exclusions);
    this._fire('arcs', state.arcs);
    super._update(props, state);
  }
  _render({config, userid, user, arc, key, metadata, plans, active, launcherarcs}, {manifests, exclusions, friends}) {
    const render = {
      userid,
      user,
      launcherUser: config && config.launcher && user,
      friends,
      manifests,
      exclusions,
      key,
      arc,
      metadata,
      steps: metadata && metadata.steps,
      plans,
      active,
      launcherarcs
    };
    return render;
  }
  _consumeSteps(steps, metadata) {
    // steps are part of metadata, metadata is dirty-checked via JSON serialization,
    if (steps) {
      metadata = metadata ? Xen.clone(metadata) : Xen.nob();
      if ((steps.length || metadata.steps) && (metadata.steps != steps)) {
        log(`setting steps to metadata`);
        metadata.steps = steps;
        this._fire('metadata', metadata);
        this._setState({steps: null});
      }
    }
  }
  _calculateShareState(user, key) {
    // calculate sharing state
    let isProfile = user.profiles && user.profiles[key];
    let isShared = user.shares && user.shares[key];
    return isShared ? Const.SHARE.friends : isProfile ? Const.SHARE.self : Const.SHARE.private;
  }
  _consumeShareState(user, key, share) {
    let dirty = false;
    const shareState = (share === Const.SHARE.friends);
    const profileState = shareState || (share === Const.SHARE.self);
    if (user && key) {
      if ((Boolean(user.profiles[key]) !== profileState)) {
        dirty = true;
        if (profileState) {
          user.profiles[key] = true;
        } else {
          delete user.profiles[key];
        }
      }
      if ((Boolean(user.shares[key]) !== shareState)) {
        dirty = true;
        if (shareState) {
          user.shares[key] = true;
        } else {
          delete user.shares[key];
        }
      }
    }
    return dirty;
  }
  _onData(e, data) {
    this._setState({[e.type]: data});
  }
  _onArcs(e, arcs) {
    this._setImmutableState('arcs', arcs);
  }
  _onUser(e, user) {
    this._fire('user', user);
  }
  _onKey(e, key) {
    this._fire('key', key);
  }
  _onMetadata(e, metadata) {
    this._fire('metadata', metadata);
  }
  _onStep(e, step) {
    this._fire('step', step.plan);
  }
  async _onProfile(e, profile) {
    if (profile) {
      let property;
      switch (profile.id) {
        case 'PROFILE_avatar':
          property = 'avatar';
          break;
        case 'PROFILE_friends':
          property = 'friends';
          break;
        default:
          return;
      }
      const handleData = await ArcsUtils.getHandleData(profile);
      // TODO(sjmiles): for Sets, it seems better to scoop the rawData out now, but downstream code
      // expects the full Entities, and I can't change that code right now.
      //const data = handleData && (handleData.rawData || Object.values(handleData).map(e => e.rawData));
      const data = handleData && (handleData.rawData || handleData);
      log(profile.id, data);
      this._setState({[property]: data});
    }
  }
  async _onHandle(e, handle) {
    if (handle) {
      let property;
      switch (handle.id) {
        case 'BOXED_avatar':
          property = 'avatars';
          break;
        default:
          return;
      }
      const handleData = await ArcsUtils.getHandleData(handle);
      const data = handleData && handleData.map(d => d.rawData);
      log(handle.id, data);
      this._setState({[property]: data});
    }
  }
}
customElements.define('arc-cloud', ArcCloud);
