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
 * This datastructure is not thread safe.
 */
class UnionFind<E> {
    /**
     * Unifies the equivalence classes of elements [e1] and [e2]. If either
     * element is not present in any set, it is added.
     */
    fun union(e1: E, e2: E) {
        val e1Root = e1.findRoot()
        val e2Root = e2.findRoot()
        if (e1Root !== e2Root) {
            e1Root.parent = e2Root
        }
    }

    /**
     * Find the equivalence class for the element [e]. If the element
     * is not already present in any set, a new singleton set is created.
     */
    fun find(e: E): E = e.findRoot().element

    /**
     * If [e] is not already in any set, create a set with a single element.
     */
    fun makeSet(e: E) {
        getOrCreateNode(e)
    }

    /**
     * Get or create a union-find node for the element [e].
     */
    private fun getOrCreateNode(e: E): Node<E> =
        nodes[e] ?: Node(e, null).also { nodes[e] = it }

    /**
     * Returns the root node for element [e].
     */
    private fun E.findRoot(): Node<E> {
        var node = getOrCreateNode(this)
        var parent = node.parent
        while (parent != null) {
            node = parent
            parent = node.parent
        }
        return node
    }

    private val nodes = mutableMapOf<E, Node<E>>()

    /**
     * A node in the union find datastructure.
     */
    private data class Node<E>(val element: E, var parent: Node<E>? = null)
}
