package arcs.api;

import java.util.ArrayList;

public class Schema {
    enum FieldKind {
        PRIMITIVE, UNION, TUPLE
    }
    public static abstract class Field {
        public final FieldKind kind;
        Field(FieldKind kind) {
            this.kind = kind;
        }
        public boolean isPrimitive() { return this.kind == FieldKind.PRIMITIVE; }
        public boolean isUnion() { return this.kind == FieldKind.UNION; }
        public boolean isTuple() { return this.kind == FieldKind.TUPLE; }
    }
    public static class PrimitiveField extends Field {
        public final String type;
        PrimitiveField(String type) {
            super(FieldKind.PRIMITIVE);
            this.type = type;
        }
    }
    public static class UnionField extends Field {
        public final Field types[];
        public UnionField(Field types[]) {
            super(FieldKind.UNION);
            this.types = types;
        }
    }
    public static class TupleField extends Field {
        public final Field types[];
        public TupleField(Field types[]) {
            super(FieldKind.TUPLE);
            this.types = types;
        }
    }

    static Field fieldFromJson(PortableJson json) {
        String kind = json.getString("kind");
        if (kind.equals("schema-primitive")) {
            return new PrimitiveField(json.getString("type"));
        } else {
            PortableJson types = json.getObject("types");
            Field fields[] = new Field[types.getLength()];
            for (int i = 0; i < types.getLength(); ++i) {
                fields[i] = fieldFromJson(types.getObject(i));
            }
            if (kind.equals("schema-union")) {
                return new UnionField(fields);
            } else if (kind.equals("schema-tuple")) {
                return new TupleField(fields);
            }
        }
        throw new AssertionError("Unsupported schema field kind " + kind);
    }

    public final String names[];
    public final Field fields[];
    public Schema(String names[], Field fields[]) {
        this.names = names;
        this.fields = fields;
    }

    public static Schema fromJson(PortableJson json) {
        PortableJson namesJson = json.getObject("names");
        String names[] = new String[namesJson.getLength()];
        for (int i = 0; i < namesJson.getLength(); ++i) {
            names[i] = namesJson.getString(i);
        }
        PortableJson fieldsJson = json.getObject("fields");
        ArrayList<Field> fields = new ArrayList<Field>();
        fieldsJson.forEach(fieldName -> {
            fields.add(Schema.fieldFromJson(fieldsJson.getObject(fieldName)));
        });
        return new Schema(names, fields.toArray(new Field[fields.size()]));
    }
}
