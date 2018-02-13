import ArcsUtils from '../../app-shell/lib/arcs-utils.js';
import AppShell from '../../app-shell/app-shell.js';

const template = ArcsUtils.html`
  <style>
    x-toast {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background-color: white;
    }
    [search] {
      display: flex;
      align-items: center;
      padding: 4px;
      border-bottom: 1px dotted silver;
    }
    [search] input {
      flex: 1;
      padding: 7px;
      border: none;
      outline: none;
    }
  </style>

  <agents>
    <!--<arc-auth on-auth='_onAuth'></arc-auth>-->
    <arc-config rootpath='{{cdnPath}}' on-config='_onConfig'></arc-config>
    <persistent-arc key='{{suggestKey}}' on-key='_onKey' metadata='{{metadata}}' on-metadata='_onMetadata'></persistent-arc>
    <persistent-users on-users='_onUsers'></persistent-users>
    <persistent-user id='{{userId}}' user='{{user}}' key='{{key}}' on-user='_onUser'></persistent-user>
    <persistent-manifests manifests='{{manifests}}' on-manifests='_onManifests' exclusions='{{exclusions}}' on-exclusions='_onExclusions'></persistent-manifests>
    <persistent-handles arc='{{arc}}' key='{{key}}'></persistent-handles>
    <remote-profile-handles arc='{{arc}}' user='{{user}}' on-profile='_onProfile'></remote-profile-handles>
    <remote-shared-handles arc='{{arc}}' user='{{user}}' friends='{{friends}}'></remote-shared-handles>
    <remote-friends-profiles-handles arc='{{arc}}' friends='{{friends}}' user='{{user}}'></remote-friends-profiles-handles>
    <arc-handle arc='{{arc}}' data='{{arcsHandleData}}' options='{{arcsHandleOptions}}' on-change='_onArcsHandleChange'></arc-handle>
    <arc-handle arc='{{arc}}' data='{{identityHandleData}}' options='{{identityHandleOptions}}' on-change='_onIdentityHandleChange'></arc-handle>
    <arc-handle arc='{{arc}}' data='{{identitiesHandleData}}' options='{{identitiesHandleOptions}}' on-change='_onIdentitiesHandleChange'></arc-handle>
    <arc-handle arc='{{arc}}' data='{{friendsAvatarData}}' options='{{friendsAvatarHandleOptions}}'></arc-handle>
    <arc-handle arc='{{arc}}' data='{{themeData}}' options='{{themeHandleOptions}}' on-change='_onShellThemeChange'></arc-handle>
    <arc-steps plans='{{plans}}' plan='{{plan}}' steps='{{steps}}' step='{{step}}' on-step='_onStep' on-steps='_onSteps'></arc-steps>
    <!-- only for launcher -->
    <remote-visited-arcs user='{{launcherUser}}' arcs='{{visitedArcs}}' on-arcs='_onVisitedArcs'></remote-visited-arcs>
  </agents>

  <arc-host config='{{hostConfig}}' manifests='{{manifests}}' exclusions='{{exclusions}}' plans='{{plans}}' plan='{{plan}}' suggestions='{{suggestions}}' on-arc='_onArc' on-plans='_onPlans' on-applied='_onApplied'>
    <a-scene id="particles" Xgridhelper="size:8" physics="debug: false">
      <a-entity light="type:directional; castShadow: true;" position="1 1 1"></a-entity>
      <a-sky color="#DCDCDC" src="assets/tokyo (candy bar).jpg"></a-sky>
      <a-camera position="0 0 0"></a-camera>
      <a-assets timeout="60000" slotid="assets"></a-assets>
      <!-- particles go here -->
      <a-entity slotid="root"></a-entity>
    </a-scene>
  </arc-host>

<footer>
  <arc-footer dots='{{dots}}' on-suggest='_onStep' on-search='_onSearch'>
    <div slotid='suggestions'></div>
  </arc-footer>
</footer>
`;

class VrAppShell extends AppShell {
  get template() {
    return template;
  }
  _onConfig(e, config) {
    config.containerKind = 'a-entity';
    config.soloPath = 'arc.manifest';
    config.key = config.key || '*';
    super._onConfig(e, config);
  }
}
customElements.define('vr-app-shell', VrAppShell);

