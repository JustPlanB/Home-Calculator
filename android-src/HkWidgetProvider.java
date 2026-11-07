package ir.hesabketab.app;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.widget.RemoteViews;

/** ویجت صفحهٔ اصلی گوشی: موجودی و خرج امروز (داده را خود نرم‌افزار با HkWidget.update می‌فرستد) */
public class HkWidgetProvider extends AppWidgetProvider {
  static final String PREFS=HkWidgetDraw.PREFS;

  @Override public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids){
    for(int id: ids) render(ctx, mgr, id);
    HkWidgetDraw.scheduleMidnight(ctx);
  }
  @Override public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle o){
    render(ctx, mgr, id);
  }
  /* نیمه‌شب: تاریخ و «خرج امروز» همهٔ ویجت‌ها بدون باز شدن نرم‌افزار به‌روز شوند */
  static final String ACTION_EYE="ir.hesabketab.app.WIDGET_EYE";
  @Override public void onReceive(Context ctx, Intent intent){
    if(intent!=null && HkWidgetDraw.ACTION_MIDNIGHT.equals(intent.getAction())){ refreshAll(ctx); return; }
    /* ۱.۳.۶۹: دکمهٔ چشم: مبالغ همهٔ ویجت‌ها همان لحظه پنهان/نمایان */
    if(intent!=null && ACTION_EYE.equals(intent.getAction())){
      try{ android.content.SharedPreferences sp=ctx.getSharedPreferences(PREFS, Context.MODE_PRIVATE); sp.edit().putBoolean("hidden", !sp.getBoolean("hidden",false)).apply(); }catch(Exception ignored){}
      refreshAll(ctx); return;
    }
    super.onReceive(ctx, intent);
  }

  static void refreshAll(Context ctx){
    HkWidgetDraw.scheduleMidnight(ctx);
    try{
      AppWidgetManager mgr=AppWidgetManager.getInstance(ctx);
      int[] ids=mgr.getAppWidgetIds(new ComponentName(ctx, HkWidgetProvider.class));
      for(int id: ids) render(ctx, mgr, id);
    }catch(Exception ignored){}
    try{ HkWidgetAccountsProvider.refreshAll(ctx); }catch(Exception ignored){}
    try{ HkWidgetTxProvider.refreshAll(ctx); }catch(Exception ignored){}
  }

  static PendingIntent eyeIntent(Context ctx){
    Intent i=new Intent(ctx, HkWidgetProvider.class).setAction(ACTION_EYE);
    int fl=PendingIntent.FLAG_UPDATE_CURRENT; if(Build.VERSION.SDK_INT>=23) fl|=PendingIntent.FLAG_IMMUTABLE;
    return PendingIntent.getBroadcast(ctx, 77, i, fl);
  }
  /** آیکن چشم: باز = مبالغ پیدا، بسته = پنهان؛ رنگ کم‌رنگ هم‌تم ویجت */
  static void applyEye(Context ctx, RemoteViews v, int viewId, HkWidgetDraw.Data d){
    v.setImageViewResource(viewId, d.hidden ? R.drawable.hk_ic_eye_off : R.drawable.hk_ic_eye);
    v.setInt(viewId, "setColorFilter", d.light ? 0xFF6E6E76 : 0xFF98989F);
    v.setViewVisibility(viewId, d.locked ? android.view.View.GONE : android.view.View.VISIBLE);
    v.setOnClickPendingIntent(viewId, eyeIntent(ctx));
    v.setContentDescription(viewId, d.hidden ? "نمایش مبالغ" : "پنهان کردن مبالغ");
  }
  static PendingIntent openApp(Context ctx, boolean mutable){
    Intent open=new Intent(ctx, MainActivity.class);
    open.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP);
    int fl=PendingIntent.FLAG_UPDATE_CURRENT;
    if(Build.VERSION.SDK_INT>=31 && mutable) fl|=PendingIntent.FLAG_MUTABLE;
    else if(Build.VERSION.SDK_INT>=23) fl|=PendingIntent.FLAG_IMMUTABLE;
    return PendingIntent.getActivity(ctx, mutable?1:0, open, fl);
  }

  static void render(Context ctx, AppWidgetManager mgr, int id){
    try{
      HkWidgetDraw.Data d=HkWidgetDraw.load(ctx);
      float[] sz=HkWidgetDraw.size(ctx, mgr, id, 250, 180);
      RemoteViews v=new RemoteViews(ctx.getPackageName(), R.layout.hk_widget);
      v.setInt(R.id.hk_w_root,"setBackgroundResource", d.light ? R.drawable.hk_widget_bg_light : R.drawable.hk_widget_bg);
      v.setImageViewBitmap(R.id.hk_w_img, HkWidgetDraw.full(ctx, (int)sz[0], (int)sz[1], sz[2], d));
      v.setOnClickPendingIntent(R.id.hk_w_root, openApp(ctx, false));
      applyEye(ctx, v, R.id.hk_w_eye, d);
      mgr.updateAppWidget(id, v);
    }catch(Exception ignored){}
  }
}
