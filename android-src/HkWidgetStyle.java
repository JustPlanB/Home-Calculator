package ir.hesabketab.app;

import android.app.Activity;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProviderInfo;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

/** ۱.۴.۲: تنظیمات ظاهر هر ویجت (نگه داشتن ویجت روی صفحهٔ گوشی ← تنظیمات):
    «رنگ پس‌زمینه»: مطابق تنظیمات گوشی / روشن / تیره — و «شفافیت» پس‌زمینه در ۱۱ پله (۰ تا ۱۰۰٪).
    با «ذخیره» همان ویجت فوراً با ظاهر تازه کشیده می‌شود؛ «انصراف» چیزی را عوض نمی‌کند. */
public class HkWidgetStyle extends Activity {
  static final int BLUE=0xFF08B5F5; /* آبی نرم‌افزار */
  private Typeface hkFB, hkFR;
  @Override public void setContentView(View v){ hkVazir(v); super.setContentView(v); }
  void hkVazir(View v){
    try{ if(hkFB==null){ hkFB=androidx.core.content.res.ResourcesCompat.getFont(this, R.font.hk_vazir_bold); hkFR=androidx.core.content.res.ResourcesCompat.getFont(this, R.font.hk_vazir_regular); } }catch(Exception ignored){}
    if(v instanceof TextView){ TextView tv=(TextView)v; Typeface cur=tv.getTypeface(); Typeface f=(cur!=null && cur.isBold())?hkFB:hkFR; if(f!=null) tv.setTypeface(f); }
    else if(v instanceof ViewGroup){ ViewGroup g=(ViewGroup)v; for(int i=0;i<g.getChildCount();i++) hkVazir(g.getChildAt(i)); }
  }
  int wid=AppWidgetManager.INVALID_APPWIDGET_ID;
  boolean light=false; /* تم پنجره = تم نرم‌افزار */
  float dp=1f;
  String mode="";
  int transp=0; /* شفافیت ۰ تا ۱۰ (هر پله ۱۰٪)؛ ۰ = پس‌زمینهٔ کامل */
  final View[] radios=new View[3];
  final String[] MODES={ "auto", "light", "dark" };
  DotSlider slider; TextView pct; PreviewView preview; HoleView hole; String cls="";
  int sysDim(String n){ try{ int r=getResources().getIdentifier(n, "dimen", "android"); return r!=0 ? getResources().getDimensionPixelSize(r) : 0; }catch(Exception e){ return 0; } }

  @Override protected void onCreate(Bundle b){
    super.onCreate(b);
    Intent it=getIntent();
    if(it!=null && it.getExtras()!=null) wid=it.getExtras().getInt(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID);
    if(wid==AppWidgetManager.INVALID_APPWIDGET_ID){ finish(); return; }
    /* انصراف یا بستن هم ویجت تازه را حذف نکند (در اندرویدهای قدیمی این صفحه هنگام افزودن ویجت هم باز می‌شود) */
    ok();
    SharedPreferences sp=getSharedPreferences(HkWidgetDraw.PREFS, MODE_PRIVATE);
    try{ light=sp.getBoolean("light", false); }catch(Exception ignored){}
    dp=getResources().getDisplayMetrics().density;
    mode=HkWidgetDraw.bgMode(this, wid);
    /* هنوز چیزی انتخاب نشده: همان ظاهر فعلی ویجت (هم‌رنگ نرم‌افزار) انتخاب‌شده دیده شود */
    if(!"auto".equals(mode) && !"light".equals(mode) && !"dark".equals(mode)) mode=light ? "light" : "dark";
    transp=Math.round((100-HkWidgetDraw.bgAlpha(this, wid))/10f);

    /* ۱.۴.۱۶: صفحهٔ تمام‌صفحه (مثل تنظیمات ویجت‌های سامسونگ): بالا اسم نرم‌افزار، وسط «پنجرهٔ پیش‌نمایش» که شفاف است و
       همان بالای تصویر زمینهٔ گوشی را یک‌به‌یک نشان می‌دهد (ثابت، فارغ از جای ویجت روی صفحه)، پایین گزینه‌ها. */
    try{ AppWidgetProviderInfo inf=AppWidgetManager.getInstance(this).getAppWidgetInfo(wid); cls=inf!=null && inf.provider!=null ? inf.provider.getClassName() : ""; }catch(Exception ignored){}
    FrameLayout frame=new FrameLayout(this);
    hole=new HoleView(this);
    frame.addView(hole, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
    LinearLayout root=new LinearLayout(this);
    root.setOrientation(LinearLayout.VERTICAL);
    root.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
    int p=(int)(18*dp);
    root.setPadding(p, sysDim("status_bar_height")+(int)(18*dp), p, sysDim("navigation_bar_height")+(int)(8*dp));

    TextView t=text("حساب‌کتاب", 26, true, fg());
    t.setGravity(Gravity.START); t.setPadding((int)(6*dp), 0, 0, (int)(16*dp));
    root.addView(t, mw());

    preview=new PreviewView(this);
    int ph=(int)(getResources().getDisplayMetrics().heightPixels*0.29f); /* ۱.۴.۱۷: هم‌اندازهٔ پنجرهٔ پیش‌نمایش موزیک سامسونگ (۵۸۰ از ۱۹۹۹)؛ تم، شفافیت و دکمه‌ها بی‌اسکرول دیده شوند */
    LinearLayout.LayoutParams plp=new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, ph); plp.bottomMargin=(int)(14*dp);
    root.addView(preview, plp);
    preview.addOnLayoutChangeListener(new View.OnLayoutChangeListener(){ public void onLayoutChange(View v, int l, int tp, int r, int b, int ol, int ot, int or, int ob){ hole.setHole(l, tp, r, b); } });

    ScrollView sv=new ScrollView(this); sv.setVerticalScrollBarEnabled(false);
    LinearLayout opts=new LinearLayout(this); opts.setOrientation(LinearLayout.VERTICAL); opts.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
    opts.addView(label("رنگ پس‌زمینه"), mw());
    LinearLayout box=section();
    String[] names={ "مطابق تنظیمات گوشی", "روشن", "تیره" };
    for(int i=0;i<3;i++) box.addView(radioRow(i, names[i]));
    opts.addView(box, mwGap());

    LinearLayout box2=section();
    LinearLayout hd=new LinearLayout(this); hd.setOrientation(LinearLayout.HORIZONTAL); hd.setLayoutDirection(View.LAYOUT_DIRECTION_RTL); hd.setGravity(Gravity.CENTER_VERTICAL);
    TextView l2=text("شفافیت", 15, true, fg());
    hd.addView(l2, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
    pct=text("", 14, false, muted());
    hd.addView(pct, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.WRAP_CONTENT, LinearLayout.LayoutParams.WRAP_CONTENT));
    hd.setPadding((int)(4*dp), (int)(6*dp), (int)(4*dp), (int)(10*dp));
    box2.addView(hd, mw());
    slider=new DotSlider(this);
    box2.addView(slider, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, (int)(44*dp)));
    opts.addView(box2, mwGap());
    sv.addView(opts, new ScrollView.LayoutParams(ScrollView.LayoutParams.MATCH_PARENT, ScrollView.LayoutParams.WRAP_CONTENT));
    root.addView(sv, new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f));
    showPct();

    LinearLayout acts=new LinearLayout(this); acts.setOrientation(LinearLayout.HORIZONTAL); acts.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
    TextView save=text("ذخیره", 16, true, BLUE); save.setGravity(Gravity.CENTER);
    TextView cancel=text("انصراف", 16, true, fg()); cancel.setGravity(Gravity.CENTER);
    save.setOnClickListener(new View.OnClickListener(){ public void onClick(View v){ save(); } });
    cancel.setOnClickListener(new View.OnClickListener(){ public void onClick(View v){ finish(); } });
    acts.addView(save, new LinearLayout.LayoutParams(0, (int)(52*dp), 1f));
    acts.addView(cancel, new LinearLayout.LayoutParams(0, (int)(52*dp), 1f));
    LinearLayout.LayoutParams alp=mw(); alp.topMargin=(int)(4*dp);
    root.addView(acts, alp);

    frame.addView(root, new FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
    setContentView(frame);
    paintRadios();
  }
  int fg(){ return light ? 0xFF1C1C1E : 0xFFF2F2F7; }
  int muted(){ return light ? 0xFF6E6E76 : 0xFF98989F; }
  int card(){ return light ? 0xFFFFFFFF : 0xFF1C1C1E; }
  LinearLayout.LayoutParams mw(){ return new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, LinearLayout.LayoutParams.WRAP_CONTENT); }
  LinearLayout.LayoutParams mwGap(){ LinearLayout.LayoutParams lp=mw(); lp.bottomMargin=(int)(14*dp); return lp; }
  TextView text(String s, float sz, boolean bold, int col){
    TextView t=new TextView(this); t.setText(s); t.setTextSize(sz); t.setTextColor(col);
    t.setTypeface(bold ? Typeface.DEFAULT_BOLD : Typeface.DEFAULT); /* hkVazir بعداً وزیر می‌گذارد */
    return t;
  }
  TextView label(String s){ TextView t=text(s, 14, true, fg()); t.setPadding((int)(6*dp), 0, (int)(6*dp), (int)(8*dp)); return t; }
  LinearLayout section(){
    LinearLayout l=new LinearLayout(this); l.setOrientation(LinearLayout.VERTICAL); l.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
    int p=(int)(14*dp); l.setPadding(p, (int)(8*dp), p, (int)(8*dp));
    GradientDrawable g=new GradientDrawable(); g.setColor(card()); g.setCornerRadius(24*dp); l.setBackground(g);
    return l;
  }
  View radioRow(final int i, String name){
    LinearLayout r=new LinearLayout(this); r.setOrientation(LinearLayout.HORIZONTAL); r.setLayoutDirection(View.LAYOUT_DIRECTION_RTL); r.setGravity(Gravity.CENTER_VERTICAL);
    View dot=new RadioDot(this); radios[i]=dot;
    r.addView(dot, new LinearLayout.LayoutParams((int)(26*dp), (int)(26*dp)));
    TextView t=text(name, 16, false, fg()); t.setPadding((int)(16*dp), 0, (int)(4*dp), 0);
    r.addView(t, new LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f));
    r.setMinimumHeight((int)(54*dp));
    r.setClickable(true);
    r.setOnClickListener(new View.OnClickListener(){ public void onClick(View v){ mode=MODES[i]; paintRadios(); if(preview!=null) preview.invalidate(); } });
    return r;
  }
  void paintRadios(){ for(int i=0;i<3;i++) if(radios[i]!=null) radios[i].invalidate(); }
  void showPct(){ if(pct!=null) pct.setText(HkWidgetDraw.faDigits(transp*10)+"٪"); }
  void ok(){ Intent r=new Intent(); r.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, wid); setResult(RESULT_OK, r); }
  void save(){
    try{ getSharedPreferences(HkWidgetDraw.PREFS, MODE_PRIVATE).edit().putString("bg_mode_"+wid, mode).putInt("bg_alpha_"+wid, 100-transp*10).apply(); }catch(Exception ignored){}
    redraw(this, wid);
    ok();
    finish();
  }
  /** فقط همان ویجت، با هر نوعی که هست، دوباره کشیده شود */
  static void redraw(Context c, int id){
    try{
      AppWidgetManager m=AppWidgetManager.getInstance(c);
      AppWidgetProviderInfo info=m.getAppWidgetInfo(id);
      String cls=info!=null && info.provider!=null ? info.provider.getClassName() : "";
      if(cls.endsWith("HkWidgetTxProvider")) HkWidgetTxProvider.render(c, m, id, true);
      else if(cls.endsWith("HkWidgetAccountsProvider")) HkWidgetAccountsProvider.render(c, m, id);
      else if(cls.endsWith("HkWidgetLineProvider")) HkWidgetLineProvider.render(c, m, id);
      else HkWidgetProvider.render(c, m, id);
    }catch(Exception ignored){}
  }

  /** دایرهٔ انتخاب: حلقهٔ آبی با نقطهٔ پر برای گزینهٔ انتخاب‌شده؛ بقیه حلقهٔ خاکستری */
  class RadioDot extends View {
    final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
    RadioDot(Context c){ super(c); }
    @Override protected void onDraw(Canvas cv){
      int i=0; for(;i<3;i++) if(radios[i]==this) break;
      boolean on=i<3 && MODES[i].equals(mode);
      float cx=getWidth()/2f, cy=getHeight()/2f, r=Math.min(cx, cy)-2*dp;
      p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(2.4f*dp); p.setColor(on ? BLUE : (light ? 0xFF8E8E93 : 0xFF8E8E93));
      cv.drawCircle(cx, cy, r, p);
      if(on){ p.setStyle(Paint.Style.FILL); cv.drawCircle(cx, cy, r*0.55f, p); }
    }
  }

  /** نوار شفافیت با ۱۱ نقطه (هر نقطه ۱۰٪)؛ راست = بدون شفافیت. زدن یا کشیدن روی نوار نزدیک‌ترین نقطه را انتخاب می‌کند */
  class DotSlider extends View {
    final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
    DotSlider(Context c){ super(c); }
    float xOf(int i){ float pad=16*dp, w=getWidth()-2*pad; return getWidth()-pad-w*i/10f; }
    @Override protected void onDraw(Canvas cv){
      float cy=getHeight()/2f, pad=16*dp, th=18*dp;
      p.setStyle(Paint.Style.FILL); p.setColor(light ? 0xFFE5E5EA : 0xFF3A3A3C);
      cv.drawRoundRect(new android.graphics.RectF(pad-th/2f, cy-th/2f, getWidth()-pad+th/2f, cy+th/2f), th/2f, th/2f, p);
      for(int i=0;i<=10;i++){
        if(i==transp) continue;
        p.setColor(light ? 0xFFAEAEB2 : 0xFF6C6C70);
        cv.drawCircle(xOf(i), cy, 4.2f*dp, p);
      }
      float kx=xOf(transp), kr=12*dp;
      p.setColor(card()); cv.drawCircle(kx, cy, kr, p);
      p.setStyle(Paint.Style.STROKE); p.setStrokeWidth(3*dp); p.setColor(BLUE); cv.drawCircle(kx, cy, kr, p);
    }
    @Override public boolean onTouchEvent(MotionEvent e){
      int a=e.getActionMasked();
      if(a==MotionEvent.ACTION_DOWN || a==MotionEvent.ACTION_MOVE || a==MotionEvent.ACTION_UP){
        getParent().requestDisallowInterceptTouchEvent(true);
        int best=0; float bd=Float.MAX_VALUE;
        for(int i=0;i<=10;i++){ float d=Math.abs(e.getX()-xOf(i)); if(d<bd){ bd=d; best=i; } }
        if(best!=transp){ transp=best; showPct(); invalidate(); if(preview!=null) preview.invalidate(); try{ performHapticFeedback(android.view.HapticFeedbackConstants.CLOCK_TICK); }catch(Exception ignored){} }
        return true;
      }
      return super.onTouchEvent(e);
    }
  }

  /** زمینهٔ صفحه: سیاه (روشن در تم روشن) با یک «سوراخ» گرد به اندازهٔ پنجرهٔ پیش‌نمایش؛ از سوراخ تصویر زمینهٔ گوشی دیده می‌شود */
  class HoleView extends View {
    final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
    final android.graphics.RectF r=new android.graphics.RectF();
    HoleView(Context c){ super(c); p.setXfermode(new android.graphics.PorterDuffXfermode(android.graphics.PorterDuff.Mode.CLEAR)); }
    void setHole(int l, int t, int rr, int b){ r.set(l, t, rr, b); invalidate(); }
    @Override protected void onDraw(Canvas cv){
      int sc=cv.saveLayer(0, 0, getWidth(), getHeight(), null);
      cv.drawColor(light ? 0xFFF2F2F7 : 0xFF000000);
      if(r.width()>0) cv.drawRoundRect(r, 30*dp, 30*dp, p);
      cv.restoreToCount(sc);
    }
  }

  /** پنجرهٔ پیش‌نمایش: خودِ همین ویجت (با اندازهٔ واقعی‌اش) با رنگ و شفافیت انتخاب‌شده، وسط پنجره با حاشیهٔ ۱۵٪ از چپ و راست */
  class PreviewView extends View {
    final Paint p=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.FILTER_BITMAP_FLAG);
    PreviewView(Context c){ super(c); }
    @Override protected void onDraw(Canvas cv){
      try{
        Context c=getContext();
        boolean lt="light".equals(mode) || ("auto".equals(mode) && !HkWidgetDraw.phoneDark(c));
        int alpha=100-transp*10;
        AppWidgetManager mgr=AppWidgetManager.getInstance(c);
        HkWidgetDraw.Data d=HkWidgetDraw.load(c, wid); d.light=lt; d.alpha=alpha;
        boolean line=cls.endsWith("HkWidgetLineProvider"), acc=cls.endsWith("HkWidgetAccountsProvider"), tx=cls.endsWith("HkWidgetTxProvider");
        float[] sz=HkWidgetDraw.size(c, mgr, wid, 250, line ? 56 : (acc ? 200 : 180));
        int W=(int)sz[0], H=(int)sz[1]; float k=sz[2];
        Bitmap bm;
        if(line) bm=HkWidgetDraw.line(c, W, H, k, d);
        else if(acc) bm=HkWidgetDraw.accounts(c, W, H, k, d);
        else if(tx) bm=txBitmap(c, mgr, W, H, d);
        else bm=HkWidgetDraw.full(c, W, H, k, d);
        float s=Math.min(getWidth()*0.70f/bm.getWidth(), getHeight()*0.70f/bm.getHeight());
        float dw=bm.getWidth()*s, dh=bm.getHeight()*s, x=(getWidth()-dw)/2f, y=(getHeight()-dh)/2f;
        android.graphics.RectF dst=new android.graphics.RectF(x, y, x+dw, y+dh);
        if(!line){
          android.graphics.drawable.Drawable bg=c.getResources().getDrawable(HkWidgetDraw.bgRes(c, lt, alpha));
          bg.setBounds(Math.round(dst.left), Math.round(dst.top), Math.round(dst.right), Math.round(dst.bottom)); bg.draw(cv);
        }
        cv.drawBitmap(bm, null, dst, p);
      }catch(Exception ignored){}
    }
    /** ویجت ردیف‌ها: سرستون + چند ردیف نمونهٔ ساختگی (فقط برای پیش‌نمایش) */
    Bitmap txBitmap(Context c, AppWidgetManager mgr, int W, int H, HkWidgetDraw.Data d){
      float[] tz=HkWidgetTxDraw.dims(c, mgr, wid);
      int W2=(int)tz[0], H2=Math.max(40, Math.round(H*tz[0]/Math.max(1f, (float)W))); float k2=tz[1];
      boolean inc=HkWidgetTxProvider.isIncome(c, wid), all=HkWidgetTxProvider.isAll(c, wid);
      Bitmap out=Bitmap.createBitmap(W2, H2, Bitmap.Config.ARGB_8888); Canvas cv=new Canvas(out);
      Bitmap h=HkWidgetTxDraw.header(c, W2, k2, inc, all, d.light, d.alpha); cv.drawBitmap(h, 0, 0, null);
      float y=h.getHeight();
      String[][] S={ {"۱۹ آبان","خرید نمونه","ملی ۲۰۰۲","۱۶۸,۰۰۰","e",""}, {"۱۹ آبان","اینترنت","ملت ۳۱۰۶","۴۰,۰۰۰","e",""}, {"۲۰ آبان","واریز نمونه","ملی ۲۰۰۲","۹,۰۰۰,۰۰۰","i",""}, {"۲۰ آبان","پروژهٔ نمونه","ملت ۳۱۰۶","۵,۰۰۰,۰۰۰","e","#8E24AA"}, {"۲۱ آبان","قسط نمونه","ملی ۲۰۰۲","۵۹۰,۷۹۱","e",""}, {"۲۱ آبان","خرید نمونه","ملت ۳۱۰۶","۸۸۸,۲۰۰","e",""} };
      for(String[] r: S){
        boolean ri=all ? "i".equals(r[4]) : inc;
        Bitmap rb=HkWidgetTxDraw.row(c, W2, k2, r[0], r[1], r[2], (ri ? "+" : "-")+r[3], ri, d.light, false, r[5]);
        if(y>=H2) break;
        cv.drawBitmap(rb, 0, y, null); y+=rb.getHeight();
      }
      return out;
    }
  }
}
