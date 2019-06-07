defineParticle(({DomParticle, html, log, resolver}) => {

    /**
     * This looks a bit odd, because it has to fit into the auto-generated setup that Kotlin-native
     * compiler produces. We can fine-tune this later. We first import the bootstrap
     * (main.wasm.js) which sets up a bunch of imports for WASM runtime. We add a couple of our
     * own, including an egregiously bad way of copying strings into WASM because the
     * current runtine doesn't expose a malloc() callable from JS.
     *
     * Also, we never invoke instance.exports.* functions directly, but instead invoke lambda
     * callbacks exported during startup. Why? Because Kotlin-native's bridging uses its own
     * pseudo-stack called 'Arenas' to pass arguments by integer reference to WASM. It cleans up
     * these areas after a lambda callback is finished, reducing the chance of a memory leak.
     */
    return class extends DomParticle {
        constructor() {
            super()
            importScripts(resolver(`WasmParticle/main.wasm.js`));
            this.html = html;
            this.log = log;

            /**
             * These are hand written, but many of them eventually can be auto-generated
             * by the jsinterop utility.
             */
            konan.libraries.push({
                    quit: function () {
                        return 0;
                    },
                    arcs_WasmParticle_getInstance: (resultArena) => {
                        var result = this;
                        return toArena(resultArena, result);
                    },
                    arcs_WasmParticle_updateVariable: function (particleArena, particleIndex,
                                                               propNamePtr, propNameLen,
                                                               statePtr, stateLen) {
                        kotlinObject(particleArena, particleIndex).updateVariable(
                            toUTF16String(propNamePtr, propNameLen),
                            JSON.parse(toUTF16String(statePtr, stateLen)));
                    },
                    arcs_WasmParticle_setState: function (particleArena, particleIndex,
                                                         statePtr, stateLen) {
                        kotlinObject(particleArena, particleIndex).setState(
                            JSON.parse(toUTF16String(statePtr, stateLen)));
                    },
                    arcs_WasmParticle_log: function (particleArena, particleIndex,
                                                    msgPtr, msgLen) {
                        kotlinObject(particleArena, particleIndex).log(
                            toUTF16String(msgPtr, msgLen));
                        kotlinObject(particleArena, particleIndex)._invalidate();
                    },
                    arcs_WasmParticle_getState: function (particleArena, particleIndex) {
                        const state = JSON.stringify(
                            kotlinObject(particleArena, particleIndex).getState());
                        return toArena(particleArena, state);
                    },
                    arcs_WasmParticle_service: function (particleArena, particleIndex, resultArena,
                                                        reqPtr, reqLen) {
                        let serviceRequestString = toUTF16String(reqPtr, reqLen);
                        log("ServiceRequest " + serviceRequestString);
                        let serviceRequest = JSON.parse(serviceRequestString);
                        const promise = kotlinObject(particleArena, particleIndex).service(
                            serviceRequest).then((arg) => {
                                log("ServiceResult " + JSON.stringify(arg));
                                return JSON.stringify(arg);
                        });
                        let promiseIndex = toArena(resultArena, promise);
                        return promiseIndex;
                    },
                    arcs_WasmParticle_setEventHandler: function (arena, obj, propertyName, propertyNameLength, func) {
                        var name = toUTF16String(propertyName, propertyNameLength);
                        kotlinObject(arena, obj)[name] = function (evt) {
                            konan_dependencies.env.Konan_js_wrapLambda(arena, func).call(
                                this, JSON.stringify(evt.data.value));
                        }
                    },
                    // These functions are called by JsValue.asString to copy strings to Kotlin heap
                    Konan_js_get_String_length: function (stringArena, stringIndex) {
                        const maybeString = kotlinObject(stringArena, stringIndex);
                        if (typeof (maybeString) === 'string') {
                            return maybeString.length;
                        }
                        return 0;
                    },
                    Konan_js_get_String_at: function (stringArena, stringIndex, index) {
                        // Very hacky way to transport strings.
                        // TODO: optimize launcher.cpp to provide malloc() functions
                        const maybeString = kotlinObject(stringArena, stringIndex);
                        if (typeof (maybeString) === 'string') {
                            return maybeString.charCodeAt(index);
                        }
                        return -1;
                    },
                }
            );
            this.loadAndRunWasm(resolver("WasmParticle/../../build/bin/wasm32/mainDebugExecutable/main.wasm"));
        }

        loadAndRunWasm(filename) {
            linkJavaScriptLibraries()
            // Invokes main() -> Platform.installParticle() which wires up render()/template()
            // lambda callbacks
            try {
                WebAssembly.instantiateStreaming(fetch(filename), konan_dependencies).then(result => {
                    this.instance = result.instance;
                    invokeModule(this.instance, [filename]);
                }).catch(err => log("Error instantiating WASM " + err));
            } catch (e) {
                log("Exception loading WASM: " + e)
            }
        }

        render(props, state) {
            // registered by WASM code from Platform.installParticle()
            if (this.wasmRender) {
                this.wasmRender(JSON.stringify(props), JSON.stringify(state));
                return JSON.parse(this.wasmReturnSlot);
            }
            return this.state;
        }

        get template() {
            // registered by WASM code from Platform.installParticle()
            if (this.wasmTemplate) {
                this.wasmTemplate();
                return this.wasmReturnSlot || '<span>Empty</span>';
            }
            // HACK for demo: WASM loading is async, but DomParticle construction is sync,
            // so it calls getTemplate() and caches the result before the WASM code has hookedup.
            // Need to investigate some kind of deferred lifecycle wherein WASM main() method
            // invokes defineParticle()
            return html`<youtube-viewer videoid="zzfCVBSsvqA"
        on-caption="{{onCaption}}"></youtube-viewer>
        <p>
          <span>{{caption}}</span>
        </p>
        <p>
          <span style="padding: 8px; background-color: #0f9d58; color: white; border-radius: 4px"
            unsafe-html="{{entities}}"></span>
        </p>
        <p on-click="{{onClick}}" style="text-decoration: underline; color: blue">Click Me</p>
`;
        }
    }
});
