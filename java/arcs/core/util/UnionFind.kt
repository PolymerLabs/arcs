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

package arcs.core.util

/// A union-find datastructure for computing equivalence classes
/// consisting of `Element` instances.
class UnionFind<Element> {
  // A node in the union find datastructure.
  private inner class Node(e: Element, p: Node?) {
    val element: Element = e
    var parent: Node? = p
  }

  private val nodes = HashMap<Element, Node>()

  // Unifies the equivalence classes of elements `e1` and `e2`. If an
  // element is not present in any set, it is added.
  fun union(e1: Element, e2: Element) {
    val e1Root = findRoot(e1)
    val e2Root = findRoot(e2)
    if (e1Root != e2Root) {
      e1Root.parent = e2Root
    }
  }

  // Find the equivalence class for the given element. If the element
  // is not already present in any set, a new singleton set is created.
  fun find(e: Element): Element {
    return findRoot(e).element
  }

  // If it is not already in the set, create a set with a single element.
  fun makeSet(e: Element) {
    getOrCreateNode(e)
  }

  private fun getOrCreateNode(e: Element): Node {
    var result = nodes[e]
    if (result == null) {
      result = Node(e, null)
      nodes[e] = result
    }
    return result
  }

  private fun findRoot(e: Element): Node {
    var node: Node = getOrCreateNode(e)
    var parent: Node? = node.parent
    while (parent != null) {
      node = parent
      parent = node.parent
    }
    return node
  }
}
