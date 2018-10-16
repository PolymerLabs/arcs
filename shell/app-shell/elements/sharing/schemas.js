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
  UserName: {
    tag: 'Entity',
    data: {
      names: ['UserName'],
      fields: {
        userName: 'Text'
      }
    }
  },
  Avatar: {
    tag: 'Entity',
    data: {
      names: ['Avatar'],
      fields: {
        url: 'URL'
      }
    }
  },
  User: {
    tag: 'Entity',
    data: {
      names: ['User'],
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
  },
  ArcMetadata: {
    tag: 'Entity',
    data: {
      names: ['ArcMetadata'],
      fields: {
        description: 'Text',
        icon: 'Text',
        key: 'Text',
        href: 'Text',
        bg: 'Text',
        color: 'Text',
        profile: 'Text',
        blurb: 'Text',
        share: 'Number',
        touched: 'Number',
        deleted: 'Boolean',
        starred: 'Boolean',
        externalManifest: 'URL'
      }
    }
  },
  TVMazeQuery: {
    tag: 'Entity',
    data: {
      names: ['TVMazeQuery'],
      fields: {
        'type': 'Text',
        'query': 'Text'
      }
    }
  },
  TVMazeFind: {
    tag: 'Entity',
    data: {
      names: ['TVMazeFind'],
      fields: {
        'type': 'Text',
        'name': 'Text'
      }
    }
  },
  TVMazeShow: {
    tag: 'Entity',
    data: {
      names: ['TVMazeShow'],
      fields: {
        'showid': 'Text',
        'name': 'Text',
        'description': 'Text',
        'image': 'Text',
        'network': 'Text',
        'day': 'Text',
        'time': 'Text',
        'suggestion': 'Text',
        'extra': 'Text',
        'favorite': 'Boolean',
        'delete': 'Boolean'
      }
    }
  },
  ShowcaseArtistFind: {
    tag: 'Entity',
    data: {
      names: ['ShowcaseArtistFind'],
      fields: {
        'type': 'Text',
        'name': 'Text'
      }
    }
  },
  ShowcaseArtist: {
    tag: 'Entity',
    data: {
      names: ['ShowcaseArtist'],
      fields: {
        'artistid': 'Text',
        'type': 'Text',
        'name': 'Text',
        'url': 'URL',
        'imageUrl': 'URL',
        'description': 'Text',
        'detailedDescription': 'Text'
      }
    }
  },
  ShowcasePlayRecord: {
    tag: 'Entity',
    data: {
      names: ['ShowcasePlayRecord'],
      fields: {
        'type': 'Text',
        'artist': 'Text',
        'song': 'Text',
        'dateTime': 'Text'
      },
      description: {
        pattern: '${song} from ${artist}'
      }
    }
  }
};

export {schemas};
