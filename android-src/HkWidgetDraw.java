package ir.hesabketab.app;

import android.appwidget.AppWidgetManager;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.res.Configuration;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Typeface;
import android.os.Bundle;

/** رسم متن ویجت با فونت وزیرمتن (مثل نرم‌افزار) روی تصویر؛ چیدمان بر اساس اندازهٔ واقعی ویجت */
final class HkWidgetDraw {
  static final String PREFS="hk_widget";
  private static Typeface REG, BOLD;
  /* کادر فشردهٔ متن نسبت به اندازهٔ فونت (اندازه‌گیری‌شده برای وزیرمتن) */
  private static final float TXT_A=0.74f, TXT_D=0.36f, NUM_A=0.70f, NUM_D=0.20f;

  static final class Data { String month, balance, today, accounts; boolean neg, locked, light, none, hidden, mask; }

  static final String[] MONTHS_FA={"فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"};
  static final String ACTION_MIDNIGHT="ir.hesabketab.app.WIDGET_MIDNIGHT";
  static String faDigits(int n){
    String s=String.valueOf(n); StringBuilder b=new StringBuilder();
    for(int i=0;i<s.length();i++){ char ch=s.charAt(i); b.append(ch>='0'&&ch<='9' ? (char)(0x06F0+(ch-'0')) : ch); }
    return b.toString();
  }
  /** تاریخ شمسی امروز از ساعت و منطقهٔ زمانی خود گوشی (همان مبنای نرم‌افزار): [متن نمایشی، کلید y-m-d] یا null */
  static String[] todayFa(){
    if(android.os.Build.VERSION.SDK_INT<24) return null;
    try{
      android.icu.util.Calendar c=android.icu.util.Calendar.getInstance(new android.icu.util.ULocale("fa_IR@calendar=persian"));
      int y=c.get(android.icu.util.Calendar.YEAR), m=c.get(android.icu.util.Calendar.MONTH), d=c.get(android.icu.util.Calendar.DAY_OF_MONTH);
      if(m<0||m>11) return null;
      return new String[]{ faDigits(d)+" "+MONTHS_FA[m]+" "+faDigits(y), y+"-"+(m+1)+"-"+d };
    }catch(Exception e){ return null; }
  }
  /** بازرسم ویجت‌ها کمی بعد از نیمه‌شب (بدون اجازهٔ هشدار دقیق؛ در حالت کم‌مصرف هم اجرا می‌شود) */
  static void scheduleMidnight(Context c){
    try{
      android.app.AlarmManager am=(android.app.AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
      if(am==null) return;
      java.util.Calendar n=java.util.Calendar.getInstance();
      n.add(java.util.Calendar.DAY_OF_YEAR,1);
      n.set(java.util.Calendar.HOUR_OF_DAY,0); n.set(java.util.Calendar.MINUTE,0); n.set(java.util.Calendar.SECOND,20); n.set(java.util.Calendar.MILLISECOND,0);
      android.content.Intent i=new android.content.Intent(c, HkWidgetProvider.class).setAction(ACTION_MIDNIGHT);
      int fl=android.app.PendingIntent.FLAG_UPDATE_CURRENT|(android.os.Build.VERSION.SDK_INT>=23?android.app.PendingIntent.FLAG_IMMUTABLE:0);
      android.app.PendingIntent pi=android.app.PendingIntent.getBroadcast(c, 7301, i, fl);
      if(android.os.Build.VERSION.SDK_INT>=23) am.setAndAllowWhileIdle(android.app.AlarmManager.RTC, n.getTimeInMillis(), pi);
      else am.set(android.app.AlarmManager.RTC, n.getTimeInMillis(), pi);
    }catch(Exception ignored){}
  }

  /** ۱.۳.۵۶: پیامک تراکنش، همان لحظه روی ویجت: موجودی، خرج امروز و حساب (از مبلغ‌های خام که نرم‌افزار آخرین بار فرستاده).
      فقط وقتی مبلغ و نوع (واریز/برداشت) بی‌ابهام است؛ با باز شدن نرم‌افزار عدد دقیق جایش می‌نشیند */
  static String fmtFa(long v){
    String s=String.format(java.util.Locale.US,"%,d",Math.abs(v)); StringBuilder b=new StringBuilder();
    for(int i=0;i<s.length();i++){ char ch=s.charAt(i); b.append(ch>='0'&&ch<='9' ? (char)(0x06F0+(ch-'0')) : ch); }
    return (v<0?"-":"")+b.toString();
  }
  static long smsAmount(String t){
    String[] kws={"مبلغ","واریز","برداشت","خرید","انتقال","پرداخت","بستانکار","بدهکار","دریافت","برگشت"};
    for(String kw:kws){
      int i=t.indexOf(kw);
      while(i>=0){
        int j=i+kw.length(), lim=Math.min(t.length(), j+16);
        while(j<lim && !(t.charAt(j)>='0'&&t.charAt(j)<='9')) j++;
        StringBuilder d=new StringBuilder(); int k=j;
        while(k<t.length() && ((t.charAt(k)>='0'&&t.charAt(k)<='9') || t.charAt(k)==',')){ if(t.charAt(k)!=',') d.append(t.charAt(k)); k++; }
        boolean masked = k<t.length() && (t.charAt(k)=='*' || t.charAt(k)=='-' && k+1<t.length() && t.charAt(k+1)>='0' && t.charAt(k+1)<='9');
        if(j<lim && d.length()>=3 && d.length()<=14 && !masked){ try{ return Long.parseLong(d.toString()); }catch(Exception ignored){} }
        i=t.indexOf(kw,i+1);
      }
    }
    return 0;
  }
  static boolean isD(char ch){ return ch>='0'&&ch<='9'; }
  static boolean hasAny(String t,String... ws){ for(String w:ws) if(t.contains(w)) return true; return false; }
  /** ۱.۳.۶۴: نوع تراکنش با همان ترتیب نرم‌افزار (detectTxnTypeFromSms): ۱ واریز، ‎-۱ برداشت، ۰ نامعلوم */
  static int smsSign(String t){
    int n=t.length();
    /* علامت چسبیده به مبلغِ برچسب‌دار: «انتقال:2,000,000+» یا «برداشت:-500,000» */
    String[] labels={"واریز","برداشت","انتقال","مبلغ","خرید","پرداخت"};
    for(String lb:labels){
      int i=t.indexOf(lb);
      while(i>=0){
        int j=i+lb.length();
        while(j<n && (t.charAt(j)==' '||t.charAt(j)==':'||t.charAt(j)=='：')) j++;
        char pre=j<n?t.charAt(j):' ';
        if(pre=='+'||pre=='-'){ j++; while(j<n&&t.charAt(j)==' ') j++; }
        if(j<n && isD(t.charAt(j))){
          if(pre=='+') return 1; if(pre=='-') return -1;
          int k=j; while(k<n && (isD(t.charAt(k))||t.charAt(k)==',')) k++;
          while(k<n&&t.charAt(k)==' ') k++;
          if(k<n && (t.charAt(k)=='+'||t.charAt(k)=='-') && (k+1>=n || !isD(t.charAt(k+1)))) return t.charAt(k)=='+'?1:-1;
        }
        i=t.indexOf(lb,i+1);
      }
    }
    if(hasAny(t,"برگشت وجه","برگشت خرید","برگشت تراکنش","استرداد","سود سپرده","سود حساب")) return 1;
    if(hasAny(t,"واریز به","واریز مبلغ","واریز وجه","واریز شد","واریز:","دریافت مبلغ","سود واریز","پاداش")) return 1;
    if(t.contains("واریز") && !hasAny(t,"برداشت","خرید","پرداخت قبض")) return 1;
    if(t.contains("بستانکار") && !t.contains("بدهکار")) return 1;
    if(hasAny(t,"برداشت","خرید","پرداخت","کسر","کارمزد","بدهکار")) return -1;
    /* عنوان مبهم («انتقال»، «تراکنش»): علامت کنار عدد، به‌جز کنار مانده/موجودی */
    for(int i=0;i<n;i++){
      char ch=t.charAt(i);
      boolean s1=(ch=='+'||ch=='-') && i+1<n && isD(t.charAt(i+1)) && i>0 && (t.charAt(i-1)==':'||t.charAt(i-1)==' ');
      boolean s2=(ch=='+'||ch=='-') && i>0 && isD(t.charAt(i-1)) && (i+1>=n || Character.isWhitespace(t.charAt(i+1)));
      if(!s1 && !s2) continue;
      String back=t.substring(Math.max(0,i-24),i);
      if(back.contains("مانده")||back.contains("موجودی")) continue;
      return ch=='+'?1:-1;
    }
    if(t.contains("انتقال")) return -1;
    return 0;
  }
  static boolean sameDay(long at){
    if(at<=0) return true;
    java.util.Calendar a=java.util.Calendar.getInstance(), b=java.util.Calendar.getInstance(); a.setTimeInMillis(at);
    return a.get(java.util.Calendar.YEAR)==b.get(java.util.Calendar.YEAR) && a.get(java.util.Calendar.DAY_OF_YEAR)==b.get(java.util.Calendar.DAY_OF_YEAR);
  }
  static void applySms(Context c,String text,String sender){ if(applySmsTo(c,text,sender,0)) HkWidgetProvider.refreshAll(c); }
  /** ۱.۳.۶۴: پیامک‌های صف که نرم‌افزار هنوز در حسابش نیاورده (seen = شناسه‌هایی که خودش حساب کرده یا تعیین تکلیف کرده)،
      بعد از هر به‌روزرسانی از طرف نرم‌افزار دوباره روی ویجت اعمال می‌شوند تا اثرشان پاک نشود */
  static void applyUnseen(Context c,String seenJson){
    try{
      java.util.HashSet<Integer> seen=new java.util.HashSet<>();
      org.json.JSONArray sa=new org.json.JSONArray(seenJson==null?"[]":seenJson);
      for(int i=0;i<sa.length();i++) seen.add(sa.optInt(i));
      org.json.JSONArray q=new org.json.JSONArray(c.getSharedPreferences(BankSmsReceiver.PREFS,Context.MODE_PRIVATE).getString(BankSmsReceiver.QUEUE,"[]"));
      for(int i=0;i<q.length();i++){
        org.json.JSONObject x=q.optJSONObject(i); if(x==null) continue;
        int nid=x.optInt("nid",0); if(nid==0 || seen.contains(nid)) continue;
        applySmsTo(c,x.optString("text",""),x.optString("sender",""),x.optLong("receivedAt",0));
      }
    }catch(Throwable ignored){}
  }
  static boolean applySmsTo(Context c,String text,String sender,long at){
    try{
      if(BankSmsReceiver.isPersonal(sender)) return false;
      SharedPreferences sp=c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
      if(!sp.contains("balRaw")) return false;
      String t=BankSmsReceiver.normFa(text);
      long amt=smsAmount(t);
      if(amt<=0) return false;
      int sgn=smsSign(t);
      if(sgn==0) return false;
      if(!(t.contains("تومان")||t.contains("تومن"))) amt=Math.round(amt/10.0);
      long sg=sgn;
      /* حساب از چهار رقم آخر کارت */
      String label=null;
      try{
        org.json.JSONObject map=new org.json.JSONObject(sp.getString("acc4Map","{}"));
        java.util.ArrayList<String> runs=new java.util.ArrayList<>(); StringBuilder r=new StringBuilder();
        for(int i=0;i<=t.length();i++){ char ch=i<t.length()?t.charAt(i):' '; if(ch>='0'&&ch<='9') r.append(ch); else { if(r.length()>=4) runs.add(r.toString()); r.setLength(0); } }
        java.util.Iterator<String> it=map.keys();
        while(it.hasNext() && label==null){ String a=it.next(); if(a.length()<3) continue; for(String n:runs){ if(n.endsWith(a)){ label=map.optString(a,null); break; } } }
      }catch(Exception ignored){}
      long bal=sp.getLong("balRaw",0)+sg*amt;
      SharedPreferences.Editor e=sp.edit();
      e.putLong("balRaw",bal); e.putString("balance",fmtFa(bal)); e.putBoolean("neg",bal<0);
      String[] td=todayFa();
      if(sg<0 && td!=null && sameDay(at)){
        boolean same=td[1].equals(sp.getString("dayKey",""));
        long today=(same?sp.getLong("todayRaw",0):0)+amt;
        e.putLong("todayRaw",today); e.putString("today",fmtFa(today)); e.putBoolean("todayNone",false); e.putString("dayKey",td[1]);
      }
      try{
        org.json.JSONArray arr=new org.json.JSONArray(sp.getString("accounts","[]"));
        for(int i=0;i<arr.length();i++){
          org.json.JSONObject o=arr.optJSONObject(i); if(o==null || !o.has("v")) continue;
          if(o.optBoolean("t",false) || (label!=null && label.equals(o.optString("l")))){ long v=o.optLong("v")+sg*amt; o.put("v",v); o.put("b",fmtFa(v)); o.put("n",v<0); }
        }
        e.putString("accounts",arr.toString());
      }catch(Exception ignored){}
      e.apply();
      return true;
    }catch(Throwable ignored){ return false; }
  }

  static Data load(Context c){
    SharedPreferences sp=c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    Data d=new Data();
    d.month=sp.getString("month", sp.getString("title",""));
    d.balance=sp.getString("balance","—");
    d.today=sp.getString("today","—");
    d.neg=sp.getBoolean("neg",false);
    d.locked=sp.getBoolean("locked",false);
    /* ۱.۳.۶۹: دکمهٔ چشم روی ویجت: مبالغ پنهان/نمایان (فقط روی ویجت، ذخیره‌شده) */
    d.hidden=sp.getBoolean("hidden",false);
    d.mask=d.locked||d.hidden;
    d.light=sp.getBoolean("light",false);
    d.none=sp.getBoolean("todayNone",false);
    d.accounts=sp.getString("accounts","[]");
    /* تاریخ همیشه از خود گوشی؛ اگر از آخرین به‌روزرسانی نرم‌افزار روز عوض شده، خرج امروز هنوز صفر است */
    String[] t=todayFa();
    if(t!=null){
      d.month=t[0];
      String saved=sp.getString("dayKey","");
      if(saved.length()>0 && !saved.equals(t[1])){ d.today=faDigits(0); d.none=true; }
    }
    return d;
  }

  static void fonts(Context c){
    if(BOLD!=null) return;
    try{ BOLD=androidx.core.content.res.ResourcesCompat.getFont(c, R.font.hk_vazir_bold); }catch(Exception ignored){}
    try{ REG=androidx.core.content.res.ResourcesCompat.getFont(c, R.font.hk_vazir_regular); }catch(Exception ignored){}
    if(BOLD==null) BOLD=Typeface.DEFAULT_BOLD;
    if(REG==null) REG=Typeface.DEFAULT;
  }

  /** اندازهٔ ویجت به پیکسل: [عرض، ارتفاع، چگالی مؤثر (پیکسل به ازای dp)] */
  static float[] size(Context c, AppWidgetManager m, int id, int defW, int defH){
    int w=0, h=0;
    try{
      Bundle o=m.getAppWidgetOptions(id);
      boolean land=c.getResources().getConfiguration().orientation==Configuration.ORIENTATION_LANDSCAPE;
      w=o.getInt(land?AppWidgetManager.OPTION_APPWIDGET_MAX_WIDTH:AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH);
      h=o.getInt(land?AppWidgetManager.OPTION_APPWIDGET_MIN_HEIGHT:AppWidgetManager.OPTION_APPWIDGET_MAX_HEIGHT);
    }catch(Exception ignored){}
    if(w<=0) w=defW;
    if(h<=0) h=defH;
    float k=c.getResources().getDisplayMetrics().density;
    float maxSide=Math.max(w,h)*k;
    if(maxSide>1200f) k*=1200f/maxSide;
    return new float[]{ Math.max(1, Math.round(w*k)), Math.max(1, Math.round(h*k)), k };
  }

  private static int muted(Data d){ return d.light?Color.parseColor("#6e6e76"):Color.parseColor("#98989f"); }
  private static int text(Data d){ return d.light?Color.parseColor("#1c1c1e"):Color.WHITE; }
  /* ۱.۳.۸۳: رنگ‌های ثابت نرم‌افزار (CLAUDE.md): درآمد ‎#9ee858 / روشن ‎#17834a، مخارج ‎#ff6b4a / روشن ‎#dc2626 */
  static int incC(boolean light){ return light?0xFF17834A:0xFF9EE858; }
  static int expC(boolean light){ return light?0xFFDC2626:0xFFFF6B4A; }
  private static int balColor(Data d){
    if(d.mask) return text(d);
    return d.neg?expC(d.light):incC(d.light);
  }
  private static Paint paint(Typeface tf, float size, int color, Paint.Align al){
    Paint p=new Paint(Paint.ANTI_ALIAS_FLAG|Paint.SUBPIXEL_TEXT_FLAG);
    p.setTypeface(tf); p.setTextSize(size); p.setColor(color); p.setTextAlign(al);
    return p;
  }
  /** اگر متن از عرض مجاز بیشتر شد، اندازه کوچک می‌شود */
  private static float fit(Typeface tf, float size, String t, float maxW){
    Paint p=paint(tf,size,0,Paint.Align.RIGHT);
    float w=p.measureText(t);
    return (w>maxW && w>0)?size*maxW/w:size;
  }

  /* یک سطر چیدمان */
  private static final class Line {
    boolean hdr, num; Typeface tf; float r, gap; String t; int col;
    Line(boolean hdr, boolean num, Typeface tf, float r, float gap, String t, int col){ this.hdr=hdr; this.num=num; this.tf=tf; this.r=r; this.gap=gap; this.t=t; this.col=col; }
    float box(){ return num?(NUM_A+NUM_D):(TXT_A+TXT_D); }
    float asc(){ return num?NUM_A:TXT_A; }
  }

  /** ویجت اصلی: اسم نرم‌افزار و ماه/سال، موجودی و مبلغ، خرج امروز و مبلغ */
  static Bitmap full(Context c, int W, int H, float k, Data d){
    fonts(c);
    Bitmap bm=Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
    Canvas cv=new Canvas(bm);
    float padX=14*k, padY=11*k, aw=W-2*padX, ah=H-2*padY;
    java.util.ArrayList<Line> L=new java.util.ArrayList<>();
    L.add(new Line(true,false,BOLD,1.0f,0,"حساب‌کتاب",text(d)));
    L.add(new Line(false,false,REG,0.95f,0.55f,"موجودی",muted(d)));
    L.add(new Line(false,true,BOLD,1.7f,0.12f,d.mask?"••••••":d.balance,balColor(d)));
    L.add(new Line(false,false,REG,0.95f,0.5f,"خرج امروز",muted(d)));
    if(d.locked) L.add(new Line(false,false,REG,0.95f,0.12f,"برای دیدن مبالغ، نرم‌افزار را باز کنید",text(d)));
    else if(d.hidden) L.add(new Line(false,true,BOLD,1.7f,0.12f,"••••••",text(d)));
    else if(d.none) L.add(new Line(false,false,REG,1.05f,0.12f,"هنوز خرجی نداشتی",text(d)));
    else L.add(new Line(false,true,BOLD,1.7f,0.12f,d.today,expC(d.light)));
    float units=0, gaps=0;
    for(int i=0;i<L.size();i++){ units+=L.get(i).r*L.get(i).box(); if(i>0) gaps+=L.get(i).gap; }
    float u=ah/(units+gaps), umax=19*k, extra=0;
    if(u>umax){ extra=ah-umax*(units+gaps); u=umax; }
    /* مبلغ موجودی و مبلغ خرج امروز هم‌اندازه (کوچک‌ترینِ اندازهٔ جاشونده) */
    float numS=Float.MAX_VALUE;
    for(Line l: L) if(l.num) numS=Math.min(numS, fit(l.tf, l.r*u, l.t, aw));
    float y=padY;
    for(int i=0;i<L.size();i++){
      Line l=L.get(i);
      if(i>0) y+=l.gap*u+(gaps>0?extra*(l.gap/gaps):0);
      float size=l.r*u;
      if(l.hdr){
        float s1=fit(BOLD,size,l.t,aw*0.55f);
        cv.drawText(l.t, W-padX, y+TXT_A*size, paint(BOLD,s1,l.col,Paint.Align.RIGHT));
        String m=d.month==null?"":d.month;
        /* ۱.۳.۶۹: گوشهٔ بالا-چپ جای دکمهٔ چشم است؛ ماه کمی راست‌تر */
        float eyeW=24*k;
        float s2=fit(REG,size,m,aw*0.42f-eyeW);
        cv.drawText(m, padX+eyeW, y+TXT_A*size, paint(REG,s2,muted(d),Paint.Align.LEFT));
        y+=size*(TXT_A+TXT_D);
        continue;
      }
      float s=l.num?numS:fit(l.tf,size,l.t,aw);
      /* مبالغ چپ‌چین، برچسب‌ها راست‌چین */
      if(l.num) cv.drawText(l.t, padX, y+l.asc()*size+(size-s)*l.asc()*0.5f, paint(l.tf,s,l.col,Paint.Align.LEFT));
      else cv.drawText(l.t, W-padX, y+l.asc()*size+(size-s)*l.asc()*0.5f, paint(l.tf,s,l.col,Paint.Align.RIGHT));
      y+=size*l.box();
    }
    return bm;
  }

  /** ویجت حساب‌ها: موجودی تک‌تک حساب‌ها (کارت‌ها)، موجودی کل و خرج امروز — ردیف‌ها کل ارتفاع را پر می‌کنند */
  static String dots(org.json.JSONArray a){
    if(a==null) return "";
    StringBuilder sb=new StringBuilder();
    for(int i=0;i<a.length() && i<4;i++){ String h=a.optString(i,""); if(h.matches("#[0-9a-fA-F]{6}")){ if(sb.length()>0) sb.append(','); sb.append(h); } }
    return sb.toString();
  }
  static Bitmap accounts(Context c, int W, int H, float k, Data d){
    fonts(c);
    Bitmap bm=Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
    Canvas cv=new Canvas(bm);
    float padX=14*k, padY=11*k, aw=W-2*padX, ah=H-2*padY;
    java.util.ArrayList<String[]> rows=new java.util.ArrayList<>();
    try{
      org.json.JSONArray a=new org.json.JSONArray(d.accounts==null?"[]":d.accounts);
      for(int i=0;i<a.length();i++){ org.json.JSONObject o=a.optJSONObject(i); if(o!=null) rows.add(new String[]{o.optString("l",""), o.optString("b","—"), o.optBoolean("n",false)?"1":"0", o.optBoolean("t",false)?"1":"0", dots(o.optJSONArray("p"))}); }
    }catch(Exception ignored){}
    boolean empty=rows.isEmpty();
    int n=(empty?1:rows.size())+1; /* + خرج امروز */
    float hdr=1.0f, rowR=1.0f, gap=0.45f;
    float units=hdr*(TXT_A+TXT_D)+n*rowR*(NUM_A+NUM_D)+n*gap;
    float u=Math.min(ah/units, 17*k);
    /* فضای خالیِ باقی‌مانده بین فاصله‌ها پخش می‌شود تا ردیف‌ها کل باکس را پر کنند */
    float extra=Math.max(0f, ah-u*units)/n;
    float y=padY;
    float hs=fit(BOLD,u,"حساب‌کتاب",aw*0.55f);
    cv.drawText("حساب‌کتاب", W-padX, y+TXT_A*u, paint(BOLD,hs,text(d),Paint.Align.RIGHT));
    String m=d.month==null?"":d.month;
    cv.drawText(m, padX+24*k, y+TXT_A*u, paint(REG,fit(REG,u*0.9f,m,aw*0.42f-24*k),muted(d),Paint.Align.LEFT));
    y+=u*(TXT_A+TXT_D);
    if(empty && !d.locked){
      y+=gap*u+extra;
      cv.drawText("حسابی ثبت نشده", W-padX, y+TXT_A*u, paint(REG,fit(REG,u,"حسابی ثبت نشده",aw),muted(d),Paint.Align.RIGHT));
      y+=u*(NUM_A+NUM_D);
    } else if(empty){ y+=gap*u+extra+u*(NUM_A+NUM_D); }
    for(String[] r: rows){
      float g=gap*u+extra;
      boolean tot="1".equals(r[3]);
      if(tot){
        /* خط نازک جداکننده بالای موجودی کل */
        Paint lp=new Paint(Paint.ANTI_ALIAS_FLAG); lp.setColor(muted(d)); lp.setAlpha(70); lp.setStrokeWidth(Math.max(1f,0.8f*k));
        float ly=y+g*0.5f; cv.drawLine(padX, ly, W-padX, ly, lp);
      }
      y+=g;
      float ls=fit(tot?BOLD:REG,u*rowR,r[0],aw*0.45f);
      Paint lpn=paint(tot?BOLD:REG,ls,tot?text(d):muted(d),Paint.Align.RIGHT);
      cv.drawText(r[0], W-padX, y+NUM_A*u, lpn);
      String val=d.mask?"••••••":r[1];
      int col=d.mask?text(d):("1".equals(r[2])?expC(d.light):incC(d.light));
      Paint vp=paint(BOLD,fit(BOLD,u*rowR,val,aw*0.52f),col,Paint.Align.LEFT);
      cv.drawText(val, padX, y+NUM_A*u, vp);
      /* نقطه(های) رنگ پروژه درست جلوی عدد موجودی (مثل موجودی آنی نرم‌افزار) */
      if(!d.mask && r.length>4 && r[4]!=null && r[4].length()>0){
        float dr=Math.max(2.2f*k, ls*0.17f), dx=padX+vp.measureText(val)+dr+5*k, dy=y+NUM_A*u-ls*0.32f;
        for(String hc: r[4].split(",")){
          try{ Paint dp=new Paint(Paint.ANTI_ALIAS_FLAG); dp.setColor(Color.parseColor(hc.trim())); cv.drawCircle(dx, dy, dr, dp); }catch(Exception ignored){}
          dx+=dr*2+2.5f*k;
        }
      }
      y+=u*rowR*(NUM_A+NUM_D);
    }
    y+=gap*u+extra;
    cv.drawText("خرج امروز", W-padX, y+NUM_A*u, paint(REG,fit(REG,u,"خرج امروز",aw*0.45f),muted(d),Paint.Align.RIGHT));
    String tv=d.mask?"••••••":(d.none?"۰":d.today);
    cv.drawText(tv, padX, y+NUM_A*u, paint(BOLD,fit(BOLD,u,tv,aw*0.52f),d.mask?text(d):expC(d.light),Paint.Align.LEFT));
    return bm;
  }

  /** ویجت یک‌خطی: صفحهٔ ۰ = موجودی، صفحهٔ ۱ = خرج امروز (با اسکرول عمودی) */
  static Bitmap page(Context c, int W, int H, float k, Data d, int page){
    fonts(c);
    Bitmap bm=Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
    Canvas cv=new Canvas(bm);
    /* ۱.۳.۸۳: هر صفحه یک کارت مات کامل (پس‌زمینه و قاب خودش) تا در پشته، کارت پشتی از زیرش دیده نشود */
    {
      float rr=Math.min(18*k, H*0.32f), sw=Math.max(1f, k);
      Paint bg=new Paint(Paint.ANTI_ALIAS_FLAG); bg.setColor(d.light?0xFFFFFFFF:0xFF1B1B1B);
      android.graphics.RectF rc=new android.graphics.RectF(sw/2, sw/2, W-sw/2, H-sw/2);
      cv.drawRoundRect(rc, rr, rr, bg);
      Paint st=new Paint(Paint.ANTI_ALIAS_FLAG); st.setStyle(Paint.Style.STROKE); st.setStrokeWidth(sw); st.setColor(d.light?0x1A000000:0x2EFFFFFF);
      cv.drawRoundRect(rc, rr, rr, st);
    }
    /* سمت چپ دو نقطهٔ کوچک نشانگر صفحه */
    float btnW=16*k;
    float padX=14*k, padY=Math.max(5*k, H*0.1f), ah=H-2*padY, aw=W-2*padX-btnW;
    String label=page==0?"موجودی":"خرج امروز";
    String val; boolean num=true; Typeface vf=BOLD; float vr=1.9f; int vc=text(d);
    if(page==0){ val=d.mask?"••••••":d.balance; vc=balColor(d); }
    else if(d.locked){ val="نرم‌افزار را باز کنید"; num=false; vf=REG; vr=1.1f; }
    else if(d.hidden){ val="••••••"; }
    else if(d.none){ val="هنوز خرجی نداشتی"; num=false; vf=REG; vr=1.1f; }
    else{ val=d.today; vc=expC(d.light); }
    float b1=TXT_A+TXT_D, b2=num?(NUM_A+NUM_D):(TXT_A+TXT_D), gap=0.1f;
    float u=ah/(b1+vr*b2+gap);
    float s=fit(REG,u,label,aw);
    cv.drawText(label, W-padX, padY+TXT_A*u, paint(REG,s,muted(d),Paint.Align.RIGHT));
    float y=padY+u*b1+gap*u, vs=vr*u, a=num?NUM_A:TXT_A;
    s=fit(vf,vs,val,aw);
    if(num) cv.drawText(val, btnW+6*k, y+a*vs, paint(vf,s,vc,Paint.Align.LEFT));
    else cv.drawText(val, W-padX, y+a*vs, paint(vf,s,vc,Paint.Align.RIGHT));
    float cx=10*k, cy=H-11*k, r=2.2f*k;
    for(int i=0;i<2;i++){
      Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
      p.setColor(i==page?text(d):(d.light?Color.parseColor("#c7c7cc"):Color.parseColor("#48484a")));
      cv.drawCircle(cx, cy+(i==0?-1:1)*4.5f*k, r, p);
    }
    return bm;
  }
}
