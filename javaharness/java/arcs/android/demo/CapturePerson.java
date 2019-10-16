package arcs.android.demo;

import java.util.Map;

import arcs.api.Collection;
import arcs.api.Handle;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;

@SuppressWarnings("FutureReturnValueIgnored")
class CapturePerson extends ParticleBase {

  @Override
  public void setHandles(Map<String, Handle> handleByName) {
    super.setHandles(handleByName);
    ((Collection) getHandle("people"))
        .toList()
        .thenAccept(
            model -> {
              generatePerson(model == null ? 0 : (model.getLength() + 1));
            });
  }

  public void generatePerson(int index) {
    PortableJson person =
        jsonParser
            .emptyObject()
            .put("firstName", "Foo" + index)
            .put("lastName", "Bar" + index)
            .put("password", "password-" + index)
            .put("phone", index + "-phone")
            .put("postalAddress", String.format("%d-%d Main st.", index, index));
    ((Collection) getHandle("people")).store(jsonParser.emptyObject().put("rawData", person));
  }
}
