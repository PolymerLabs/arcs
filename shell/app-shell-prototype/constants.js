export default {
  LOCALSTORAGE: {
    user: '0-4-user',
    tools: '0-4-tools',
    exclusions: '0-4-exclusions'
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
  },
  DBLABELS: {
    handles: 'shim_handles'
  },
  HANDLES: {
    boxed: 'BOXED',
    profile: 'PROFILE'
  }
};
