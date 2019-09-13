package arcs.android.demo.service;

import android.app.assist.AssistStructure.ViewNode;
import android.content.Context;
import android.service.autofill.Dataset;
import android.service.autofill.FillCallback;
import android.service.autofill.FillResponse;
import android.view.autofill.AutofillValue;
import android.widget.RemoteViews;
import arcs.android.client.AndroidClientParticle;
import arcs.android.client.ArcsServiceBridge;
import arcs.api.Collection;
import arcs.api.Handle;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import java.util.List;
import java.util.Map;
import javax.inject.Inject;
import javax.inject.Named;

public class AutofillParticle extends AndroidClientParticle {

  private final List<ViewNode> nodes;
  private final FillCallback callback;
  private final Context context;
  private final PortableJsonParser parser;

  // TODO: Use AutoFactory?
  public static class Factory {

    private final ArcsServiceBridge arcsServiceBridge;
    private final PortableJsonParser parser;
    private final Context context;

    @Inject
    Factory(
        ArcsServiceBridge arcsServiceBridge,
        PortableJsonParser parser,
        @Named("AppContext") Context context) {
      this.parser = parser;
      this.arcsServiceBridge = arcsServiceBridge;
      this.context = context;
    }

    public AutofillParticle create(List<ViewNode> nodes, FillCallback callback) {
      return new AutofillParticle(nodes, callback, arcsServiceBridge, parser, context);
    }
  }

  private AutofillParticle(
      List<ViewNode> nodes,
      FillCallback callback,
      ArcsServiceBridge arcsServiceBridge,
      PortableJsonParser parser,
      Context context) {
    super(arcsServiceBridge);
    this.nodes = nodes;
    this.callback = callback;
    this.parser = parser;
    this.context = context;
  }

  @Override
  public void setHandles(Map<String, Handle> handleByName) {
    super.setHandles(handleByName);

    writeRequests();
  }

  @Override
  public void onHandleSync(Handle handle, PortableJson model) {
    super.onHandleSync(handle, model);
  }

  @Override
  public void onHandleUpdate(Handle handle, PortableJson update) {
    super.onHandleUpdate(handle, update);
    if (handle.name.equals("response")) {
      // TODO: Parse the response JSON properly.
      String suggestion = update.toString();
      runCallback(suggestion);
    }
  }

  private void writeRequests() {
    // Convert data from ViewNodes into JSON.
    PortableJson jsonRequests = parser.emptyArray();
    for (int i = 0; i < nodes.size(); i++) {
      ViewNode node = nodes.get(i);
      PortableJson hints = parser.emptyArray();
      if (node.getAutofillHints() != null) {
        for (int j = 0; j < node.getAutofillHints().length; j++) {
          hints.put(j, node.getAutofillHints()[j]);
        }
      }
      PortableJson request =
          parser
              .emptyObject()
              .put("autofillId", node.getAutofillId().toString())
              .put("hints", hints);
      jsonRequests.put(i, request);
    }

    // TODO: Make this a Singleton.
    Collection requestHandle = (Collection) handleByName.get("request");
    requestHandle.store(jsonRequests);
  }

  private void runCallback(String suggestion) {
    Dataset.Builder dataset = new Dataset.Builder();
    for (ViewNode node : nodes) {
      dataset.setValue(
          node.getAutofillId(), AutofillValue.forText(suggestion), createRemoteView(suggestion));
    }

    FillResponse fillResponse = new FillResponse.Builder().addDataset(dataset.build()).build();
    callback.onSuccess(fillResponse);
  }

  private RemoteViews createRemoteView(String contents) {
    RemoteViews view = new RemoteViews(context.getPackageName(), R.layout.autofill_result);
    view.setTextViewText(R.id.autofill_result_text, contents);
    return view;
  }
}
