package arcs.api;

import java.util.Arrays;

/**
 * An immutable object consisting of two components: a root, and an idTree.
 * The root is the session ID from the particular session in which the ID was
 * constructed (see the IdGenerator class). The idTree is a list of
 * subcomponents, forming a hierarchy of IDs (child IDs are created by
 * appending subcomponents to their parent ID"s idTree).
 */
// copied from id.ts
public class Id {
  /** The Session ID of the session during which the ID got created. See IdGenerator class. */
  final String root;

  /** The components of the idTree. */
  final String idTree[];

  /** Protected constructor. Use IdGenerator to create new IDs instead. */
  protected Id(String root, String idTree[]) {
    this.root = root;
    this.idTree = idTree;
  }

  /** Creates a new ID. Use IdGenerator to create new IDs instead. */
  static Id newIdInternal(String root, String idTree[]) {
    return new Id(root, idTree);
  }

  /** Parses a string representation of an ID (see toString). */
  public static Id fromString(String str) {
    String bits[] = str.split(":");

    if (bits[0].startsWith("!")) {
      String root = bits[0].substring(1);
      String idTree[] = Arrays.asList(Arrays.copyOfRange(bits, 1, bits.length))
          .stream().filter(component -> component.length() > 0).toArray(String[]::new);
      return new Id(root, idTree);
    } else {
      return new Id("", bits);
    }
  }

  /** Returns the full ID string. */
  public String toString() {
    return "!" + root + ":" + String.join(":", idTree);
  }

  /** Returns the idTree as as string (without the root). */
  String idTreeAsString() {
    return String.join(":", idTree);
  }

  boolean equal(Id id) {
    if (!id.root.equals(this.root) || id.idTree.length != this.idTree.length) {
      return false;
    }
    for (int i = 0; i < id.idTree.length; i++) {
      if (!id.idTree[i].equals(this.idTree[i])) {
        return false;
      }
    }
    return true;
  }
}
