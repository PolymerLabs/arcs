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
  <persistent-user id="{{userid}}" user="{{user}}" key="{{key}}" on-user="_onData"></persistent-user>
  <!-- manifest lists -->
  <persistent-manifests manifests="{{manifests}}" on-manifests="_onData" exclusions="{{exclusions}}" on-exclusions="_onData"></persistent-manifests>
  <!-- provisions arc database keys and provides metadata -->
  <persistent-arc key="{{configkey}}" on-key="_onData" metadata="{{metadata}}" on-metadata="_onData"></persistent-arc>
  <!-- access to playback data -->
  <arc-steps plans="{{plans}}" plan="{{plan}}" steps="{{steps}}" step="{{step}}" on-step="_onData" on-steps="_onData"></arc-steps>
  <!-- handles, database syncing -->
  <persistent-handles arc="{{arc}}" key="{{key}}"></persistent-handles>
  <remote-profile-handles arc="{{arc}}" user="{{user}}" on-profile="_onProfile"></remote-profile-handles>
  <remote-friends-shared-handles arc="{{arc}}" friends="{{friends}}" user="{{user}}" on-handle="_onHandle"></remote-friends-shared-handles>
  <!-- set of arcs visited by user, only used by launcher -->
  <remote-visited-arcs user="{{launcherUser}}" arcs="{{launcherarcs}}" on-arcs="_onData"></remote-visited-arcs>
`;

// PROPS
// `plans` are all possible plans
// `plan` is the most recently applied plan
//
// STATE
// `steps` are plans objects stored in arc metadata
// `step` is the first plan in `steps` that matches a plan in `plans` that hasn't already been applied

const log = Xen.Base.logFactory('ArcCloud', '#bb4d00');

class ArcCloud extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['config', 'userid', 'manifests', 'arc', 'key', 'metadata', 'plans', 'step', 'plan', 'exclusions', 'share', 'launcherarcs'];
  }
  get template() {
    return template;
  }
  _update(props, state) {
    const {share} = props;
    const {user, avatar, steps, metadata, key} = state;
    if (user && avatar) {
      // TODO(sjmiles): double-time encapsulation breakage
      user.avatar = props.arc._loader._resolve(avatar.url);
    }
    if (props.exclusions) {
      state.exclusions = props.exclusions;
    }
    this._consumeSteps(steps, metadata);
    if (user && key && share !== undefined) {
      this._consumeShareState(user, key, share);
    }
    this._fire('users', state.users);
    this._fire('friends', state.friends);
    this._fire('avatars', state.avatars);
    this._fire('manifests', state.manifests);
    this._fire('exclusions', state.exclusions);
    this._fire('user', state.user);
    this._fire('key', state.key);
    this._fire('metadata', state.metadata);
    this._fire('step', state.step && state.step.plan);
    this._fire('arcs', state.arcs);
    super._update(props, state);
  }
  _render({config, userid, arc, key, metadata, plans, step, plan, launcherarcs}, {manifests, exclusions, user, friends}) {
    //log(this._props, this._state);
    const render = {
      configkey: config && config.key,
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
      step,
      plan,
      launcherarcs
    };
    return render;
  }
  _consumeSteps(steps, metadata) {
    // steps are part of metadata, metadata is dirty-checked via JSON serialization
    if (steps && metadata) {
      log(`setting steps to metadata`);
      metadata.steps = steps;
      this._setState({metadata});
    }
  }
  _consumeShareState(user, key, share) {
    let dirty = false;
    const shareState = (share == Const.SHARE.friends);
    const profileState = shareState || (share === Const.SHARE.self);
    if (user && key) {
      if (!user.profiles || (Boolean(user.profiles[key]) !== profileState)) {
        dirty = true;
        user.profiles = user.profiles || Object.create(null);
        if (profileState) {
          user.profiles[key] = true;
        } else {
          delete user.profiles[key];
        }
      }
      if (!user.shares || (Boolean(user.shares[key]) !== shareState)) {
        log('modulating share state');
        dirty = true;
        user.shares = user.shares || Object.create(null);
        if (shareState) {
          user.shares[key] = true;
        } else {
          delete user.shares[key];
        }
      }
    }
    if (dirty) {
      // `state.user` is considered immutable, need a copy
      this._setState({user: Object.assign(Object.create(null), user)});
    }
  }
  _onData(e, data) {
    this._setState({[e.type]: data});
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
