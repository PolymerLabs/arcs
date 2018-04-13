/*
@license
Copyright (c) 2016 The Polymer Project Authors. All rights reserved.
This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
Code distributed by Google as part of the polymer project is also
subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
*/

import Xen from '../../components/xen/xen.js';

const log = Xen.logFactory('ArcSteps', '#7b5e57');
const warn = Xen.logFactory('ArcSteps', '#7b5e57', 'warn');

class ArcSteps extends Xen.Debug(Xen.Base, log) {
  static get observedAttributes() {
    return ['planificator', 'steps', 'plan'];
  }
  _getInitialState() {
    return {
      applied: []
    };
  }
  _update({planificator, plan, steps}, state, lastProps) {
    const {applied} = state;
    if (planificator) {
      if (!state.planificator) {
        let current = planificator.getCurrentPlans();
        this._onPlansOrStepsChanged(current.plans, current.generations, steps, applied);
        planificator.registerPlansChangedCallback((current) => {
          this._onPlansOrStepsChanged(current.plans, current.generations, steps, applied);
        });
        state.planificator = planificator;
      }

      let past = planificator.getLastActivatedPlan();
      if (past.activePlan && past.activePlan !== state.lastActivePlan) {
        // A plan has been instantiated, record it into `steps `
        this._addStep(past.activePlan, past.generations, steps || [], applied);
        state.lastActivePlan = past.activePlan;
      }
    }
  }
  _addStep(plan, generations, steps, applied) {
    const step = this._createStep(plan, generations);
    // TODO(sjmiles): when it comes back from Firebase, steps can be an object (with numeric indices) instead of an Array
    steps = Object.values(steps);
    if (step && !steps.find(s => s.hash === step.hash)) {
      log('adding step from host', step.hash);
      steps.push(step);
      applied[step.hash] = true;
      this._fire('steps', steps);
    }
  }
  _onPlansOrStepsChanged(plans, generations, steps, applied) {
    if (plans && steps) {
      this._providePlanStep(plans, generations, steps, applied);
    }
  }
  _providePlanStep(plans, generations, steps, applied) {
    const candidates = steps.filter(s => !applied[s.hash]);
    for (let step of candidates) {
      const planStep = this._findPlanForStep(step, plans, generations);
      if (planStep) {
        log('found suggestion for step', step.hash);
        applied[step.hash] = true;
        this._fire('step', planStep);
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
  _createStep(plan, generations) {
    let origin = this._findFirstGeneration(plan, generations);
    if (origin) {
      // Really, we should only store the string and upon loading normalize it
      // again and create a new hash. But really, really we should probably
      // do something smarter than literal matching anyway...
      // Find all mapped handles to be remembered.
      // Store as string, as we'll only use it to find exact matches later. (String is easier to compare)
      // TODO(wkorman): Rename `views` below to `handles` which may
      // necessitate revising the launcher.
      let mappedHandles = plan.handles
        .filter(v => (v.fate == 'map') && (v.id.substr(0, 7) == 'shared:'))
        .map(v => v.id)
        .sort()
        .toString()
        ;
      return {
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
}
customElements.define('arc-steps', ArcSteps);
