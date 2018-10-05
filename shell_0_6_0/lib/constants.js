const version = '0_6_0';

export const Const = {
  version,
  LOCALSTORAGE: {
    user: `${version}-user`
  },
  // SHELLKEYS: {
  //   '*': '*',
  //   launcher: 'launcher',
  //   //profile: 'profile'
  // },
  // MANIFESTS: {
  //   launcher: `import './artifacts/launcher.manifest'`,
  //   //profile: `import '../apps/web/artifacts/profile.manifest'`
  // },
  SHARE: {
    private: 1,
    self: 2,
    friends: 3
  },
  // DBLABELS: {
  //   handles: 'shim_handles'
  // },
  // HANDLES: {
  //   boxed: 'BOXED',
  //   profile: 'PROFILE',
  //   shared: 'SHARED'
  // },
  STORES: {
    boxed: 'BOXED',
    my: 'PROFILE',
    shared: 'FRIEND'
  }
};
