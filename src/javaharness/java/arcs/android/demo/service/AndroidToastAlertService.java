package arcs.android.demo.service;

import android.content.Context;
import android.widget.Toast;
import arcs.android.api.Annotations.AppContext;
import arcs.demo.services.AlertService;
import javax.inject.Inject;

public class AndroidToastAlertService implements AlertService {

  private Context appContext;

  @Inject
  public AndroidToastAlertService(@AppContext Context appContext) {
    this.appContext = appContext;
  }

  @Override
  public void alert(String msg) {
    Toast.makeText(appContext, msg, Toast.LENGTH_LONG).show();
  }
}
