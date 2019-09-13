package arcs.android.demo.service;

import android.app.assist.AssistStructure;
import android.app.assist.AssistStructure.ViewNode;
import android.os.CancellationSignal;
import android.service.autofill.AutofillService;
import android.service.autofill.FillCallback;
import android.service.autofill.FillContext;
import android.service.autofill.FillRequest;
import android.service.autofill.SaveCallback;
import android.service.autofill.SaveRequest;
import java.util.ArrayList;
import java.util.List;
import javax.inject.Inject;

/**
 * Demo implementation of an {@link AutofillService} for Arcs. This service retrieves Autofill
 * suggestions from Arcs, and makes them available on Android.
 */
public class ArcsAutofillService extends AutofillService {

  @Inject AutofillParticle.Factory autofillParticleFactory;
  // @Inject ArcsServiceBridge arcsServiceBridge;
  // @Inject HarnessController harnessController;

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

    AutofillParticle particle = autofillParticleFactory.create(nodes, callback);
    
    // AutofillRenderer renderer = new AutofillRenderer(this, nodes, callback);
    //
    // // TODO: Eep! This should not be set once the ArcsService boots up, not every time! :O
    // harnessController.getUiBroker().addRenderer("autofill", renderer);

    // TODO: How to start/run particle?
  }

  @Override
  public void onSaveRequest(SaveRequest request, SaveCallback callback) {}

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
