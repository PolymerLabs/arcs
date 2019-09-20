package arcs.android.demo.service;

import android.app.assist.AssistStructure;
import android.app.assist.AssistStructure.ViewNode;
import android.os.CancellationSignal;
import android.service.autofill.AutofillService;
import android.service.autofill.Dataset;
import android.service.autofill.FillCallback;
import android.service.autofill.FillContext;
import android.service.autofill.FillRequest;
import android.service.autofill.FillResponse;
import android.service.autofill.SaveCallback;
import android.service.autofill.SaveRequest;
import android.view.autofill.AutofillValue;
import android.widget.RemoteViews;
import arcs.android.client.RemotePec;
import arcs.api.PortableJsonParser;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import javax.inject.Inject;

/**
 * Demo implementation of an {@link AutofillService} for Arcs. This service retrieves Autofill
 * suggestions from Arcs, and makes them available on Android.
 */
public class ArcsAutofillService extends AutofillService {

  @Inject RemotePec remotePec;
  @Inject PortableJsonParser jsonParser;

  @Override
  public void onCreate() {
    super.onCreate();

    DaggerArcsAutofillServiceComponent.builder()
        .appContext(getApplicationContext())
        .build()
        .inject(this);
  }

  @Override
  public void onFillRequest(
      FillRequest request, CancellationSignal cancellationSignal, FillCallback callback) {
    List<FillContext> fillContexts = request.getFillContexts();
    AssistStructure structure = fillContexts.get(fillContexts.size() - 1).getStructure();
    List<ViewNode> nodes = collectViewNodes(structure);

    // Find which view the user has focused on.
    Optional<ViewNode> node = nodes.stream().filter(ViewNode::isFocused).findAny();

    if (!node.isPresent()) {
      callback.onSuccess(null);
      return;
    }

    Dataset.Builder dataset = new Dataset.Builder();

    AutofillParticle particle =
        new AutofillParticle(
            jsonParser,
            node.get(),
            (autofillId, suggestion) -> {
              dataset.setValue(
                  autofillId, AutofillValue.forText(suggestion), createRemoteView(suggestion));

              FillResponse fillResponse =
                  new FillResponse.Builder().addDataset(dataset.build()).build();

              callback.onSuccess(fillResponse);
              // TODO: Shutdown the RemotePec.
            });

    // Start up an Arcs remote PEC and arc with a particle.
    // TODO: Generate Ids properly.
    particle.setId("autofill-particle-id");
    String pecId = "example-remote-pec";
    remotePec.init(
        String.format("arc-%s", pecId),
        pecId,
        "AndroidAutofill",
        particle);
  }

  @Override
  public void onSaveRequest(SaveRequest request, SaveCallback callback) {}

  private RemoteViews createRemoteView(String contents) {
    RemoteViews view = new RemoteViews(getPackageName(), R.layout.autofill_result);
    view.setTextViewText(R.id.autofill_result_text, contents);
    return view;
  }

  private static List<ViewNode> collectViewNodes(AssistStructure structure) {
    ArrayList<ViewNode> result = new ArrayList<>();

    int numNodes = structure.getWindowNodeCount();
    for (int i = 0; i < numNodes; i++) {
      ViewNode node = structure.getWindowNodeAt(i).getRootViewNode();
      collectViewNodes(node, result);
    }

    return result;
  }

  private static void collectViewNodes(ViewNode node, ArrayList<ViewNode> result) {
    result.add(node);

    int numChildren = node.getChildCount();
    for (int i = 0; i < numChildren; i++) {
      collectViewNodes(node.getChildAt(i), result);
    }
  }
}
