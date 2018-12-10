// TODO(sjmiles): by config, node loads log-node.js instead
import {logFactory as _logFactory} from '../../build/platform/log-web.js';
import {Xen} from '../env/arcs.js';

export const logFactory = Xen.Debug.level > 0 ? _logFactory : () => () => {};

