import {FbGraph} from './FbField.js';
import Firebase from '../../common/firebase-config.js';

const {Field} = FbGraph(Firebase.db);

export {Field};
