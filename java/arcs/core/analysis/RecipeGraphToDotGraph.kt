/*
 * Copyright 2020 Google LLC.
 *
 * This code may only be used under the BSD style license found at
 * http://polymer.github.io/LICENSE.txt
 *
 * Code distributed by Google as part of this project is also subject to an additional IP rights
 * grant found at
 * http://polymer.github.io/PATENTS.txt
 */

package arcs.core.analysis

import arcs.core.analysis.RecipeGraph.EdgeKind
import arcs.core.analysis.RecipeGraph.Node
import arcs.core.data.Recipe
import arcs.core.type.Type
import java.util.IdentityHashMap

/**
 * Simple text-only labeler for nodes. Does not render checks/claims for Particles.
 */
val SIMPLE_NODE_LABELER = { name: String, node: Node ->
  when (node) {
    is Node.Particle -> Label.Text("$name: $node")
    is Node.Handle -> {
      val typeText = node.handle.type.toStringWithOptions(
        Type.ToStringOptions(hideFields = false, pretty = true)
      )
      Label.Text("$name: $typeText $node")
    }
  }
}

/**
 * Simple text-only labeler for edges.
 */
val SIMPLE_EDGE_LABELER = { edge: EdgeKind ->
  when (edge) {
    is EdgeKind.HandleConnection -> {
      val typeText = edge.spec.type.toStringWithOptions(
        Type.ToStringOptions(hideFields = false, pretty = true)
      )
      Label.Text("${edge.spec.name}: $typeText")
    }
    is EdgeKind.JoinConnection -> Label.Text(edge.spec.component.toString())
  }
}

/**
 * HTML-based node labeler. Renders checks/claims for particles.
 */
val PRETTY_NODE_LABELER = { name: String, node: Node ->
  when (node) {
    is Node.Particle -> {
      Label.Html {
        +"<b>$name</b>: $node"
        indent {
          val claims = node.particle.spec.claims
          if (claims.isNotEmpty()) {
            +"claims: ["
            indent { claims.forEach { +"$it" } }
            +"]"
          }

          val checks = node.particle.spec.checks
          if (checks.isNotEmpty()) {
            +"checks: ["
            indent { checks.forEach { +"$it" } }
            +"]"
          }
        }
      }
    }
    is Node.Handle -> {
      val typeText = node.handle.type.toStringWithOptions(Type.ToStringOptions(pretty = true))
      Label.Text("&nbsp;&nbsp;$name: $typeText $node&nbsp;&nbsp;")
    }
  }
}

/**
 * Returns a dot representation of this [RecipeGraph].
 *
 * The [nodeLabeler] function is used to label the nodes in the dot output.
 */
fun RecipeGraph.toDotGraph(
  nodeLabeler: (name: String, node: Node) -> Label = SIMPLE_NODE_LABELER,
  edgeLabeler: (edge: EdgeKind) -> Label = SIMPLE_EDGE_LABELER
): String {
  var nextParticleIndex = mutableMapOf<String, Int>()
  val getUniqueName = { particle: Recipe.Particle ->
    val name = particle.spec.name
    val index = nextParticleIndex[name] ?: 0
    nextParticleIndex[name] = index + 1
    "${name}_$index"
  }
  // We use [IdentityHashMap] instead of a [MutableMap] or [associateBy] because a [Recipe] can
  // have multiple instances of the same [Recipe.Particle].
  val nodeNames = IdentityHashMap<Node, String>()
  nodes.forEach { node ->
    nodeNames[node] = when (node) {
      is Node.Particle -> getUniqueName(node.particle)
      is Node.Handle -> node.handle.name
    }
  }
  val dotNodes = nodeNames.map { (node, name) ->
    when (node) {
      is Node.Particle -> """$name[shape="box", label=${nodeLabeler(name, node)}];"""
      is Node.Handle -> """$name[label=${nodeLabeler(name, node)}];"""
    }
  }
  val dotEdges = nodes.flatMap { node ->
    node.successors.map { (succ, kind) ->
      val nodeName = nodeNames[node]
      val succName = nodeNames[succ]
      """$nodeName -> $succName[label=${edgeLabeler(kind)}];"""
    }
  }
  return """
    |digraph G {
    |  ${dotNodes.joinToString(separator = "\n  ")}
    |  ${dotEdges.joinToString(separator = "\n  ")}
    |}
  """.trimMargin()
}

/**
 * Dotgraph-renderable label.
 */
sealed class Label {
  protected abstract val contents: String

  override fun toString(): String = when (this) {
    is Text -> "\"${contents.escapeQuotes()}\""
    is Html -> "<$contents>"
  }

  /** Simple text-based [Label]. */
  class Text(override val contents: String) : Label()

  /** [Label] variant containing a GraphViz-supported HTML string. */
  class Html(override val contents: String) : Label() {
    /**
     * Creates an [Html]-based [Label] from via a Builder DSL. The HTML supplied to the builder via
     * either [Builder.addText] or [Builder.unaryPlus] (e.g. `+"Line of Text"`) only supports a
     * subset of HTML. See the GraphViz documentation for supported HTML tags for labels.
     *
     * Example:
     *
     * ```kotlin
     * Label.Html {
     *   +"<b>Hello!</b>"
     *   indent {
     *     +"This is indented."
     *   }
     *
     *   center {
     *     +"This is center-aligned"
     *     +"And so is this"
     *   }
     * }
     * ```
     *
     * Becomes:
     *
     * ```html
     * <b>Hello!</b><br align="left"/>
     * &nbsp;&nbsp;This is indented.<br align="left"/>
     * This is center-aligned<br align="center"/>
     * And so is this<br align="center"/>
     * ```
     */
    constructor(indentString: String = DEFAULT_INDENT, builder: Builder.() -> Unit) :
      this(Builder(indentString).apply(builder).build())

    class Builder internal constructor(private val indentString: String) {
      private var alignment = Alignment.LEFT
      private val contentsBuilder = StringBuilder()
      private var indentLevel = 0
      private val br: String
        get() = "<BR ${alignment.attr}/>"

      /**
       * Adds text (with a line break) to the label, prepended by the [indentString] repeated
       * [indentLevel] times.
       */
      operator fun String.unaryPlus() {
        contentsBuilder.append(indentString.repeat(indentLevel))
        contentsBuilder.append(this@unaryPlus)
        contentsBuilder.append(br)
      }

      /**
       * Indents the text added using [addText] or [addLine] within the supplied [builder] one level
       * deeper.
       */
      fun indent(builder: Builder.() -> Unit) {
        indentLevel++
        builder()
        indentLevel--
      }

      /** Left-aligns any text added within the provided lambda. */
      fun left(builder: Builder.() -> Unit) = align(Alignment.LEFT, builder)

      /** Center-aligns any text added within the provided lambda. */
      fun center(builder: Builder.() -> Unit) = align(Alignment.CENTER, builder)

      /** Right-aligns any text added within the provided lambda. */
      fun right(builder: Builder.() -> Unit) = align(Alignment.RIGHT, builder)

      private fun align(alignment: Alignment, builder: Builder.() -> Unit) {
        val before = this.alignment
        this.alignment = alignment
        builder()
        this.alignment = before
      }

      internal fun build(): String = contentsBuilder.toString()
    }

    enum class Alignment(val attr: String) {
      LEFT("ALIGN=\"LEFT\""),
      CENTER("ALIGN=\"CENTER\""),
      RIGHT("ALIGN=\"RIGHT\""),
    }
  }

  companion object {
    private const val DEFAULT_INDENT = "&nbsp;&nbsp;"

    private fun String.escapeQuotes(): String = replace("\"", "&quot;")
  }
}
