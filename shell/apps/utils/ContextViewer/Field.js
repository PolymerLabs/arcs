import {FbGraph} from '../../../modalities/dom/components/FbGraph/FbGraph.js';

// arcs runtime
import '../../../build/ArcsLib.js';
// firebase config requires arcs runtime
import Firebase from '../../common/firebase-config.js';

const {Field} = FbGraph(Firebase.db);

export {Field};
