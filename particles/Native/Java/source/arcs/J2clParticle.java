/*
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
package arcs;

import jsinterop.annotations.JsType;
import jsinterop.annotations.JsMethod;
import arcs.J2clParticleProps.J2clParticleState;

/**
 * A simple hello world example. Click handler simply logs.
 */
// TODO(cromwellian): The declaration is boilerplatey and could be further refactored into a convenience
// base class by using a delegate pattern.
@JsType
public abstract class J2clParticle extends DomParticleBase<J2clParticleState>
        implements DomParticle<J2clParticleProps, J2clParticleState> {
    public String getTemplate() {
        return html("<span on-click=\"click\">Hello <span>{{name}}</span>,"
                + "you are <span>{{age}}</span> old2. You clicked <span>{{count}}</span> times.</span>");
    }

    public void willReceiveProps(J2clParticleProps props, J2clParticleState state) {
        state.setName(props.person().name());
        state.setAge(props.person().age());
        state.setCount(0);
        setState(state);
    }

    public J2clParticleState render(J2clParticleProps props, J2clParticleState state) {
        if (props.person() != null) {
            state.setName(props.person().name());
            state.setAge(props.person().age());
        }

        return state;
    }

    // TODO: add some parameterized typed object for getting event data
    public void click(Object event) {
        J2clParticleState s = J2clParticleState.empty();
        s.setCount(1 + state().count());
        setState(s);
        log("thanos");
    }
}
