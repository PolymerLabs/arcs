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
import jsinterop.annotations.JsFunction;
import jsinterop.annotations.JsNonNull;
import jsinterop.annotations.JsProperty;
import jsinterop.annotations.JsConstructor;

/**
 * This provides default methods that particle subclasses
 * can invoke to get access to the runtime 'html' and 'log'
 * methods provided by defineParticle(). They are overriden
 * in j2clparticleadapter.js and used to satisfy j2cl compiler
 * typechecking.
 */
@JsType
public class DomParticleBase<State> extends JsObject {
    public State getState() {
        return null;
    }

    public String html(String html) {
        return html;
    }

    public void log(String str) {
    }
}
