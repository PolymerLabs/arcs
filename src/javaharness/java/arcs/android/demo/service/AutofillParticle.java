package arcs.android.demo.service;

import android.app.assist.AssistStructure.ViewNode;
import android.util.Log;
import android.view.autofill.AutofillId;
import arcs.api.Collection;
import arcs.api.Handle;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class AutofillParticle extends ParticleBase {

  private final List<ViewNode> nodes;
  private final AutofillCallback callback;

  private static final String TAG = "Arcs";

  public interface AutofillCallback {
    void onAutofillResult(AutofillId autofillId, String suggestion);
  }

  AutofillParticle(PortableJsonParser jsonParser, List<ViewNode> nodes, AutofillCallback callback) {
    this.jsonParser = jsonParser;
    this.nodes = nodes;
    this.callback = callback;

    Log.d(TAG, "AutofillParticle::ctor()");
  }

  @Override
  public void setHandles(Map<String, Handle> handleByName) {
    super.setHandles(handleByName);

    Collection requestHandle = (Collection) handleByName.get("request");
    // Fill in the request handle so the rest of the recipe can use the data.
    // NOTE: request is an `out` handle, it doesn't get onHandleSync calls.
    for (PortableJson request : getJsonRequests()) {
      requestHandle.store(jsonParser.emptyObject().put("rawData", request));
    }
  }

  // Called when the particle's handles are updated. Return the autofill suggestion back to the
  // caller.
  @Override
  public void onHandleUpdate(Handle handle, PortableJson update) {
    super.onHandleUpdate(handle, update);

    if (handle.name.equals("response") && update.hasKey("added")) {
      PortableJson added = update.getArray("added");
      for (int i = 0; i < added.getLength(); i++) {
        PortableJson response = added.getObject(i).getObject("rawData");
        AutofillId autofillId = nodes.get(response.getInt("autofillId")).getAutofillId();
        String suggestion = response.getString("suggestion");
        callback.onAutofillResult(autofillId, suggestion);
      }
    }
  }

  private List<PortableJson> getJsonRequests() {
    List<PortableJson> requests = new ArrayList<>();
    for (int id = 0; id < nodes.size(); id++) {
      PortableJson request = jsonParser.emptyObject().put("autofillId", id);

      ViewNode node = nodes.get(id);
      String[] hints = node.getAutofillHints();
      if (hints != null && hints.length > 0) {
        request.put("hint", hints[0]);
      }
      requests.add(request);
    }
    return requests;
  }
}
