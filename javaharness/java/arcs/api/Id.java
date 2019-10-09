package arcs.api;

import java.util.Arrays;
import java.util.Date;

/**
 * An immutable object consisting of two components: a root, and an idTree. The root is the session
 * ID from the particular session in which the ID was constructed (see the IdGenerator class). The
 * idTree is a list of subcomponents, forming a hierarchy of IDs (child IDs are created by appending
 * subcomponents to their parent ID"s idTree).
 */
// copied from id.ts
public class Id {
  /** The Session ID of the session during which the ID got created. See IdGenerator class. */
  final String root;

  /** The components of the idTree. */
  final String[] idTree;

  /** Protected constructor. Use IdGenerator to create new IDs instead. */
  protected Id(String root, String[] idTree) {
    this.root = root;
    this.idTree = idTree;
  }

  /** Creates a new ID. Use IdGenerator to create new IDs instead. */
  static Id newIdInternal(String root, String[] idTree) {
    return new Id(root, idTree);
  }

  /** Parses a string representation of an ID (see toString). */
  public static Id fromString(String str) {
    String[] bits = str.split(":");

    if (bits[0].startsWith("!")) {
      String root = bits[0].substring(1);
      String[] idTree =
          Arrays.stream(Arrays.copyOfRange(bits, 1, bits.length))
              .filter(component -> component.length() > 0)
              .toArray(String[]::new);
      return new Id(root, idTree);
    } else {
      return new Id("", bits);
    }
  }

  /** Returns the full ID string. */
  @Override
  public String toString() {
    return "!" + root + ":" + String.join(":", idTree);
  }

  /** Returns the idTree as as string (without the root). */
  String idTreeAsString() {
    return String.join(":", idTree);
  }

  @Override
  public int hashCode() {
    return toString().hashCode();
  }

  @Override
  public boolean equals(Object other) {
    if (!(other instanceof Id)) {
      return false;
    }

    Id id = (Id) other;

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

  public static Id newArcId() {
    return Id.fromString(Id.generateId());
  }

  // copied from /modalities/dom/components/generate-id.js
  private static long lastPushTime = -1;
  private static int[] lastRandChars = new int[12];
  private static final String PUSH_CHARS =
      "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";

  private static String generateId() {
    // TODO: Inject a Clock (so that tests can be repeatable and deterministic).
    long now = new Date().getTime();
    boolean duplicateTime = now == lastPushTime;
    lastPushTime = now;

    char[] timeStampChars = new char[8];
    for (int i = 7; i >= 0; i--) {
      timeStampChars[i] = PUSH_CHARS.charAt((int) (now % 64));
      now = (int) Math.floor(now / 64);
    }
    if (now != 0) {
      throw new AssertionError("We should have converted the entire timestamp.");
    }

    String id = String.valueOf(timeStampChars);

    if (!duplicateTime) {
      for (int i = 0; i < 12; i++) {
        lastRandChars[i] = (int) Math.floor(Math.random() * 64);
      }
    } else {
      int i;
      // If the timestamp hasn't changed since last push, use the same random number, except
      // incremented by 1.
      for (i = 11; i >= 0 && lastRandChars[i] == 63; i--) {
        lastRandChars[i] = 0;
      }
      lastRandChars[i]++;
    }
    for (int i = 0; i < 12; i++) {
      id += PUSH_CHARS.charAt(lastRandChars[i]);
    }
    return id;
  }
}
