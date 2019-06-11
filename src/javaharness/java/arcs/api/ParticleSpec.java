package arcs.api;

import java.util.HashMap;
import java.util.Map;

public class ParticleSpec {
    public final String name;
    public final String implFile;
    private final Map<String, HandleConnectionSpec> handleConnectionMap = new HashMap();

    ParticleSpec(String name, String implFile) {
        this.name = name;
        this.implFile = implFile;
    }

    private void addHandleConnection(String name, String direction) {
        this.handleConnectionMap.put(name, new HandleConnectionSpec(name, direction));
    }

    public boolean isInput(String name) {
        HandleConnectionSpec connection = this.handleConnectionMap.get(name);
        return connection.direction == "in" || connection.direction == "inout";
    }
    public boolean isOutput(String name) {
        HandleConnectionSpec connection = this.handleConnectionMap.get(name);
        return connection.direction == "out" || connection.direction == "inout";
    }

    class HandleConnectionSpec {
        String name;
        String direction;
        // TODO: add type, isOptional and more.
        HandleConnectionSpec(String name, String direction) {
            this.name = name;
            this.direction = direction;
        }

        boolean isInput() { return this.direction == "in" || this.direction == "inout"; }
        boolean isOutput() { return this.direction == "out" || this.direction == "inout"; }
    }

    public static ParticleSpec fromJson(PortableJson json) {
        ParticleSpec spec = new ParticleSpec(json.getString("name"), json.getString("implFile"));
        PortableJson args = json.getObject("args");
        for (int i = 0; i < args.getLength(); ++i) {
            PortableJson arg = args.getObject(i);
            spec.addHandleConnection(arg.getString("name"), arg.getString("direction"));
        }
        return spec;
    }
}