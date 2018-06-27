import {FbGraph} from '../../../components/FbGraph.js';
import Firebase from '../cloud-data/firebase.js';

const {Field} = FbGraph(Firebase.db);

export {Field};
