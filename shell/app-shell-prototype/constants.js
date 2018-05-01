export default {
  LOCALSTORAGE: {
    user: '0-3-currentUser',
    tools: '0-3-arcs-dev-tools',
    exclusions: '0-3-arcs-exclusions'
  },
  SHELLKEYS: {
    '*': '*',
    launcher: 'launcher',
    //profile: 'profile'
  },
  MANIFESTS: {
    launcher: `import './artifacts/launcher.manifest'`,
    //profile: `import '../apps/web/artifacts/profile.manifest'`
  },
  SHARE: {
    private: 1,
    self: 2,
    friends: 3
  }
};
