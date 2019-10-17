package arcs.api;

abstract class Type {
  enum Tag {
    UNKNOWN,
    ENTITY,
    COLLECTION;

    public boolean isCollection() {
      return this == COLLECTION;
    }

    public boolean isEntity() {
      return this == ENTITY;
    }

    public static Tag fromString(String tag) {
      try {
        return Tag.valueOf(tag.toUpperCase());
      } catch (Exception e) {
        return UNKNOWN;
      }
    }
  }

  public final Tag tag;

  public Type(Tag tag) {
    this.tag = tag;
  }

  public boolean isCollection() {
    return this.tag.isCollection();
  }

  public boolean isEntity() {
    return this.tag.isEntity();
  }

  public abstract Schema getEntitySchema();
}
