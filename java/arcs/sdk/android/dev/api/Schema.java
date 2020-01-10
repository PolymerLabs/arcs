package arcs.sdk.android.dev.api;

import java.util.ArrayList;
import java.util.List;

class Schema {
  enum FieldKind {
    PRIMITIVE,
    UNION,
    TUPLE
  }

  public abstract static class Field {
    public final FieldKind kind;

    Field(FieldKind kind) {
      this.kind = kind;
    }

    public boolean isPrimitive() {
      return this.kind == FieldKind.PRIMITIVE;
    }

    public boolean isUnion() {
      return this.kind == FieldKind.UNION;
    }

    public boolean isTuple() {
      return this.kind == FieldKind.TUPLE;
    }
  }

  public static class PrimitiveField extends Field {
    public final String type;

    PrimitiveField(String type) {
      super(FieldKind.PRIMITIVE);
      this.type = type;
    }
  }

  public static class UnionField extends Field {
    public final List<Field> types;

    public UnionField(List<Field> types) {
      super(FieldKind.UNION);
      this.types = types;
    }
  }

  public static class TupleField extends Field {
    public final List<Field> types;

    public TupleField(List<Field> types) {
      super(FieldKind.TUPLE);
      this.types = types;
    }
  }

  static Field fieldFromJson(PortableJson json) {
    String kind = json.getString("kind");
    if (kind.equals("schema-primitive")) {
      return new PrimitiveField(json.getString("type"));
    } else {
      PortableJson types = json.getArray("types");
      List<Field> fields = new ArrayList<>(types.getLength());
      for (int i = 0; i < types.getLength(); ++i) {
        fields.add(fieldFromJson(types.getObject(i)));
      }
      if (kind.equals("schema-union")) {
        return new UnionField(fields);
      } else if (kind.equals("schema-tuple")) {
        return new TupleField(fields);
      }
    }
    throw new AssertionError("Unsupported schema field kind " + kind);
  }

  public final List<String> names;
  public final List<Field> fields;

  public Schema(List<String> names, List<Field> fields) {
    this.names = names;
    this.fields = fields;
  }

  public static Schema fromJson(PortableJson json) {
    PortableJson namesJson = json.getArray("names");
    List<String> names = new ArrayList<>(namesJson.getLength());
    for (int i = 0; i < namesJson.getLength(); ++i) {
      names.add(namesJson.getString(i));
    }
    PortableJson fieldsJson = json.getObject("fields");
    List<Field> fields = new ArrayList<>();
    fieldsJson.forEach(
        fieldName -> fields.add(Schema.fieldFromJson(fieldsJson.getObject(fieldName))));
    return new Schema(names, fields);
  }
}
