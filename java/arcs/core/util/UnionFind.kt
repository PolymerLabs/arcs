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

package arcs.core.util

/**
 * A union-find datastructure for computing equivalence classes consisting of [E] instances.
 * Optionally, a value of type [I] may be associated with the equivalence class. If the client
 * does not need to associated additional information with the class, they may use the [Unit]
 * type for [I]. This datastructure is not thread safe.
 */
class UnionFind<E, I> {
    /**
     * Unifies the equivalence classes of elements [e1] and [e2]. If either element is not present
     * in any set, it is added. The [combine] function determines how the information associated
     * with the two equivalence classes are merged. The default [combine] method returns the
     * information associated with the new root.
     */
    fun union(
        e1: E,
        e2: E,
        combine: (destInfo: I?, srcInfo: I?) -> I? = {
            destInfo: I?, _: I? -> destInfo
        }
    ) {
        val e1Root = e1.findRoot()
        val e2Root = e2.findRoot()
        if (e1Root !== e2Root) {
            e1Root.parent = e2Root
            e2Root.info = combine(e2Root.info, e1Root.info)
            e1Root.info = null
        }
    }

    /**
     * Find the equivalence class for the element [e]. If the element
     * is not already present in any set, a new singleton set is created.
     */
    fun find(e: E): E = e.findRoot().element

    /**
     * Update the information for the equivalence class for [e] with [info].
     */
    fun setInfo(e: E, info: I) { e.findRoot().info = info }

    /**
     * Returns the information associated with the equivalence class for [e].
     */
    fun getInfo(e: E): I? = e.findRoot().info

    /**
     * If [e] is not already in any set, create a set with a single element.
     * Optionally, associate [info] with the newly created set.
     */
    fun makeSet(e: E, info: I? = null) { getOrCreateNode(e, info) }

    /**
     * Get or create a union-find node for the element [e].
     * Optionally, associate [info] with the newly created set.
     */
    private fun getOrCreateNode(e: E, info: I? = null): Node<E, I> =
        nodes[e] ?: Node(e, null, info).also { nodes[e] = it }

    /**
     * Returns the root node for element [e].
     */
    private fun E.findRoot(): Node<E, I> {
        var node = getOrCreateNode(this)
        var parent = node.parent
        while (parent != null) {
            node = parent
            parent = node.parent
        }
        return node
    }

    private val nodes = mutableMapOf<E, Node<E, I>>()

    /**
     * A node in the union find datastructure.
     */
    private data class Node<E, I>(
        val element: E,
        var parent: Node<E, I>? = null,
        var info: I? = null)
}
