/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Firebase from './firebase.js';
import WatchGroup from './watch-group.js';
import Const from '../../constants.js';
import Xen from '../../../components/xen/xen.js';

const log = Xen.logFactory('CloudSteps', '#7b5e57');
const warn = Xen.logFactory('CloudSteps', '#7b5e57', 'warn');

class CloudSteps extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['key', 'plans', 'plan'];
  }
  _getInitialState() {
    return {
      db: Firebase.db,
      applied: [],
      steps: [],
      watch: new WatchGroup()
    };
  }
  _update({key, plans, plan}, state, oldProps) {
    const {applied, steps} = state;
    if (key && !Const.SHELLKEYS[key]) {
      if (key !== oldProps.key) {
        state.applied = [];
        state.watch.watches = [{
          path: `arcs/${key}/steps`,
          handler: snap => this._receiveSteps(snap)
        }];
      }
      if (plan && plan !== state.plan && plan.generations) {
        state.plan = plan;
        // `plan` has been instantiated into host, record it into `steps`
        this._addStep(key, plan.plan, plan.generations, steps || [], applied);
      }
      // TODO(sjmiles): using latest suggestions
      if (plans && steps.length) {
        // find a step from `steps` that correspondes to a plan in `suggestions` but hasn't been `applied`
        this._providePlanStep(plans.plans, plans.generations, steps, applied);
      }
    }
  }
  _receiveSteps(snap) {
    // TODO(sjmiles): when it comes back from Firebase, steps can be an object (with numeric indices) instead of an Array
    const steps = Object.values(snap.val() || Object);
    log('got cloud steps', steps.map(step => step.name));
    this._setState({steps});
  }
  _addStep(key, plan, generations, steps, applied) {
    const step = this._createStep(plan, generations);
    if (step && !steps.find(s => s.hash === step.hash)) {
      steps.push(step);
      log('added user step', steps.map(step => step.name));
      applied[step.hash] = true;
      db.child(`arcs/${key}/steps/`).set(steps);
    }
  }
  _createStep(plan, generations) {
    let origin = this._findFirstGeneration(plan, generations);
    if (origin) {
      // Really, we should only store the string and upon loading normalize it
      // again and create a new hash. But really, really we should probably
      // do something smarter than literal matching anyway...
      // Find all mapped handles to be remembered.
      // Store as string, as we'll only use it to find exact matches later. (String is easier to compare)
      let mappedHandles = plan.handles
        .filter(v => (v.fate == 'map') && (v.id.substr(0, 7) == 'shared:'))
        .map(v => v.id)
        .sort()
        .toString()
        ;
      return {
        name: plan.name || origin.hash,
        recipe: origin.result.toString(),
        hash: origin.hash,
        mappedHandles
      };
    }
  }
  _findFirstGeneration(plan, generations) {
    // Search generations in reverse order for the accepted plan
    let last_generation;
    generations.reverse().find(
      generation => last_generation = generation.generated.find(member => member.result == plan)
    );
    if (!last_generation) {
      log('no originating generation found for', plan);
    } else {
      // Walk derivation tree up to root. All paths will lead to the same root,
      // hence we can always take the first branch.
      let origin = last_generation;
      while (origin.derivation[0].parent) {
        origin = origin.derivation[0].parent;
      }
      return origin;
    }
  }
  _providePlanStep(plans, generations, steps, applied) {
    const candidates = steps.filter(s => !applied[s.hash]);
    for (const step of candidates) {
      const planStep = this._findPlanForStep(step, plans, generations);
      if (planStep) {
        log('found suggestion for step', step.hash);
        applied[step.hash] = true;
        this._fire('suggestion', planStep);
        return;
      } else {
        log('rejecting step', step.hash);
      }
    }
  }
  _findPlanForStep(step, plans, generations) {
    for (let plan of plans) {
      // TODO(sjmiles): should be (weak) map?
      if (!plan._step) {
        plan._step = this._createStep(plan.plan, generations);
      }
      if (plan._step.hash === step.hash && plan._step.mappedHandles === step.mappedHandles) {
        return plan;
      }
    }
  }
}
customElements.define('cloud-steps', CloudSteps);
