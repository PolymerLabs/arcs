/*
 * Copyright 2019 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs

import arcs.sdk.Utils.log

class ServiceParticle : AbstractServiceParticle() {

    private val url = resolveUrl("https://\$particles/Services/assets/waltbird.jpg")
    private var label = "<working>"
    private var probability = "<working>"
    private var rand = arrayOf("<working>", "<working>")

    override fun init() {
        log("Service Particle initialized")
        serviceRequest("ml5.classifyImage", mapOf("imageUrl" to url))
        serviceRequest("random.next", tag = "first")
        serviceRequest("random.next", tag = "second")
    }

    override fun getTemplate(slotName: String): String {
        return """<h2>Classification with ML5 in WASM via Kotlin</h2>
                  <img style="max-width: 240px;" src="{{imageUrl}}"><br>
                  <div>Label: <span>{{label}}</span></div>
                  <div>Confidence: <span>{{probability}}</span></div>
                  <br>
                  <div>And here's some random numbers:<div>
                  <ul>
                    <li>{{rnd1}}</li>
                    <li>{{rnd2}}</li>
                  </ul>"""
    }

    override fun populateModel(slotName: String, model: Map<String, Any>): Map<String, Any> {
        return model + mapOf(
            "imageUrl" to url,
            "label" to label,
            "probability" to probability,
            "rnd1" to rand[0],
            "rnd2" to rand[1]
        )
    }

    override fun serviceResponse(call: String, response: Map<String, String>, tag: String) {
        log("service call '$call' (tag '$tag') completed\n")

        when (call) {
            "ml5.classifyImage" -> {
                label = response["label"] ?: "<working>"
                probability = response["probability"] ?: "<working>"
            }
            else -> rand[if (tag == "first") 0 else 1] = response["value"] ?: "<working>"
        }
    }
}
