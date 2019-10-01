package arcs.android.demo.service;

import android.app.assist.AssistStructure.ViewNode;
import arcs.api.Collection;
import arcs.api.Handle;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;

import java.util.Map;

public class AutofillParticle extends ParticleBase {

  private final ViewNode node;

  AutofillParticle(ViewNode node) {
    this.node = node;
  }

  @Override
  public void setHandles(Map<String, Handle> handleByName) {
    super.setHandles(handleByName);

    Collection requestHandle = (Collection) handleByName.get("request");
    // Fill in the request handle so the rest of the recipe can use the data.
    // NOTE: request is an `out` handle, it doesn't get onHandleSync calls.
    requestHandle.store(jsonParser.emptyObject().put("rawData", getJsonRequest()));
  }

  private PortableJson getJsonRequest() {
    PortableJson request = jsonParser.emptyObject();

    String[] hints = node.getAutofillHints();
    if (hints != null && hints.length > 0) {
      request.put("hint", hints[0]);
    }
    return request;
  }

  @Override
  public boolean providesSlot() { return true; }
}
