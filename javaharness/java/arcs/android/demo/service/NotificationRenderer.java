package arcs.android.demo.service;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.util.Log;

import javax.inject.Inject;
import javax.inject.Singleton;

import arcs.android.api.Annotations;
import arcs.android.service.ArcsService;
import arcs.api.PortableJson;
import arcs.api.PortableJsonParser;
import arcs.api.UiRenderer;

@Singleton
public class NotificationRenderer implements UiRenderer {

  private static final int REQUEST_CODE_TAP = 0;
  private static final int REQUEST_CODE_DISMISS = 1;
  private static final String TITLE_FIELD = "title";
  private static final String TEXT_FIELD = "text";
  private static final String TAP_HANDLER_FIELD = "tapHandler";
  private static final String DISMISS_HANDLER_FIELD = "dismissHandler";
  private static final String HANDLER_FIELD = "handler";
  private static final String OUTPUT_SLOT_ID_FIELD = "outputSlotId";
  private static final String CHANNEL_ID = "ArcsNotification";

  private final Context context;
  private final PortableJsonParser jsonParser;

  private static final String TAG = NotificationRenderer.class.getSimpleName();

  @Inject
  NotificationRenderer(@Annotations.AppContext Context context, PortableJsonParser jsonParser) {
    this.context = context;
    this.jsonParser = jsonParser;

    NotificationChannel channel =
        new NotificationChannel(CHANNEL_ID, "Arcs", NotificationManager.IMPORTANCE_DEFAULT);
    NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
    notificationManager.createNotificationChannel(channel);
  }

  @Override
  public boolean render(PortableJson packet) {
    PortableJson content = packet.getObject("content");
    String title = content.getString(TITLE_FIELD);
    String text = content.getString(TEXT_FIELD);

    Log.d(TAG, "Notification rendering: " + title + "(" + text + ")");
    Notification.Builder builder =
        new Notification.Builder(context, CHANNEL_ID)
            .setSmallIcon(R.drawable.baseline_notification_important_black_18)
            .setContentTitle(title)
            .setContentText(text);

    String outputSlotId = packet.getString(OUTPUT_SLOT_ID_FIELD);
    // TODO(mmandlis): refactor to a generic method usable by other renderers as well.
    if (content.hasKey(TAP_HANDLER_FIELD)) {
      // Construct pendingIntent for notification tap.
      String handler = content.getString(TAP_HANDLER_FIELD);
      PendingIntent pendingIntent = PendingIntent.getService(
        context,
        REQUEST_CODE_TAP,
        getNotificationIntent(outputSlotId, handler),
        PendingIntent.FLAG_UPDATE_CURRENT);
      builder.setContentIntent(pendingIntent);
    }

    if (content.hasKey(DISMISS_HANDLER_FIELD)) {
      // Construct pendingIntent for notification dismiss.
      String handler = content.getString(DISMISS_HANDLER_FIELD);
      PendingIntent pendingIntent = PendingIntent.getService(
        context,
        REQUEST_CODE_DISMISS,
        getNotificationIntent(outputSlotId, handler),
        PendingIntent.FLAG_UPDATE_CURRENT);
      builder.setDeleteIntent(pendingIntent);
    }

    NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
    // TODO: Let particle control the notification id, in case it features multiple notifications.
    notificationManager.notify(outputSlotId.hashCode(), builder.build());

    return true;
  }

  private Intent getNotificationIntent(String outputSlotId, String handler) {
    Intent intent = new Intent(context, ArcsService.class);
    intent.setAction(outputSlotId);
    intent.putExtra(ArcsService.INTENT_REFERENCE_ID_FIELD, outputSlotId);
    intent.putExtra(
      ArcsService.INTENT_EVENT_DATA_FIELD,
      jsonParser.stringify(
        jsonParser.emptyObject().put(HANDLER_FIELD, handler)));

    return intent;
  }
}
