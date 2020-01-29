package arcs

import kotlinx.serialization.Serializable

/**
 * Serializable data class for service result.
 */
@Serializable
data class ClassifyResult(val labels: Array<String>)

/**
 * Serializable data class for service request.
 */
@Serializable
data class ClassifyRequest(val call: String = "textclassifier.classifyText", val text: String = "")

/**
 * Provides classify method which invokes textclassifier.classifyText with a snippet of text, and
 * returns any recognized entities.
 */
interface ClassifyService {
    fun classify(
        particle: DomParticleBase<*, *>,
        text: String,
        block: (ClassifyResult) -> Unit
    ) = particle.serviceCallAsync(
        // TODO: can we eliminate the need to pass these?
        ClassifyRequest.serializer(), ClassifyResult.serializer(),
        ClassifyRequest(text = text)).then(block)
}
