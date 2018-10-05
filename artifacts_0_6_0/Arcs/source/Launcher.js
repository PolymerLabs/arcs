// Copyright (c) 2017 Google Inc. All rights reserved.
// This code may only be used under the BSD style license found at
// http://polymer.github.io/LICENSE.txt
// Code distributed by Google as part of this project is also
// subject to an additional IP rights grant found at

import 'ArcMeta.schema'

particle Launcher in 'source/Launcher.js'
  inout [ArcMeta] arcs
  consume root
  description `arcs launcher`

recipe Launcher
  // literal ids or `create` needed to avoid resolution
  create as arcs
  slot 'rootslotid-root' as root
  Launcher
    arcs = arcs
    consume root as root

//create 'SYSTEM_arcs' as arcs // fails to assign id
//create 'SYSTEM_arcs' #system_arcs as arcs // fails to parse
//create #systemarcs as arcs // fails to parse
