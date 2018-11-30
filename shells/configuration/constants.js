const version = '0_6_0';

export const Const = {
  version,
  defaultUserId: 'user',
  LOCALSTORAGE: {
    user: `${version}-user`,
    storage: `${version}-storage`
  },
  SHARE: {
    private: 1,
    self: 2,
    friends: 3
  },
  STORES: {
    boxed: 'BOXED',
    my: 'PROFILE',
    shared: 'FRIEND'
  }
};
