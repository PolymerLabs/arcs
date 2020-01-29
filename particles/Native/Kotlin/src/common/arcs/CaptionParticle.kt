package arcs

import kotlinx.serialization.Serializable

/**
 * Serializable Data class used to hold Xen state.
 */
@Serializable
data class CaptionState(val caption: String = "", val entities: String = "")

/**
 * Serializable Data class used for onCaption events.
 */
@Serializable
data class CaptionData(val text: String)

/**
 * Serializable Data class for Xen properties, typically particle handles.
 */
@Serializable
data class CaptionProps(val caption: CaptionSchema = CaptionSchema())

/**
 * Represents a Schema as a data class.
 */
@Serializable
data class CaptionSchema(val text: String = "")

/**
 * Using a video caption feed, process text with a text classifier service, and render
 * extracted entities underneath subtitles as 'Chips'.
 */
class CaptionParticle :
// TODO: Figure out a way to reduce this boilerplate
    DomParticleBase<CaptionProps, CaptionState>(
        CaptionProps.serializer(),
        CaptionState.serializer()
    ),
    // Mixin for TextClassification service
    ClassifyService {

    override var template: String = """
      <youtube-viewer videoid="zzfCVBSsvqA"
        on-caption="{{onCaption}}"></youtube-viewer>
        <p>
          <span>{{caption}}</span>
        </p>
        <p>
          <span style="padding: 8px; background-color: #0f9d58; color: white; border-radius: 4px"
            unsafe-html="{{entities}}"></span>
        </p>
        <p on-click="{{onClick}}" style="text-decoration: underline; color: blue">Click Me2</p>
  """.trimIndent()

    // Initialize UiParticle event handlers
    init {
        // An event handler with a payload
        eventHandler("onCaption", CaptionData.serializer(), this::onCaption)

        // An event handler with no interest in specialized event payloads
        eventHandler("onClick", this::onClick)
    }

    /**
     * Called by youtube-viewer every time the caption changes on the video.
     */
    fun onCaption(data: CaptionData) {
        // Classify is a suspendable coroutine, so must be started inside Platform.async
        // Currently blocked on reliance of Wasm runBlocking() which inhibits re-entrant
        // JS -> WASM calls
//        Platform.async {
        log("Classify called")
        // Invoke suspendable function and wait
        /*val entities = */classify(this@CaptionParticle, data.text) {

            if (it.labels.isNotEmpty()) {
                // Invoke setState() in UiParticle with new caption and entities.
                this.mutateState(
                    CaptionState(
                        data.text,
                        it.labels[0]
                    )
                )
            }
            /*
             * TODO: provide a higher level more typesafe variant of this, perhaps by
             * converting Arcs Schemas directly to a type-safe Mixin you extend to obtain entity
             * specific update methods, like this.updateCaptionHandle(CaptionSchema(data.text))
             */
            this.updateHandle("caption", CaptionSchema.serializer(), CaptionSchema(data.text))
        }
//        }
    }

    fun onClick(evt: Event<Any>) {
        log("Clicked")
    }

    override fun renderState(props: CaptionProps, state: CaptionState): CaptionState {
        return CaptionState(state.caption, state.entities)
    }
}

fun main() {
    Platform.installParticle(CaptionParticle::class, ::CaptionParticle)
}
