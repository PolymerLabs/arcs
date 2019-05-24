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
import jsinterop.annotations.JsNonNull;
import jsinterop.annotations.JsMethod;
import jsinterop.annotations.JsProperty;
import jsinterop.annotations.JsConstructor;

/**
 * This interface marks getTemplate() as a ES6 'getter' called 'template' and
 * exposes the native willReceiveProps, setState, render, html, and log methods.
 */
@JsType(namespace = "<window>", name = "DomParticleInterface", isNative = true)
public interface DomParticle<Props, State> {
    @JsProperty(name = "template")
    @JsNonNull
    String getTemplate();

    @JsMethod(name = "getState")
    State state();

    void setState(State state);

    void willReceiveProps(Props props, State state);

    Object render(Props props, State state);

    String html(String html);

    void log(String log);
} 

