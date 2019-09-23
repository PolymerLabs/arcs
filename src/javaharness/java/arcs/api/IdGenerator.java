package arcs.api;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

/**
 * Generates new IDs which are rooted in the current session. Only one IdGenerator should be
 * instantiated for each running Arc, and all of the IDs created should be created using that same
 * IdGenerator instance.
 */
// copied from id.ts
public class IdGenerator {
  private final String currentSessionId;
  private int nextComponentId = 0;

  IdGenerator(String currentSessionId) {
    this.currentSessionId = currentSessionId;
  }

  public static IdGenerator newSession() {
    String sessionId = String.valueOf(Math.floor(Math.random() * Math.pow(2, 30)));
    return new IdGenerator(sessionId);
  }

  public String getSessionId() {
    return currentSessionId;
  }

  /**
   * Creates a new ID, as a child of the given parentId. The given subcomponent will be appended to
   * the component hierarchy of the given ID, but the generator's random session ID will be used as
   * the ID's root.
   */
  public Id newChildId(Id parentId, String subcomponent) {
    // Append (and increment) a counter to the subcomponent, to ensure that it is unique.
    subcomponent += this.nextComponentId++;
    List<String> idTree = new ArrayList<>(Arrays.asList(parentId.idTree));
    idTree.add(subcomponent);
    return Id.newIdInternal(this.currentSessionId, idTree.toArray(new String[0]));
  }
}
