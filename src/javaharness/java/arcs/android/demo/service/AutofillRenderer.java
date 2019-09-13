package arcs.android.demo.service;

import android.app.assist.AssistStructure.ViewNode;
import android.content.Context;
import android.service.autofill.Dataset;
import android.service.autofill.FillCallback;
import android.service.autofill.FillResponse;
import android.view.autofill.AutofillValue;
import android.widget.RemoteViews;
import arcs.api.PortableJson;
import arcs.api.UiRenderer;
import java.util.List;

public class AutofillRenderer implements UiRenderer {

  private final List<ViewNode> nodes;
  private final FillCallback callback;
  private final Context context;

  AutofillRenderer(Context context, List<ViewNode> nodes, FillCallback callback) {
    this.context = context;
    this.nodes = nodes;
    this.callback = callback;
  }

  @Override
  public boolean render(PortableJson content) {
    // TODO: Parse the JSON here.
    String suggestion = content.toString();

    Dataset.Builder dataset = new Dataset.Builder();
    for (ViewNode node : nodes) {
      dataset.setValue(
          node.getAutofillId(), AutofillValue.forText(suggestion), createRemoteView(suggestion));
    }

    FillResponse fillResponse = new FillResponse.Builder().addDataset(dataset.build()).build();
    callback.onSuccess(fillResponse);

    return true;
  }

  private RemoteViews createRemoteView(String contents) {
    RemoteViews view = new RemoteViews(context.getPackageName(), R.layout.autofill_result);
    view.setTextViewText(R.id.autofill_result_text, contents);
    return view;
  }
}
