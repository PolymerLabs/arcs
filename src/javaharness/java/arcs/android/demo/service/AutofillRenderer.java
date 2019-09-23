package arcs.android.demo.service;

import android.content.Context;
import android.service.autofill.Dataset;
import android.service.autofill.FillResponse;
import android.view.autofill.AutofillId;
import android.view.autofill.AutofillValue;
import android.widget.RemoteViews;

import java.util.HashMap;
import java.util.Map;
import java.util.function.Consumer;

import javax.inject.Inject;
import javax.inject.Singleton;

import arcs.android.api.Annotations;
import arcs.api.PortableJson;
import arcs.api.UiRenderer;

@Singleton
public class AutofillRenderer implements UiRenderer {

  public static class SlotInfo {
    final AutofillId autofillId;
    final Consumer<FillResponse> callback;

    SlotInfo(AutofillId autofillId, Consumer<FillResponse> callback) {
      this.autofillId = autofillId;
      this.callback = callback;
    }
  }

  private final Map<String, SlotInfo> slotById = new HashMap<>();
  private final Context context;

  @Inject
  AutofillRenderer(@Annotations.AppContext Context context) {
    this.context = context;
  }

  @Override
  public boolean render(PortableJson content) {
    PortableJson data = content.getObject("data");
    String slotId = data.getString("outputSlotId");

    // TODO: This is a hack: falling back to arcId.
    // The slotId is the ID of a particle rendering, not the particle providing the slot.
    if (!slotById.containsKey(slotId) && data.hasKey("arcId")) {
      slotId = data.getString("arcId");
    }
    SlotInfo slotInfo = slotById.get(slotId);

    if (slotInfo == null) {
      return false;
    }

    // Trigger autofill callback.
    String suggestion = data.getString("candidate");
    Dataset.Builder dataset = new Dataset.Builder();
    dataset.setValue(
        slotInfo.autofillId, AutofillValue.forText(suggestion), createRemoteView(suggestion));

    FillResponse fillResponse = new FillResponse.Builder().addDataset(dataset.build()).build();
    slotInfo.callback.accept(fillResponse);

    // Remove slot info.
    slotById.remove(slotId);
    return true;
  }

  void addCallback(String slotId, AutofillId autofillId, Consumer<FillResponse> callback) {
    if (slotById.containsKey(slotId)) {
      throw new IllegalArgumentException("Callback already exists for " + slotId.toString());
    }
    slotById.put(slotId, new SlotInfo(autofillId, callback));
  }

  private RemoteViews createRemoteView(String contents) {
    RemoteViews view = new RemoteViews(context.getPackageName(), R.layout.autofill_result);
    view.setTextViewText(R.id.autofill_result_text, contents);
    return view;
  }
}
