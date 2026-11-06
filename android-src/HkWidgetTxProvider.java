package ir.hesabketab.app;

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RemoteViews;

/** ۱.۳.۷۸: ویجت ردیف‌ها — آخرین ردیف‌های مخارج یا درآمدها (انتخاب هنگام افزودن ویجت)؛ تازه‌ترین بالا، با اسکرول قبلی‌ها
    ۱.۳.۷۹: همه‌چیز با فونت وزیرمتن و رنگ‌های نرم‌افزار روی تصویر کشیده می‌شود؛ ردیف عنوان، خط‌کشی، ستون حساب؛ ترتیب ستون‌ها مثل جدول نرم‌افزار */
public class HkWidgetTxProvider extends AppWidgetProvider {
  @Override public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids){ for(int id: ids) render(ctx, mgr, id); }
  @Override public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle o){ render(ctx, mgr, id); }
  @Override public void onDeleted(Context ctx, int[] ids){
    try{ android.content.SharedPreferences.Editor e=ctx.getSharedPreferences(HkWidgetDraw.PREFS, Context.MODE_PRIVATE).edit(); for(int id: ids) e.remove("tx_type_"+id); e.apply(); }catch(Exception ignored){}
  }
  static void refreshAll(Context ctx){
    try{
      AppWidgetManager mgr=AppWidgetManager.getInstance(ctx);
      int[] ids=mgr.getAppWidgetIds(new ComponentName(ctx, HkWidgetTxProvider.class));
      for(int id: ids) render(ctx, mgr, id);
    }catch(Exception ignored){}
  }
  static boolean isIncome(Context ctx, int id){
    try{ return "inc".equals(ctx.getSharedPreferences(HkWidgetDraw.PREFS, Context.MODE_PRIVATE).getString("tx_type_"+id, "exp")); }catch(Exception e){ return false; }
  }
  @SuppressWarnings("deprecation")
  static void render(Context ctx, AppWidgetManager mgr, int id){
    try{
      HkWidgetDraw.Data d=HkWidgetDraw.load(ctx);
      boolean inc=isIncome(ctx, id);
      float[] sz=HkWidgetTxDraw.dims(ctx, mgr, id);
      RemoteViews v=new RemoteViews(ctx.getPackageName(), R.layout.hk_widget_tx);
      v.setInt(R.id.hk_wt_root,"setBackgroundResource", d.light ? R.drawable.hk_widget_bg_light : R.drawable.hk_widget_bg);
      v.setImageViewBitmap(R.id.hk_wt_head, HkWidgetTxDraw.header(ctx, (int)sz[0], sz[1], inc, d.light));
      v.setImageViewBitmap(R.id.hk_wt_empty, HkWidgetTxDraw.empty(ctx, (int)sz[0], sz[1], d.locked ? "برنامه قفل است" : "ردیفی نیست", d.light));
      Intent svc=new Intent(ctx, HkWidgetTxService.class);
      svc.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
      svc.setData(Uri.parse(svc.toUri(Intent.URI_INTENT_SCHEME)));
      v.setRemoteAdapter(R.id.hk_wt_list, svc);
      v.setEmptyView(R.id.hk_wt_list, R.id.hk_wt_empty);
      v.setPendingIntentTemplate(R.id.hk_wt_list, HkWidgetProvider.openApp(ctx, true));
      v.setOnClickPendingIntent(R.id.hk_wt_head, HkWidgetProvider.openApp(ctx, false));
      v.setOnClickPendingIntent(R.id.hk_wt_root, HkWidgetProvider.openApp(ctx, false));
      HkWidgetProvider.applyEye(ctx, v, R.id.hk_wt_eye, d);
      mgr.updateAppWidget(id, v);
      mgr.notifyAppWidgetViewDataChanged(id, R.id.hk_wt_list);
    }catch(Exception ignored){}
  }
}

/** رسم سرستون و ردیف‌های ویجت ردیف‌ها با وزیرمتن */
final class HkWidgetTxDraw {
  private static Typeface REG, BOLD;
  static void fonts(Context c){
    if(BOLD!=null) return;
    try{ BOLD=androidx.core.content.res.ResourcesCompat.getFont(c, R.font.hk_vazir_bold); }catch(Exception ignored){}
    try{ REG=androidx.core.content.res.ResourcesCompat.getFont(c, R.font.hk_vazir_regular); }catch(Exception ignored){}
    if(BOLD==null) BOLD=Typeface.DEFAULT_BOLD;
    if(REG==null) REG=Typeface.DEFAULT;
  }
  /** [عرض به پیکسل، پیکسل به ازای dp] — سقف اندازه برای سبک ماندن تصویر هر ردیف */
  static float[] dims(Context c, AppWidgetManager m, int id){
    float[] sz=HkWidgetDraw.size(c, m, id, 250, 180);
    float k=sz[2], w=sz[0];
    float cap=Math.min(k, 2.6f);
    if(cap<k){ w=w*cap/k; k=cap; }
    return new float[]{ Math.max(80, Math.round(w)), k };
  }
  static int text(boolean light){ return light ? 0xFF1C1C1E : 0xFFF2F2F7; }
  static int muted(boolean light){ return light ? 0xFF6E6E76 : 0xFF98989F; }
  static int line(boolean light){ return light ? 0x1F000000 : 0x24FFFFFF; }
  static int amt(boolean inc, boolean light){ return inc ? HkWidgetDraw.incC(light) : HkWidgetDraw.expC(light); }
  static Paint paint(Typeface tf, float size, int color, Paint.Align al){
    Paint p=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.SUBPIXEL_TEXT_FLAG);
    p.setTypeface(tf); p.setTextSize(size); p.setColor(color); p.setTextAlign(al);
    return p;
  }
  static String ell(Paint p, String t, float maxW){
    if(t==null) return "";
    if(p.measureText(t)<=maxW) return t;
    String e="…";
    int n=t.length();
    while(n>0 && p.measureText(t.substring(0,n)+e)>maxW) n--;
    return n>0 ? t.substring(0,n)+e : "";
  }
  static void fitSize(Paint p, String t, float maxW){
    float w=p.measureText(t);
    if(w>maxW && w>0) p.setTextSize(p.getTextSize()*maxW/w);
  }
  /* ستون‌ها از راست مثل جدول نرم‌افزار: تاریخ | شرح | حساب | مبلغ — مرزها: [راست، چپِ تاریخ، چپِ شرح، چپِ حساب، چپ] */
  static float[] cols(float W, float k){
    float L=10*k, R=W-10*k, w=R-L;
    return new float[]{ R, R-w*0.19f, L+w*0.47f, L+w*0.25f, L };
  }
  static float base(float top, float h, float size){ return top+h/2f+size*0.19f; }
  static void grid(Canvas cv, float[] c, float top, float h, boolean light, boolean bottom){
    Paint ln=new Paint(Paint.ANTI_ALIAS_FLAG); ln.setColor(line(light)); ln.setStrokeWidth(1f);
    for(int i=1;i<=3;i++) cv.drawLine(c[i], top+3, c[i], top+h-3, ln);
    if(bottom) cv.drawLine(c[4], top+h-0.5f, c[0], top+h-0.5f, ln);
  }
  /* ۱.۳.۸۰: نوار عنوان و سرستون‌ها با همان رنگ‌های جدول‌های نرم‌افزار؛ عنوان وسط (سبز/نارنجی دست نخورده) */
  static int titleBg(boolean light){ return light ? 0xFFE3E7EE : 0xFF1B1B1B; }
  static int headBg(boolean light){ return light ? 0xFFEEF0F4 : 0xFF0A1628; }
  static int headFg(boolean light){ return light ? 0xFF2C3644 : 0xFFFFFFFF; }
  static int headLine(boolean light){ return light ? 0xFFC9D1DC : 0xFF3A3A3C; }
  static Bitmap header(Context ctx, int W, float k, boolean inc, boolean light){
    fonts(ctx);
    float th=40*k, hh=30*k; int H=Math.round(th+hh+1*k);
    Bitmap bm=Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888); Canvas cv=new Canvas(bm);
    float[] c=cols(W, k);
    /* نوار عنوان سرتاسری با گوشه‌های گرد بالا (هم‌اندازهٔ گوشهٔ ویجت) */
    Paint tb=new Paint(Paint.ANTI_ALIAS_FLAG); tb.setColor(titleBg(light));
    float rr=22*k;
    android.graphics.Path tp=new android.graphics.Path();
    tp.addRoundRect(new android.graphics.RectF(0, 0, W, th), new float[]{ rr, rr, rr, rr, 0, 0, 0, 0 }, android.graphics.Path.Direction.CW);
    cv.drawPath(tp, tb);
    Paint t=paint(BOLD, 16.5f*k, amt(inc, light), Paint.Align.CENTER);
    cv.drawText(inc ? "درآمدها" : "مخارج", W/2f, base(0, th, 16.5f*k), t);
    /* ردیف سرستون‌ها مثل سرستون جدول‌های نرم‌افزار */
    Paint band=new Paint(Paint.ANTI_ALIAS_FLAG); band.setColor(headBg(light));
    cv.drawRect(c[4], th, c[0], th+hh, band);
    Paint ln=new Paint(Paint.ANTI_ALIAS_FLAG); ln.setColor(headLine(light)); ln.setStrokeWidth(Math.max(1f, k*0.6f));
    for(int i=1;i<=3;i++) cv.drawLine(c[i], th, c[i], th+hh, ln);
    cv.drawLine(c[4], th+hh, c[0], th+hh, ln);
    String[] lb={"تاریخ","شرح","حساب","مبلغ"};
    for(int i=0;i<4;i++){
      Paint p=paint(BOLD, 12.5f*k, headFg(light), Paint.Align.CENTER);
      fitSize(p, lb[i], (c[i]-c[i+1])-8*k);
      cv.drawText(lb[i], (c[i]+c[i+1])/2f, base(th, hh, 12.5f*k), p);
    }
    return bm;
  }
  static Bitmap row(Context ctx, int W, float k, String date, String desc, String bank, String amount, boolean inc, boolean light){
    fonts(ctx);
    float rh=38*k; int H=Math.round(rh);
    Bitmap bm=Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888); Canvas cv=new Canvas(bm);
    float[] c=cols(W, k);
    grid(cv, c, 0, rh, light, true);
    Paint pd=paint(REG, 12.5f*k, muted(light), Paint.Align.CENTER);
    fitSize(pd, date, (c[0]-c[1])-6*k);
    cv.drawText(date, (c[0]+c[1])/2f, base(0, rh, 12.5f*k), pd);
    Paint ps=paint(REG, 14.5f*k, text(light), Paint.Align.RIGHT);
    cv.drawText(ell(ps, desc, (c[1]-c[2])-12*k), c[1]-6*k, base(0, rh, 14.5f*k), ps);
    Paint pb=paint(REG, 12.5f*k, muted(light), Paint.Align.CENTER);
    String b2=(bank==null || bank.length()==0) ? "—" : bank;
    cv.drawText(ell(pb, b2, (c[2]-c[3])-8*k), (c[2]+c[3])/2f, base(0, rh, 12.5f*k), pb);
    Paint pa=paint(BOLD, 14.5f*k, amt(inc, light), Paint.Align.CENTER);
    fitSize(pa, amount, (c[3]-c[4])-6*k);
    cv.drawText(amount, (c[3]+c[4])/2f, base(0, rh, 14.5f*k), pa);
    return bm;
  }
  static Bitmap empty(Context ctx, int W, float k, String msg, boolean light){
    fonts(ctx);
    int H=Math.round(60*k);
    Bitmap bm=Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888); Canvas cv=new Canvas(bm);
    Paint p=paint(REG, 14f*k, muted(light), Paint.Align.CENTER);
    cv.drawText(msg, W/2f, base(0, H, 14f*k), p);
    return bm;
  }
}
