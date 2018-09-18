/*
@license
Copyright (c) 2018 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

const schemas = {
  avatar: {
    tag: 'Entity',
    data: {
      names: ['Avatar'],
      fields: {
        url: 'URL',
        owner: 'Text'
      }
    }
  },
  user: {
    tag: 'Entity',
    data: {
      names: ['User0'],
      fields: {
        'id': 'Text',
        'name': 'Text',
        'location': 'Object'
      }
    }
  },
  Person: {
    tag: 'Entity',
    data: {
      names: ['Person', 'Thing'],
      fields: {
        active: 'Text',
        arcs: 'Object',
        avatar: 'Text',
        date: 'Text',
        description: 'Text',
        foods: 'Text',
        friends: 'Text',
        id: 'Text',
        identifier: 'Text',
        image: 'URL',
        location: 'Object',
        name: 'Text',
        occasion: 'Text',
        profiles: 'Object',
        shares: 'Object',
        url: 'URL'
      }
    }
  }
};

export {schemas};
