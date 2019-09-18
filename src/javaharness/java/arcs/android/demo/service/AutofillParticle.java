package arcs.android.demo.service;

import android.app.assist.AssistStructure.ViewNode;
import android.view.autofill.AutofillId;
import arcs.api.Collection;
import arcs.api.Handle;
import arcs.api.ParticleBase;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import java.util.ArrayList;
import java.util.List;

public class AutofillParticle extends ParticleBase {

  private final List<ViewNode> nodes;
  private final AutofillCallback callback;

  public interface AutofillCallback {
    void onAutofillResult(AutofillId autofillId, String suggestion);
  }

  AutofillParticle(PortableJsonParser jsonParser, List<ViewNode> nodes, AutofillCallback callback) {
    this.jsonParser = jsonParser;
    this.nodes = nodes;
    this.callback = callback;
  }

  @Override
  public String getName() {
    return "AutofillParticle";
  }

  // Called when the particle is first synced with its handles. Fill in the request handle so the
  // rest of the recipe can use the data.
  @Override
  public void onHandleSync(Handle handle, PortableJson model) {
    super.onHandleSync(handle, model);

    if (handle.name.equals("request")) {
      Collection requestHandle = (Collection) handle;
      for (PortableJson request : getJsonRequests()) {
        requestHandle.store(request);
      }
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
        PortableJson response = added.getObject(i);
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
