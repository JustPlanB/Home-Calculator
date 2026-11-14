package ir.hesabketab.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.os.Bundle;
import android.widget.RemoteViews;

/** ۱.۴.۳: ویجت یک‌خطی موجودی (۴ در ۱): فقط «موجودی» و مبلغش؛ با همان تنظیمات ظاهر (رنگ پس‌زمینه و شفافیت) و پنهان شدن مبالغ */
public class HkWidgetLineProvider extends AppWidgetProvider {
  @Override public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids){ for(int id: ids) render(ctx, mgr, id); }
  @Override public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle o){ render(ctx, mgr, id); }
  @Override public void onDeleted(Context ctx, int[] ids){ HkWidgetDraw.forget(ctx, ids); }
  static void refreshAll(Context ctx){
    try{
      AppWidgetManager mgr=AppWidgetManager.getInstance(ctx);
      int[] ids=mgr.getAppWidgetIds(new ComponentName(ctx, HkWidgetLineProvider.class));
      for(int id: ids) render(ctx, mgr, id);
    }catch(Exception ignored){}
  }
  static void render(Context ctx, AppWidgetManager mgr, int id){
    try{
      HkWidgetDraw.Data d=HkWidgetDraw.load(ctx, id);
      float[] sz=HkWidgetDraw.size(ctx, mgr, id, 250, 56);
      RemoteViews v=new RemoteViews(ctx.getPackageName(), R.layout.hk_widget);
      v.setInt(R.id.hk_w_root,"setBackgroundResource", HkWidgetDraw.bgRes(ctx, d.light, d.alpha));
      v.setImageViewBitmap(R.id.hk_w_img, HkWidgetDraw.line(ctx, (int)sz[0], (int)sz[1], sz[2], d));
      v.setOnClickPendingIntent(R.id.hk_w_root, HkWidgetProvider.openApp(ctx, false));
      v.setViewVisibility(R.id.hk_w_eye, android.view.View.GONE); /* یک خط جای دکمهٔ چشم ندارد؛ چشم بقیهٔ ویجت‌ها این را هم پنهان می‌کند */
      mgr.updateAppWidget(id, v);
    }catch(Exception ignored){}
  }
}
