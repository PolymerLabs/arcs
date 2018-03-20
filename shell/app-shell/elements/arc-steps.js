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

const log = Xen.Base.logFactory('ArcSteps', '#7b5e57');
const warn = Xen.Base.logFactory('ArcSteps', '#7b5e57', 'warn');

class ArcSteps extends Xen.Base {
  static get observedAttributes() {
    return ['plans', 'steps', 'step', 'plan'];
  }
  _getInitialState() {
    return {
      steps: [],
      applied: []
    };
  }
  _setState(state) {
    if (super._setState(state)) {
      log(state);
      return true;
    }
  }
  _update({plans, plan, steps, step}, state, lastProps) {
    if (steps) {
      state.steps = steps;
    }
    if (plans && plan) {
      // `plan` has been instantiated into host, record it into `steps`
      this._addStep(plan, plans.generations, state.steps, state.applied);
    }
    if (state.steps && plans) {
      // find a step from `steps` that correspondes to a plan in `plans` but hasn't been `applied`
      this._providePlanStep(plans, state.steps, state.applied);
    }
  }
  _addStep(plan, generations, steps, applied) {
    const step = this._createStep(plan, generations);
    if (step && !steps.find(s => s.hash === step.hash)) {
      ArcSteps.log('adding step from host');
      steps.push(step);
      applied[step.hash] = true;
      this._fire('steps', steps);
    }
    return steps;
  }
  _providePlanStep(plans, steps, applied) {
    const candidates = steps.filter(s => !applied[s.hash]);
    for (let step of candidates) {
      const planStep = this._findPlanForStep(step, plans);
      if (planStep) {
        log('found suggestion for step'); //, planStep);
        applied[step.hash] = true;
        this._fire('step', planStep);
        return;
      } else {
        log('rejecting step'); //, step);
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
      generation => last_generation = generation.find(member => member.result == plan)
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
  findStep(plan, generations) {
    let step = this._createOriginatingStep(plan, generations);
    if (!step) {
      warn(`can't find first generation of`, plan, 'in', generations);
    } else {
      // TODO: Allow re-applying same step unless its on the root slot.
      // Will make sense once verbs, etc. work and different slots, etc.
      // resolve differently.
      if (!this._applied[step.hash]) {
        let matchingStep = this._steps.find(s => s.hash == step.hash && s.mappedHandles == step.mappedHandles);
        if (matchingStep) {
          return matchingStep;
        } else {
          let nearMiss = this._steps.find(s => s.hash == step.hash);
          nearMiss && log('Almost auto-applied step: ', nearMiss);
        }
      }
    }
  }
}
customElements.define('arc-steps', ArcSteps);
