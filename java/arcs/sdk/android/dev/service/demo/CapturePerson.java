package arcs.sdk.android.dev.service.demo;

import java.util.Map;

import arcs.sdk.android.dev.api.Collection;
import arcs.sdk.android.dev.api.Handle;
import arcs.sdk.android.dev.api.ParticleBase;
import arcs.sdk.android.dev.api.PortableJson;

@SuppressWarnings("FutureReturnValueIgnored")
class CapturePerson extends ParticleBase {

  @Override
  public void setHandles(Map<String, Handle> handleByName) {
    super.setHandles(handleByName);
    ((Collection) getHandle("people"))
        .toList()
        .thenAccept(
            model -> generatePerson(model == null ? 0 : (model.getLength() + 1)));
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
