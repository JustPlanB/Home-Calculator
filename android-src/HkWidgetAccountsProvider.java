package ir.hesabketab.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.os.Bundle;
import android.widget.RemoteViews;

/** ویجت حساب‌ها: موجودی هر حساب بانکی (کارت) جدا + خرج امروز */
public class HkWidgetAccountsProvider extends AppWidgetProvider {
  @Override public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids){ for(int id: ids) render(ctx, mgr, id); }
  @Override public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle o){ render(ctx, mgr, id); }
  static void refreshAll(Context ctx){
    try{
      AppWidgetManager mgr=AppWidgetManager.getInstance(ctx);
      int[] ids=mgr.getAppWidgetIds(new ComponentName(ctx, HkWidgetAccountsProvider.class));
      for(int id: ids) render(ctx, mgr, id);
    }catch(Exception ignored){}
  }
  static void render(Context ctx, AppWidgetManager mgr, int id){
    try{
      HkWidgetDraw.Data d=HkWidgetDraw.load(ctx);
      float[] sz=HkWidgetDraw.size(ctx, mgr, id, 250, 200);
      RemoteViews v=new RemoteViews(ctx.getPackageName(), R.layout.hk_widget);
      v.setInt(R.id.hk_w_root,"setBackgroundResource", d.light ? R.drawable.hk_widget_bg_light : R.drawable.hk_widget_bg);
      v.setImageViewBitmap(R.id.hk_w_img, HkWidgetDraw.accounts(ctx, (int)sz[0], (int)sz[1], sz[2], d));
      v.setOnClickPendingIntent(R.id.hk_w_root, HkWidgetProvider.openApp(ctx, false));
      HkWidgetProvider.applyEye(ctx, v, R.id.hk_w_eye, d);
      mgr.updateAppWidget(id, v);
    }catch(Exception ignored){}
  }
}
