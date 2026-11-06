package ir.hesabketab.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RemoteViews;

/** ویجت یک‌خطی: موجودی و خرج امروز در یک «پشته» (StackView)؛ هر کشیدن دقیقاً یک صفحه جابه‌جا می‌شود و صفحه‌ها پشت‌سرهم می‌چرخند (۱.۳.۸۲) */
public class HkWidgetSmallProvider extends AppWidgetProvider {
  static final int PAGES=2;
  @Override public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids){
    for(int id: ids) render(ctx, mgr, id);
  }
  @Override public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle o){
    render(ctx, mgr, id);
  }
  /* پاک‌کردن کلید صفحهٔ نسخهٔ قبلی (دکمهٔ جابه‌جایی) */
  @Override public void onDeleted(Context ctx, int[] ids){
    try{ android.content.SharedPreferences.Editor e=ctx.getSharedPreferences(HkWidgetDraw.PREFS, Context.MODE_PRIVATE).edit(); for(int id: ids) e.remove("small_page_"+id); e.apply(); }catch(Exception ignored){}
  }

  static void refreshAll(Context ctx){
    try{
      AppWidgetManager mgr=AppWidgetManager.getInstance(ctx);
      int[] ids=mgr.getAppWidgetIds(new ComponentName(ctx, HkWidgetSmallProvider.class));
      for(int id: ids) render(ctx, mgr, id);
    }catch(Exception ignored){}
  }

  @SuppressWarnings("deprecation")
  static void render(Context ctx, AppWidgetManager mgr, int id){
    try{
      HkWidgetDraw.Data d=HkWidgetDraw.load(ctx);
      RemoteViews v=new RemoteViews(ctx.getPackageName(), R.layout.hk_widget_small);
      /* ۱.۳.۸۳: پس‌زمینه را خود کارت‌های پشته دارند؛ ریشه شفاف */
      v.setInt(R.id.hk_ws_root,"setBackgroundColor", 0);
      Intent svc=new Intent(ctx, HkWidgetListService.class);
      svc.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
      svc.setData(Uri.parse(svc.toUri(Intent.URI_INTENT_SCHEME)));
      v.setRemoteAdapter(R.id.hk_ws_list, svc);
      v.setPendingIntentTemplate(R.id.hk_ws_list, HkWidgetProvider.openApp(ctx, true));
      v.setOnClickPendingIntent(R.id.hk_ws_root, HkWidgetProvider.openApp(ctx, false));
      HkWidgetProvider.applyEye(ctx, v, R.id.hk_ws_eye, d);
      mgr.updateAppWidget(id, v);
      mgr.notifyAppWidgetViewDataChanged(id, R.id.hk_ws_list);
    }catch(Exception ignored){}
  }
}
