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
    return ['plans', 'steps', 'step', 'plan'];
  }
  _getInitialState() {
    return {
      applied: []
    };
  }
  _update({plans, plan, steps, step}, state, lastProps) {
    const {applied} = state;
    if (plans) {
      // TODO(sjmiles): `plans` can become NULL before `plan` is propagated here
      // we should probably attach `plans` (or at least the `.generations`) instead to `plan`
      // after instantiating, but `plan` is a Recipe object and it's frozen.
      // Instead we will need to create a wrapper object for `plan` that can contain the recipe
      // and metadata. In the interim, we will just cache last non-null `plans`.
      state.plans = plans;
    }
    // TODO(sjmiles): using cached plans
    if (state.plans && plan !== lastProps.plan) {
      // `plan` has been instantiated into host, record it into `steps`
      this._addStep(plan, state.plans.generations, steps || [], applied);
    }
    // TODO(sjmiles): using latest plans
    if (plans && steps) {
      // find a step from `steps` that correspondes to a plan in `plans` but hasn't been `applied`
      this._providePlanStep(plans, steps, applied);
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
  _providePlanStep(plans, steps, applied) {
    const candidates = steps.filter(s => !applied[s.hash]);
    for (let step of candidates) {
      const planStep = this._findPlanForStep(step, plans);
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
  _findPlanForStep(step, plans) {
    for (let plan of plans) {
      // TODO(sjmiles): should be (weak) map?
      if (!plan._step) {
        plan._step = this._createStep(plan.plan, plans.generations);
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
