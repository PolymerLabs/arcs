import {UserPlanner} from './user-planner.js';
import {UserContext} from './shell/user-context.js';
import {ArcFactory} from './arc-factory.js';

//const userid = '-LMtek9Mdy1iAc3MAkNx'; // Doug
//const userid = '-LMtek9Nzp8f5pwiLuF6'; // Maria
const userid = '-LMtek9LSN6eSMg97nXV'; // Cletus

const manifest = `
  import 'https://$artifacts/canonical.manifest'
`;

const start = async () => {
  const factory = new ArcFactory();
  const context = await factory.createContext(manifest);
  const user = new UserContext();
  user._setProps({userid, context});
  const planner = new UserPlanner(factory, context, userid);
};

start();
