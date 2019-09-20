package arcs.android.demo.service;

import android.app.assist.AssistStructure.ViewNode;
import android.util.Log;
import android.view.autofill.AutofillId;
import arcs.api.Collection;
import arcs.api.Handle;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;

import java.util.Map;

public class AutofillParticle extends ParticleBase {

  private final ViewNode node;
  private final AutofillCallback callback;

  private static final String TAG = "Arcs";

  public interface AutofillCallback {
    void onAutofillResult(AutofillId autofillId, String suggestion);
  }

  AutofillParticle(PortableJsonParser jsonParser, ViewNode node, AutofillCallback callback) {
    this.jsonParser = jsonParser;
    this.node = node;
    this.callback = callback;

    Log.d(TAG, "AutofillParticle::ctor()");
  }

  @Override
  public void setHandles(Map<String, Handle> handleByName) {
    super.setHandles(handleByName);

    Collection requestHandle = (Collection) handleByName.get("request");
    // Fill in the request handle so the rest of the recipe can use the data.
    // NOTE: request is an `out` handle, it doesn't get onHandleSync calls.
    requestHandle.store(jsonParser.emptyObject().put("rawData", getJsonRequest()));
  }

  // Called when the particle's handles are updated. Return the autofill suggestion back to the
  // caller.
  @Override
  public void onHandleUpdate(Handle handle, PortableJson update) {
    super.onHandleUpdate(handle, update);

    if (handle.name.equals("response") && update.hasKey("added")) {
      PortableJson added = update.getArray("added");
      if (added.getLength() != 1) {
        throw new IllegalStateException("Expected a single result.");
      }
      PortableJson response = added.getObject(0).getObject("rawData");
      String suggestion = response.getString("suggestion");
      callback.onAutofillResult(node.getAutofillId(), suggestion);
    }
  }

  private PortableJson getJsonRequest() {
    PortableJson request = jsonParser.emptyObject();

    String[] hints = node.getAutofillHints();
    if (hints != null && hints.length > 0) {
      request.put("hint", hints[0]);
    }
    return request;
  }
}
