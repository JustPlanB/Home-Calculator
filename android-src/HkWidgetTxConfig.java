package ir.hesabketab.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.content.Intent;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.widget.LinearLayout;
import android.widget.TextView;

/** ۱.۳.۷۸: هنگام افزودن ویجت ردیف‌ها: انتخاب «مخارج» یا «درآمدها» (۱.۳.۸۶: یا «همه») */
public class HkWidgetTxConfig extends Activity {
  /* ۱.۳.۸۲: فونت نرم‌افزار (وزیر) همه‌جا؛ بولد بماند بولد */
  private Typeface hkFB, hkFR;
  @Override public void setContentView(View v){ hkVazir(v); super.setContentView(v); }
  void hkVazir(View v){
    try{ if(hkFB==null){ hkFB=androidx.core.content.res.ResourcesCompat.getFont(this, R.font.hk_vazir_bold); hkFR=androidx.core.content.res.ResourcesCompat.getFont(this, R.font.hk_vazir_regular); } }catch(Exception ignored){}
    if(v instanceof TextView){ TextView tv=(TextView)v; Typeface cur=tv.getTypeface(); Typeface f=(cur!=null && cur.isBold())?hkFB:hkFR; if(f!=null) tv.setTypeface(f); }
    else if(v instanceof android.view.ViewGroup){ android.view.ViewGroup g=(android.view.ViewGroup)v; for(int i=0;i<g.getChildCount();i++) hkVazir(g.getChildAt(i)); }
  }
  /* ۱.۳.۹۲: باز شدن دوباره از روی نام نوع ردیف‌ها در بالای ویجت (نه هنگام افزودن) */
  static final String EXTRA_REPICK="hk_repick";
  boolean repick=false;
  String cur="exp";
  int wid=AppWidgetManager.INVALID_APPWIDGET_ID;
  boolean light=false;
  float dp=1f;
  @Override protected void onCreate(Bundle b){
    super.onCreate(b);
    setResult(RESULT_CANCELED);
    Intent it=getIntent();
    if(it!=null && it.getExtras()!=null) wid=it.getExtras().getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
    if(wid==AppWidgetManager.INVALID_APPWIDGET_ID){ finish(); return; }
    repick=it.getBooleanExtra(EXTRA_REPICK, false);
    try{ cur=getSharedPreferences(HkWidgetDraw.PREFS, MODE_PRIVATE).getString("tx_type_"+wid, "exp"); }catch(Exception ignored){}
    try{ light=getSharedPreferences(HkWidgetDraw.PREFS, MODE_PRIVATE).getBoolean("light", false); }catch(Exception ignored){}
    dp=getResources().getDisplayMetrics().density;
    LinearLayout root=new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
    int p=(int)(20*dp);
    root.setPadding(p, p, p, (int)(14*dp));
    GradientDrawable bg=new GradientDrawable();
    bg.setColor(light ? 0xFFFFFFFF : 0xFF1F1F22);
    bg.setCornerRadius(22*dp);
    root.setBackground(bg);
    TextView t=new TextView(this);
    t.setText("این ویجت کدام ردیف‌ها را نشان دهد؟");
    t.setTextSize(16);
    t.setTypeface(Typeface.DEFAULT_BOLD);
    t.setTextColor(light ? 0xFF1C1C1E : 0xFFF2F2F7);
    t.setGravity(Gravity.CENTER);
    t.setPadding(0, 0, 0, (int)(14*dp));
    root.addView(t, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT));
    if(repick) t.setText("نمایش کدام ردیف‌ها؟");
    root.addView(btn("مخارج", "exp", HkWidgetDraw.expC(light)));
    root.addView(btn("درآمدها", "inc", HkWidgetDraw.incC(light)));
    /* ۱.۳.۸۶: «همه»: درآمد و مخارج با هم به ترتیب تاریخ (آبی نرم‌افزار) */
    root.addView(btn("همه", "all", HkWidgetTxDraw.ALL_C));
    setContentView(root);
  }
  View btn(String label, final String type, int color){
    TextView b=new TextView(this);
    b.setText(label);
    b.setTextSize(16);
    b.setTypeface(Typeface.DEFAULT_BOLD);
    b.setTextColor(color);
    b.setGravity(Gravity.CENTER);
    GradientDrawable g=new GradientDrawable();
    g.setColor(light ? 0x0F000000 : 0x14FFFFFF);
    g.setCornerRadius(14*dp);
    /* ۱.۳.۹۲: گزینهٔ فعلی با قاب پررنگ‌تر و تیک مشخص است */
    boolean on=repick && type.equals(cur);
    /* ۱.۳.۹۵: تیک همان شکل تیکِ داخل نرم‌افزار (مسیر M5 12.5l4.5 4.5L19 7.5 با سر و گوشهٔ گرد)، نه حرف «✓» */
    if(on){ b.setText(tickLabel(label, color)); g.setColor((color & 0x00FFFFFF) | 0x26000000); }
    g.setStroke((int)Math.max(1, on ? 2*dp : dp), (color & 0x00FFFFFF) | (on ? 0xCC000000 : 0x66000000));
    b.setBackground(g);
    b.setClickable(true);
    b.setOnClickListener(new View.OnClickListener(){ public void onClick(View v){ choose(type); } });
    LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (int)(50*dp));
    lp.bottomMargin=(int)(10*dp);
    b.setLayoutParams(lp);
    return b;
  }
  CharSequence tickLabel(String label, int color){
    try{
      int sz=(int)(18*dp); float k=sz/24f;
      android.graphics.Bitmap bm=android.graphics.Bitmap.createBitmap(sz, sz, android.graphics.Bitmap.Config.ARGB_8888);
      android.graphics.Canvas cv=new android.graphics.Canvas(bm);
      android.graphics.Paint p=new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
      p.setStyle(android.graphics.Paint.Style.STROKE); p.setStrokeWidth(2.4f*k); p.setStrokeCap(android.graphics.Paint.Cap.ROUND); p.setStrokeJoin(android.graphics.Paint.Join.ROUND); p.setColor(color);
      android.graphics.Path ph=new android.graphics.Path(); ph.moveTo(5*k, 12.5f*k); ph.lineTo(9.5f*k, 17*k); ph.lineTo(19*k, 7.5f*k);
      cv.drawPath(ph, p);
      android.graphics.drawable.BitmapDrawable d=new android.graphics.drawable.BitmapDrawable(getResources(), bm); d.setBounds(0, 0, sz, sz);
      android.text.SpannableString ss=new android.text.SpannableString("\uFFFC  "+label);
      ss.setSpan(new android.text.style.ImageSpan(d, android.text.style.DynamicDrawableSpan.ALIGN_BOTTOM), 0, 1, android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
      return ss;
    }catch(Throwable t){ return label; }
  }
  void choose(String type){
    try{ getSharedPreferences(HkWidgetDraw.PREFS, MODE_PRIVATE).edit().putString("tx_type_"+wid, type).apply(); }catch(Exception ignored){}
    try{ HkWidgetTxProvider.render(this, AppWidgetManager.getInstance(this), wid); }catch(Exception ignored){}
    Intent r=new Intent();
    r.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, wid);
    setResult(RESULT_OK, r);
    finish();
  }
}
