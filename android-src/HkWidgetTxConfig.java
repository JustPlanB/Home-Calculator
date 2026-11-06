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

/** ۱.۳.۷۸: هنگام افزودن ویجت ردیف‌ها: انتخاب «مخارج» یا «درآمدها» */
public class HkWidgetTxConfig extends Activity {
  /* ۱.۳.۸۲: فونت نرم‌افزار (وزیر) همه‌جا؛ بولد بماند بولد */
  private Typeface hkFB, hkFR;
  @Override public void setContentView(View v){ hkVazir(v); super.setContentView(v); }
  void hkVazir(View v){
    try{ if(hkFB==null){ hkFB=androidx.core.content.res.ResourcesCompat.getFont(this, R.font.hk_vazir_bold); hkFR=androidx.core.content.res.ResourcesCompat.getFont(this, R.font.hk_vazir_regular); } }catch(Exception ignored){}
    if(v instanceof TextView){ TextView tv=(TextView)v; Typeface cur=tv.getTypeface(); Typeface f=(cur!=null && cur.isBold())?hkFB:hkFR; if(f!=null) tv.setTypeface(f); }
    else if(v instanceof android.view.ViewGroup){ android.view.ViewGroup g=(android.view.ViewGroup)v; for(int i=0;i<g.getChildCount();i++) hkVazir(g.getChildAt(i)); }
  }
  int wid=AppWidgetManager.INVALID_APPWIDGET_ID;
  boolean light=false;
  float dp=1f;
  @Override protected void onCreate(Bundle b){
    super.onCreate(b);
    setResult(RESULT_CANCELED);
    Intent it=getIntent();
    if(it!=null && it.getExtras()!=null) wid=it.getExtras().getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
    if(wid==AppWidgetManager.INVALID_APPWIDGET_ID){ finish(); return; }
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
    root.addView(btn("مخارج", "exp", HkWidgetDraw.expC(light)));
    root.addView(btn("درآمدها", "inc", HkWidgetDraw.incC(light)));
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
    g.setStroke((int)Math.max(1, dp), (color & 0x00FFFFFF) | 0x66000000);
    b.setBackground(g);
    b.setClickable(true);
    b.setOnClickListener(new View.OnClickListener(){ public void onClick(View v){ choose(type); } });
    LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (int)(50*dp));
    lp.bottomMargin=(int)(10*dp);
    b.setLayoutParams(lp);
    return b;
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
