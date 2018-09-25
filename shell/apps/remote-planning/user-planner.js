import {FbUser} from './shell/FbUser.js';
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
    this.disposeArc(field.key);
    if (!field.disposed) {
      const serial = field.value.$key.serialization;
      if (serial) {
        this.marshalArc(field.key, this.userid, serial);
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
    }
  }
  async marshalArc(key, userid, serialization) {
    // TODO(sjmiles): we'll need a queue to handle change notifications that arrive while we are 'await'ing
    console.log(`Arc[${key}]: marshaling for user [${userid}]`); //, `${serialization.slice(0, 63)}...`);
    const arc = await this.deserializeArc(serialization);
    const planificator =this.createPlanificator(userid, key, arc);
    this.runners[key] = {arc, planificator};
  }
  async deserializeArc(serialization) {
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
    planificator.registerSuggestChangedCallback(suggestions => this.showSuggestionsForArc(key, suggestions));
    planificator._requestPlanning();
    return planificator;
  }
  showPlansForArc(key, metaplans) {
    console.log(`Arc[${key}] plans\n`, metaplans.map(plan => plan.descriptionText));
  }
  showSuggestionsForArc(key, suggestions) {
    //console.log(`Arc[${key}] suggestions\n`, suggestions.map(plan => plan.descriptionText));
  }
}

export {UserPlanner};
