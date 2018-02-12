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

class ArcSteps extends Xen.Base {
  static get observedAttributes() { return ['plans','plan','steps','step']; }
  _getInitialState() {
    return {
      steps: [],
      applied: []
    };
  }
  _update(props, state, lastProps) {
    if (props.plans && props.plan !== lastProps.plan) {
      ArcSteps.log('adding step from host');
      this._addStep(props.plan, props.plans.generations, state.steps, state.applied);
    }
    if (props.steps) {
      state.steps = props.steps;
    }
    if (state.steps && props.plans) {
      this._providePlanStep(state.steps, props.plans, state.applied);
    }
    if (props.step) {
      ArcSteps.log('host consumed a step');
      state.applied[props.step.hash] = true;
    }
  }
  _addStep(plan, generations, steps, applied) {
    let step = this._createStep(plan, generations);
    if (step && !steps.find(s => s.hash === step.hash)) {
      //ArcSteps.log("createStep", step);
      steps.push(step);
      applied[step.hash] = true;
      this._fire('steps', steps);
    }
    return this._state.steps;
  }
  _providePlanStep(steps, plans, applied) {
    let candidates = steps.filter(s => !applied[s.hash]);
    for (let step of candidates) {
      let planStep = this._findPlanForStep(step, plans);
      if (planStep) {
        ArcSteps.log('found suggestion for step'); //, planStep);
        this._state.applied[step.hash] = true;
        this._fire('step', planStep)
        return;
      } else {
        ArcSteps.log('rejecting step'); //, step);
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
      let mappedHandles = plan.views
        .filter(v => (v.fate == "map") && (v.id.substr(0, 7) == "shared:"))
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
      ArcSteps.log("no originating generation found for", plan);
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
      ArcSteps.warn("can't find first generation of", plan, "in", generations);
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
          nearMiss && ArcSteps.log("Almost auto-applied step: ", nearMiss);
        }
      }
    }
  }
}
ArcSteps.log = Xen.Base.logFactory('ArcSteps', '#7b5e57');
ArcSteps.warn = Xen.Base.logFactory('ArcSteps', '#7b5e57', 'warn');
customElements.define('arc-steps', ArcSteps);
