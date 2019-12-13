package arcs.api;

import java.util.HashMap;
import java.util.Map;

class ParticleSpec {
  public final String name;
  public final String implFile;
  private final Map<String, HandleConnectionSpec> handleConnectionMap = new HashMap<>();

  ParticleSpec(String name, String implFile) {
    this.name = name;
    this.implFile = implFile;
  }

  public boolean isInput(String name) {
    return handleConnectionMap.get(name).isInput();
  }

  public boolean isOutput(String name) {
    return handleConnectionMap.get(name).isOutput();
  }

  public String getFileName() {
    return implFile.substring(implFile.lastIndexOf('/') + 1, implFile.lastIndexOf('.'));
  }

  public HandleConnectionSpec getConnectionByName(String name) {
    return this.handleConnectionMap.get(name);
  }

  public static class HandleConnectionSpec {
    public final String name;
    public final String direction;
    public final Type type;
    public final boolean isOptional;

    HandleConnectionSpec(String name, String direction, Type type, boolean isOptional) {
      this.name = name;
      this.direction = direction;
      this.type = type;
      this.isOptional = isOptional;
    }

    boolean isInput() {
      return this.direction.equals("in") || this.direction.equals("inout")
          || this.direction.equals("reads") || this.direction.equals("reads writes");
    }

    boolean isOutput() {
      return this.direction.equals("out") || this.direction.equals("inout")
          || this.direction.equals("writes") || this.direction.equals("reads writes");
    }

    static HandleConnectionSpec fromJson(PortableJson json) {
      return new HandleConnectionSpec(
          json.getString("name"),
          json.getString("direction"),
          TypeFactory.typeFromJson(json.getObject("type")),
          json.getBool("isOptional"));
    }
  }

  public static ParticleSpec fromJson(PortableJson json) {
    ParticleSpec spec = new ParticleSpec(json.getString("name"), json.getString("implFile"));
    PortableJson args = json.getArray("args");
    for (int i = 0; i < args.getLength(); ++i) {
      HandleConnectionSpec handleSpec = HandleConnectionSpec.fromJson(args.getObject(i));
      spec.handleConnectionMap.put(handleSpec.name, handleSpec);
    }
    return spec;
  }
}
