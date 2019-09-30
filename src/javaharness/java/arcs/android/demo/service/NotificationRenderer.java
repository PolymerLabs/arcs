package arcs.android.demo.service;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;

import android.content.Intent;
import javax.inject.Inject;
import javax.inject.Singleton;

import arcs.android.api.Annotations;
import arcs.api.PortableJson;
import arcs.api.UiRenderer;

@Singleton
public class NotificationRenderer implements UiRenderer {

  private static final String DATA_FIELD = "data";
  private static final String TITLE_FIELD = "title";
  private static final String TEXT_FIELD = "text";
  private static final String OUTPUT_SLOT_ID_FIELD = "outputSlotId";
  private static final String CHANNEL_ID = "ArcsNotification";

  private final Context context;

  @Inject
  NotificationRenderer(@Annotations.AppContext Context context) {
    this.context = context;

    NotificationChannel channel = new NotificationChannel(
      CHANNEL_ID, "Arcs", NotificationManager.IMPORTANCE_DEFAULT);
    NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
    notificationManager.createNotificationChannel(channel);
  }

  @Override
  public boolean render(PortableJson content) {
    PortableJson data = content.getObject(DATA_FIELD);
    String title = data.getString(TITLE_FIELD);
    String text = data.getString(TEXT_FIELD);
    String outputSlotId = data.getString(OUTPUT_SLOT_ID_FIELD);

    Intent notificationIntent = new Intent(context, ArcsService.class);
    notificationIntent.putExtra(ArcsService.INTENT_REFERENCE_ID_FIELD, outputSlotId);
    PendingIntent pendingIntent =
        PendingIntent.getService(context, 0, notificationIntent, PendingIntent.FLAG_UPDATE_CURRENT);

    Notification.Builder builder = new Notification.Builder(context, CHANNEL_ID)
        .setSmallIcon(R.drawable.baseline_notification_important_black_18)
        .setContentTitle(title)
        .setContentText(text)
        .setContentIntent(pendingIntent)
        .setAutoCancel(true);

    NotificationManager notificationManager = context.getSystemService(NotificationManager.class);
    notificationManager.notify(0, builder.build());

    return true;
  }
}
