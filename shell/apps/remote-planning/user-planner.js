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
    console.log(`Arc[${key}]: marshaling for user [${userid}]`); //, `${serialization.slice(0, 63)}...`);
    // TODO(sjmiles): we'll need a queue to handle change notifications that arrive while we are 'await'ing
    const runner = this.runners[key] = {};
    runner.arc = await this.deserializeArc(serialization);
    runner.planificator = this.createPlanificator(userid, key, runner.arc);
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
/*
    function onArcDeleted(arckey) {
      if (!arcs[arckey]) {
        console.error(`Deleted nonexistent arc '${arckey}'`);
      }
      removeArcDisplayElement(arckey);
      arcs[arckey].planificator.dispose();
      arcs[arckey].arc.dispose();
      delete arcs[arckey];
    }

    async function createEmptyArc(arckey) {
      const storageKey = `${Firebase.storageKey}/arcs/${arckey}`;
      let newid = 'app-shell-' + ArcsUtils.randomId();
      let params = Object.assign({}, await getParams(), {
        id: newid,
        storageKey: storageKey
      });
      return new Arcs.Arc(params);
    }
    async function deserializeArc(arckey, serialization) {
      // TODO(sjmiles): elide attempt to import ephemeral manifest
      const contextManifest = `import './in-memory.manifest'`;
      if (serialization.includes(contextManifest)) {
        serialization = serialization.replace(contextManifest, '');
        console.warn(`removing context import (${contextManifest}) from serialization`);
      }

      let arc = null;
      params = Object.assign({}, (await getParams()), {
        serialization,
        fileName: './serialized.manifest'
      });
      return Arcs.Arc.deserialize(params);
    }

    function createPlanificator(userid, arckey) {
      const planificator = new Arcs.Planificator(arcs[arckey].arc, {userid, mode: 'producer'});
      planificator.registerPlansChangedCallback(current => showPlansForArc(arckey, current.plans.length));
      planificator.registerSuggestChangedCallback(suggestions => showSuggestionsForArc(arckey, suggestions.length));
      planificator._requestPlanning();
      return planificator;
    }

    async function onEvent(type, detail) {
      console.log(`onEvent '${type}': ${detail.key}`);
      if (type == 'info-changed') {
        showUserName(detail.data.name);
      } else if (type == 'arc-changed') {
        let arckey = detail.key;
        // Arc deleted.
        if (detail.disposed) {
          onArcDeleted(arckey);
          console.log(`Deleting arc ${arckey}`);
        } else {
          // Arc created/updated
          if (!arcs[arckey]) {
            // First time this arc is seen - create display.
            arcs[arckey] = {};
            createArcDisplayElement(arckey);
          }

          // Arc and planificator must both be un/initialized.
          if (Boolean(arcs[arckey].arc) !== Boolean(arcs[arckey].planificator)) {
            console.error(`Arc and planificator initialization inconsistent!`);
          }

          const snap = await db.child(`arcs/${arckey}/serialization`).once('value');
          let serialization = snap.val();

          // Serialization is NON EMPTY.
          if (Boolean(serialization)) {
            // Serialization has changed.
            if (arcs[arckey].serialization !== serialization) {
              // Dispose previous planificator and arc.
              if (arcs[arckey].arc) {
                arcs[arckey].planificator.dispose();
                arcs[arckey].arc.dispose();
              }
              arcs[arckey].serialization = serialization;
              if (!serialization.includes("recipe BasicProfile")) {
                console.log('Deserializing arc for: ', arckey);
                // Deserialize arc and create planificator.
                arcs[arckey].arc = await deserializeArc(arckey, serialization);
                arcs[arckey].planificator = createPlanificator(userid, arckey);
              } else {
                // This is temporary.
                // TODO: initialize user context!
                console.log(`Skipping basic profile arc ${arckey}`);
              }
            }
          } else {
            // `serialization` is NULL.
            // Create a new blank arc and planificator, if don't exist yet.
            if (arcs[arckey].serialization) {
              console.error('Serialization became null??');
            }

            if (!arcs[arckey].arc) {
              console.log(`Created empty arc: ${arckey}`);
              arcs[arckey].arc = await createEmptyArc(arckey);
              arcs[arckey].planificator = createPlanificator(userid, arckey);
            }
          }
        }
      }
      showArcsCount(Object.keys(arcs).length);
    }
*/
}

export {UserPlanner};
