package ir.hesabketab.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;
import org.json.JSONArray;
import org.json.JSONObject;

/** ردیف‌های ویجت مخارج / درآمدها: تاریخ، شرح، حساب، مبلغ — هر ردیف یک تصویر با وزیرمتن */
public class HkWidgetTxService extends RemoteViewsService {
  @Override public RemoteViewsFactory onGetViewFactory(Intent intent){
    final int id=intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
    final Context ctx=getApplicationContext();
    return new RemoteViewsFactory(){
      JSONArray rows=new JSONArray();
      HkWidgetDraw.Data d;
      boolean inc=false;
      float[] sz=new float[]{ 600, 2 };
      public void onCreate(){ load(); }
      void load(){
        try{
          d=HkWidgetDraw.load(ctx);
          inc=HkWidgetTxProvider.isIncome(ctx, id);
          sz=HkWidgetTxDraw.dims(ctx, AppWidgetManager.getInstance(ctx), id);
          String js=ctx.getSharedPreferences(HkWidgetDraw.PREFS, Context.MODE_PRIVATE).getString(inc ? "tx_inc" : "tx_exp", "[]");
          rows=(d!=null && d.locked) ? new JSONArray() : new JSONArray(js);
        }catch(Exception e){ rows=new JSONArray(); }
      }
      public void onDataSetChanged(){ load(); }
      public void onDestroy(){}
      public int getCount(){ return rows==null ? 0 : rows.length(); }
      public RemoteViews getViewAt(int pos){
        RemoteViews v=new RemoteViews(ctx.getPackageName(), R.layout.hk_widget_tx_item);
        try{
          JSONObject o=rows.getJSONObject(pos);
          boolean light=d!=null && d.light, hid=d!=null && d.hidden;
          v.setImageViewBitmap(R.id.hk_wti_img, HkWidgetTxDraw.row(ctx, (int)sz[0], sz[1], o.optString("d",""), o.optString("t",""), o.optString("b",""), hid ? "••••" : o.optString("a",""), inc, light));
          v.setOnClickFillInIntent(R.id.hk_wti_img, new Intent());
        }catch(Exception ignored){}
        return v;
      }
      public RemoteViews getLoadingView(){ return null; }
      public int getViewTypeCount(){ return 1; }
      public long getItemId(int pos){ return pos; }
      public boolean hasStableIds(){ return false; }
    };
  }
}
