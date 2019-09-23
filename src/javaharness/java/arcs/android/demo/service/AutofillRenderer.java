package arcs.android.demo.service;

import android.view.autofill.AutofillId;
import android.service.autofill.Dataset;
import android.service.autofill.FillCallback;
import android.service.autofill.FillResponse;
import android.view.autofill.AutofillValue;
import android.widget.RemoteViews;
import arcs.api.UiRenderer;
import arcs.api.PortableJson;

import java.util.HashMap;
import java.util.Map;
import javax.inject.Inject;

public class AutofillRenderer implements UiRenderer {

  public static class SlotInfo {
    final String packageName;
    final AutofillId autofillId;
    final FillCallback fillCallback;
    final Runnable customCallback;
    SlotInfo(String packageName, AutofillId autofillId, FillCallback fillCallback, Runnable customCallback) {
      this.packageName = packageName;
      this.autofillId = autofillId;
      this.fillCallback = fillCallback;
      this.customCallback = customCallback;
    }
  }
  private final Map<String, SlotInfo> slotById = new HashMap<>();

  @Inject
  AutofillRenderer() {
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
        slotInfo.autofillId,
        AutofillValue.forText(suggestion),
        createRemoteView(slotInfo.packageName, suggestion));

    FillResponse fillResponse =
        new FillResponse.Builder().addDataset(dataset.build()).build();
    slotInfo.fillCallback.onSuccess(fillResponse);

    // Run custom callback;
    slotInfo.customCallback.run();

    // Remove slot info.
    slotById.remove(slotId);
    return true;
  }

  void addCallback(String slotId, String packageName, AutofillId autofillId, FillCallback fillCallback, Runnable customCallback) {
    if (slotById.containsKey(slotId)) {
      throw new AssertionError("Callback already exists for " + slotId.toString());
    }
    slotById.put(slotId, new SlotInfo(packageName, autofillId, fillCallback, customCallback));
  }

  private RemoteViews createRemoteView(String packageName, String contents) {
    RemoteViews view = new RemoteViews(packageName, R.layout.autofill_result);
    view.setTextViewText(R.id.autofill_result_text, contents);
    return view;
  }
}
