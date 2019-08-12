package arcs.api;

public class EntityType extends Type {
  private final Schema entitySchema;

  public EntityType(Schema entitySchema) {
    super(Type.Tag.ENTITY);
    this.entitySchema = entitySchema;
  }

  @Override
  public Schema getEntitySchema() {
    return entitySchema;
  }
}
