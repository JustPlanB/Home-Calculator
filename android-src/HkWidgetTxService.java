package ir.hesabketab.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.os.Handler;
import android.os.Looper;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import org.json.JSONArray;
import org.json.JSONObject;

/** ردیف‌های ویجت مخارج / درآمدها: تاریخ، شرح، حساب، مبلغ — هر ردیف یک تصویر با وزیرمتن
    ۱.۳.۹۱: مثل پایین آمدن پست‌ها: اول ۲۰ ردیف و زیرشان یک ردیف «در حال بارگذاری» (دایرهٔ چرخان)؛ وقتی با اسکرول به آن ردیف
    برسید، کمی بعد ۲۰ ردیف بعدی اضافه می‌شود. با تازه شدن داده (رندر دوباره) دوباره ۲۰ ردیف. */
public class HkWidgetTxService extends RemoteViewsService {
  static final int PAGE=20;
  static String shownKey(int id){ return "tx_shown_"+id; }
  static void resetShown(Context ctx, int id){
    try{ ctx.getSharedPreferences(HkWidgetDraw.PREFS, Context.MODE_PRIVATE).edit().remove(shownKey(id)).apply(); }catch(Exception ignored){}
  }
  @Override public RemoteViewsFactory onGetViewFactory(Intent intent){
    final int id=intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
    final Context ctx=getApplicationContext();
    return new RemoteViewsFactory(){
      JSONArray rows=new JSONArray();
      int shown=PAGE;
      boolean pending=false;
      final Handler main=new Handler(Looper.getMainLooper());
      HkWidgetDraw.Data d;
      boolean inc=false, all=false;
      float[] sz=new float[]{ 600, 2 };
      public void onCreate(){ load(); }
      void load(){
        try{
          d=HkWidgetDraw.load(ctx);
          inc=HkWidgetTxProvider.isIncome(ctx, id);
          all=HkWidgetTxProvider.isAll(ctx, id);
          sz=HkWidgetTxDraw.dims(ctx, AppWidgetManager.getInstance(ctx), id);
          String js=ctx.getSharedPreferences(HkWidgetDraw.PREFS, Context.MODE_PRIVATE).getString(all ? "tx_all" : (inc ? "tx_inc" : "tx_exp"), "[]");
          rows=(d!=null && d.locked) ? new JSONArray() : new JSONArray(js);
          shown=Math.max(PAGE, ctx.getSharedPreferences(HkWidgetDraw.PREFS, Context.MODE_PRIVATE).getInt(shownKey(id), PAGE));
        }catch(Exception e){ rows=new JSONArray(); shown=PAGE; }
        pending=false;
      }
      int visible(){ return rows==null ? 0 : Math.min(shown, rows.length()); }
      boolean hasMore(){ return rows!=null && rows.length()>visible(); }
      /* ردیف بارگذاری به صفحه رسید: کمی صبر (تا دایره دیده شود)، بعد ۲۰ ردیف بیشتر */
      void loadMore(){
        if(pending) return;
        pending=true;
        final int next=visible()+PAGE;
        main.postDelayed(new Runnable(){ public void run(){
          try{
            ctx.getSharedPreferences(HkWidgetDraw.PREFS, Context.MODE_PRIVATE).edit().putInt(shownKey(id), next).apply();
            AppWidgetManager.getInstance(ctx).notifyAppWidgetViewDataChanged(id, R.id.hk_wt_list);
          }catch(Exception ignored){ pending=false; }
        }}, 650);
      }
      public void onDataSetChanged(){ load(); }
      public void onDestroy(){}
      public int getCount(){ return visible()+(hasMore() ? 1 : 0); }
      public RemoteViews getViewAt(int pos){
        if(pos>=visible()){
          RemoteViews m=new RemoteViews(ctx.getPackageName(), R.layout.hk_widget_tx_more);
          if(hasMore()) loadMore();
          return m;
        }
        RemoteViews v=new RemoteViews(ctx.getPackageName(), R.layout.hk_widget_tx_item);
        try{
          JSONObject o=rows.getJSONObject(pos);
          boolean light=d!=null && d.light, hid=d!=null && d.hidden;
          v.setImageViewBitmap(R.id.hk_wti_img, HkWidgetTxDraw.row(ctx, (int)sz[0], sz[1], o.optString("d",""), o.optString("t",""), o.optString("b",""), hid ? "••••" : o.optString("a",""), all ? "i".equals(o.optString("x","e")) : inc, light, o.optInt("u",0)==1));
          v.setOnClickFillInIntent(R.id.hk_wti_img, new Intent());
        }catch(Exception ignored){}
        return v;
      }
      public RemoteViews getLoadingView(){ return null; }
      public int getViewTypeCount(){ return 2; }
      public long getItemId(int pos){ return pos; }
      public boolean hasStableIds(){ return false; }
    };
  }
}
