package ir.hesabketab.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;
import android.widget.RemoteViewsService;

/** دو صفحهٔ ویجت یک‌خطی (موجودی، خرج امروز) به اندازهٔ خود ویجت */
public class HkWidgetListService extends RemoteViewsService {
  @Override public RemoteViewsFactory onGetViewFactory(Intent intent){
    final int id=intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
    final Context ctx=getApplicationContext();
    return new RemoteViewsFactory(){
      HkWidgetDraw.Data d;
      final android.graphics.Bitmap[] cache=new android.graphics.Bitmap[2];
      int cw=0, ch=0;
      public void onCreate(){}
      public void onDataSetChanged(){ d=HkWidgetDraw.load(ctx); cache[0]=null; cache[1]=null; }
      public void onDestroy(){}
      /* پشته: صفحهٔ ۰ = موجودی، ۱ = خرج امروز؛ چرخش بی‌پایان را خود StackView (loopViews) انجام می‌دهد */
      public int getCount(){ return HkWidgetSmallProvider.PAGES; }
      public RemoteViews getViewAt(int pos){
        if(d==null) d=HkWidgetDraw.load(ctx);
        float[] sz=HkWidgetDraw.size(ctx, AppWidgetManager.getInstance(ctx), id, 250, 60);
        int pg=pos%2;
        if((int)sz[0]!=cw || (int)sz[1]!=ch){ cache[0]=null; cache[1]=null; cw=(int)sz[0]; ch=(int)sz[1]; }
        if(cache[pg]==null) cache[pg]=HkWidgetDraw.page(ctx, cw, ch, sz[2], d, pg);
        RemoteViews v=new RemoteViews(ctx.getPackageName(), R.layout.hk_widget_item);
        v.setImageViewBitmap(R.id.hk_wi_img, cache[pg]);
        v.setOnClickFillInIntent(R.id.hk_wi_img, new Intent());
        return v;
      }
      public RemoteViews getLoadingView(){ return null; }
      public int getViewTypeCount(){ return 1; }
      public long getItemId(int pos){ return pos; }
      public boolean hasStableIds(){ return true; }
    };
  }
}
