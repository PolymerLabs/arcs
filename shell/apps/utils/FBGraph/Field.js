//import {FbGraph} from './FbGraph.js';
import {FbGraph} from '../../../components/FbGraph.js';
import Firebase from '../../common/firebase-config.js';

const {Field} = FbGraph(Firebase.db);

export {Field};
