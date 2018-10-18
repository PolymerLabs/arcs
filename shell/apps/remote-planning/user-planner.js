import {FbUser} from './shell/FbUser.js';
import {Firebase} from './shell/firebase.js';
import {Planificator} from '../../../runtime/planificator.js';

class UserPlanner {
  constructor(factory, context, userid) {
    this.factory = factory;
    this.context = context;
    this.userid = userid;
    this.runners = {};

    const fbuser = new FbUser((type, detail) => this.onEvent(type, detail));
    this.field = fbuser.queryUser(userid);
    this.field.activate();

    // Create the launcher arc and planificator.
    const launcherArc = this.factory.spawn(this.context);
    let launcherKey = `launcher`;
    launcherArc.storageKey = `${Firebase.storageKey}/arcs/${launcherKey}`;
    const launcherPlanificator = this.createPlanificator(userid, launcherKey, launcherArc);
    this.runners[launcherKey] = {arc: launcherArc, planificator: launcherPlanificator};
  }
  dispose() {
    this.field.dispose();
  }
  onEvent(type, detail) {
    switch (type) {
      case 'info-changed':
        this.onInfoChanged(detail);
        break;
      case 'arc-changed':
        this.onArcChanged(detail);
        break;
    }
  }
  onInfoChanged(field) {
    if (!field.disposed) {
      console.log(`User[${this.userid}] has`, field.value);
    }
  }
  onArcChanged(field) {
    // TODO(sjmiles): this is really `serializationChanged`, but the fields are weird
    const key = field.parent.parent.key;
    const serialization = field.parent.data.serialization;
    //console.log(key, serialization, field);
    this.disposeArc(key);
    // TODO: cleanup disposed arc's suggestions?
    if (!field.disposed) {
      if (serialization) {
        this.marshalArc(key, this.userid, serialization);
      } else {
        console.log(`Arc[${field.key}] has no serialization, skipping`);
      }
    }
  }
  disposeArc(key) {
    const runner = this.runners[key];
    if (runner) {
      runner.planificator.dispose();
      runner.arc.dispose();
      delete this.runners[key];
    }
  }
  async marshalArc(key, userid, serialization) {
    // TODO(sjmiles): we'll need a queue to handle change notifications that arrive while we are 'await'ing
    console.log(`Arc[${key}]: marshaling for user [${userid}]`);
    try {
      const arc = await this.deserializeArc(serialization);
      const planificator = this.createPlanificator(userid, key, arc);
      this.runners[key] = {arc, planificator};
    } catch (x) {
      // console.log('exception under: ==============================================');
      // console.log(serialization);
      // console.log('==============================================');
      throw x;
    }
  }
  async deserializeArc(serialization) {
    // console.log('==============================================');
    // console.log(serialization);
    // console.log('==============================================');
    // TODO(sjmiles): elide attempt to import ephemeral manifest
    const contextManifest = `import './in-memory.manifest'`;
    if (serialization.includes(contextManifest)) {
      serialization = serialization.replace(contextManifest, '');
    }
    return await this.factory.deserialize(this.context, serialization);
  }
  createPlanificator(userid, key, arc) {
    const planificator = new Planificator(arc, {userid, mode: 'producer'});
    planificator.registerPlansChangedCallback(current => this.showPlansForArc(key, current.plans));
    // planificator.registerSuggestChangedCallback(suggestions => this.showSuggestionsForArc(key, suggestions));
    planificator._requestPlanning();
    return planificator;
  }
  showPlansForArc(key, metaplans) {
    console.log(`======= Arc[${key}] ${metaplans.length} plans ======================================`);
    console.log(metaplans.map(plan => `${plan.descriptionText}    [${plan.plan.particles.map(p => p.name).join(', ')}]`));
    console.log(`====================================================================================`);
  }
  // showSuggestionsForArc(key, suggestions) {
  //   console.log(`Arc[${key}] suggestions\n`, suggestions.map(plan => plan.descriptionText));
  // }
}

export {UserPlanner};
