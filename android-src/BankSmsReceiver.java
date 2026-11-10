package ir.hesabketab.app;

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Telephony;
import android.telephony.SmsMessage;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.app.Person;
import androidx.core.app.RemoteInput;
import androidx.core.content.pm.ShortcutInfoCompat;
import androidx.core.content.pm.ShortcutManagerCompat;
import androidx.core.graphics.drawable.IconCompat;
import org.json.JSONArray;
import org.json.JSONObject;

public class BankSmsReceiver extends BroadcastReceiver {
  static final String PREFS="bank_sms_bridge";
  static final String QUEUE="pending_queue";
  static final String CHANNEL="bank_sms";
  static final String KEY_DESC="hk_quick_desc";
  static final String ACTION_QUICK="ir.hesabketab.app.QUICK_REPLY";
  static final String ACTION_CAT="ir.hesabketab.app.QUICK_CAT";
  /** ۱.۳.۵۱: تراکنش «بی‌مشکل» از قبل معلوم است؟ (حساب شناخته‌شده، شخصی نیست، مبلغش مثل درآمد ثابت نیست)
      بی‌مشکل → ثبت سریع و دکمه‌های دسته داخل خود اعلان (بی باز شدن نرم‌افزار)؛ وگرنه نرم‌افزار باز می‌شود تا تکمیل شود */
  static boolean isClean(Context c,String text,String sender){
    try{
      if(isPersonal(sender)) return false;
      SharedPreferences sp=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
      StringBuilder nb=new StringBuilder();
      for(char ch:text.toCharArray()){
        if(ch>='۰'&&ch<='۹') nb.append((char)('0'+(ch-'۰')));
        else if(ch>='٠'&&ch<='٩') nb.append((char)('0'+(ch-'٠')));
        else if(ch==','||ch=='،'||ch=='٬') continue;
        else nb.append(ch);
      }
      java.util.ArrayList<String> nums=new java.util.ArrayList<>();
      java.util.regex.Matcher m=java.util.regex.Pattern.compile("[0-9]+").matcher(nb);
      while(m.find()) nums.add(m.group());
      JSONArray acc=new JSONArray(sp.getString("hk_nacc4","[]"));
      boolean known=false;
      for(int i=0;i<acc.length()&&!known;i++){ String a=acc.optString(i); if(a.length()<3) continue; for(String n:nums){ if(n.length()>=a.length()&&n.endsWith(a)){ known=true; break; } } }
      if(!known) return false;
      JSONArray rec=new JSONArray(sp.getString("hk_nrec","[]"));
      for(int i=0;i<rec.length();i++){ String a=rec.optString(i); for(String n:nums){ if(n.equals(a)) return false; } }
      return true;
    }catch(Throwable t){ return false; }
  }

  /** ۱.۳.۷۵: پیامک شخصی یا پوشهٔ بی‌شماره که با فرستنده مسدود شده */
  static boolean isBlockedSender(Context c,String sender){
    try{
      if(sender==null||sender.length()==0) return false;
      JSONArray bl=new JSONArray(c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString("hk_nblocks","[]"));
      if(bl.length()==0) return false;
      StringBuilder nb=new StringBuilder();
      for(char ch:sender.toCharArray()){
        if(ch>='۰'&&ch<='۹') nb.append((char)('0'+(ch-'۰')));
        else if(ch>='٠'&&ch<='٩') nb.append((char)('0'+(ch-'٠')));
        else if(ch==' '||ch=='-'||ch=='('||ch==')') continue;
        else nb.append(Character.toLowerCase(ch));
      }
      String sn=nb.toString();
      if(sn.startsWith("+98")&&sn.length()==13) sn="0"+sn.substring(3);
      else if(sn.startsWith("0098")&&sn.length()==14) sn="0"+sn.substring(4);
      else if(sn.startsWith("98")&&sn.length()==12&&sn.charAt(2)=='9') sn="0"+sn.substring(2);
      for(int i=0;i<bl.length();i++){ if(sn.equals(bl.optString(i))) return true; }
      return false;
    }catch(Throwable t){ return false; }
  }
  static boolean isBlocked(Context c,String text){
    try{
      JSONArray bl=new JSONArray(c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString("hk_nblock","[]"));
      if(bl.length()==0) return false;
      StringBuilder nb=new StringBuilder();
      for(char ch:text.toCharArray()){
        if(ch>='۰'&&ch<='۹') nb.append((char)('0'+(ch-'۰')));
        else if(ch>='٠'&&ch<='٩') nb.append((char)('0'+(ch-'٠')));
        else nb.append(ch);
      }
      java.util.regex.Matcher m=java.util.regex.Pattern.compile("[0-9][0-9*xX -]{6,}[0-9]").matcher(nb);
      while(m.find()){
        String d=m.group().replaceAll("[^0-9*xX]","");
        java.util.regex.Matcher t=java.util.regex.Pattern.compile("([0-9]{4,})$").matcher(d);
        if(!t.find()) continue;
        String tail=t.group(1); tail=tail.substring(tail.length()-4);
        for(int i=0;i<bl.length();i++){ if(tail.equals(bl.optString(i))) return true; }
      }
      return false;
    }catch(Throwable t){ return false; }
  }

  @Override public void onReceive(Context context, Intent intent) {
    if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;
    if (Build.VERSION.SDK_INT >= 23 && context.checkSelfPermission(Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) return;
    SmsMessage[] msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent);
    if (msgs == null || msgs.length == 0) return;
    StringBuilder body=new StringBuilder(); String sender=msgs[0].getOriginatingAddress();
    long ts=msgs[0].getTimestampMillis();
    // ۱.۳.۴۲: تکه‌های پیامک چندبخشی بدون جداکننده به هم وصل می‌شوند (قبلاً «\n» وسطشان می‌آمد و مثلاً «0727-17:33» می‌شد «0727-1⏎7:33» → ساعت ۰۷:۳۳)
    for(SmsMessage m:msgs) if(m!=null && m.getMessageBody()!=null) body.append(m.getMessageBody());
    String text=body.toString().trim();
    if(!looksLikeBankTransaction(text, sender)) return;
    /* ۱.۳.۷۴: حساب مسدود (رقم‌های آخر در فهرست کاربر) → نه صف، نه اعلان */
    if(isBlocked(context,text) || isBlockedSender(context,sender)) return;
    SharedPreferences sp=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    try{
      JSONArray q=new JSONArray(sp.getString(QUEUE,"[]"));
      long now=System.currentTimeMillis();
      for(int i=0;i<q.length();i++){
        JSONObject x=q.optJSONObject(i);
        if(x!=null && text.equals(x.optString("text")) && now-x.optLong("receivedAt",0)<60000) return;
      }
      int nid=(int)(now&0x7fffffff);
      /* شناسهٔ یکتا حتی برای چند پیامکِ هم‌زمان */
      boolean clash=true; while(clash){ clash=false; for(int i=0;i<q.length();i++){ JSONObject y=q.optJSONObject(i); if(y!=null && y.optInt("nid",0)==nid){ nid++; clash=true; break; } } }
      JSONObject item=new JSONObject(); item.put("text",text); item.put("sender",sender==null?"":sender); item.put("receivedAt",ts>0?ts:now); item.put("nid",nid);
      q.put(item);
      while(q.length()>200){ JSONArray nq=new JSONArray(); for(int i=1;i<q.length();i++) nq.put(q.get(i)); q=nq; }
      sp.edit().putString(QUEUE,q.toString()).apply();
      /* ۱.۳.۵۶: همان لحظه روی ویجت (تا نرم‌افزار باز شود و دقیق حساب کند) */
      try{ HkWidgetDraw.applySms(context,text,sender); }catch(Throwable ignored){}
      postNotification(context,text,nid,sender);
    }catch(Exception ignored){}
  }

  static String normFa(String s){
    if(s==null) return "";
    String r=s.toLowerCase(java.util.Locale.ROOT);
    r=r.replace('\u0643','\u06a9').replace('\u064a','\u06cc').replace('\u0649','\u06cc')
       .replace('\u0629','\u0647').replace('\u06c0','\u0647').replace('\u0623','\u0627').replace('\u0625','\u0627')
       .replace('\u066c',',').replace('\u066b','.').replace("\u200c"," ").replace("\u0640","");
    StringBuilder b=new StringBuilder(r.length());
    for(int i=0;i<r.length();i++){
      char c=r.charAt(i);
      if(c>='\u06f0'&&c<='\u06f9') c=(char)('0'+(c-'\u06f0'));
      else if(c>='\u0660'&&c<='\u0669') c=(char)('0'+(c-'\u0660'));
      b.append(c);
    }
    return b.toString();
  }

  static boolean looksLikeBankTransaction(String s, String sender){
    String t=normFa(s), sd=normFa(sender);
    // رد فوری OTP / رمز پویا / شناسه تأیید برداشت (حتی با مبلغ)
    if(t.contains("شناسه تایید") || t.contains("شناسه تأيید") || t.contains("شناسه تايید")
        || t.contains("شناسه تأیید") || t.contains("شناسه تاييد") || t.contains("شناسه تایید برداشت")
        || t.contains("رمز پویا") || t.contains("رمزپویا") || t.contains("رمز موقت")
        || t.contains("رمز لحظه") || t.contains("رمزلحظه") || t.contains("رمز دوم")
        || t.contains("کد تایید") || t.contains("کد تأیید") || t.contains("کد تاييد")
        || t.contains("otp") || t.contains("one-time") || t.contains("onetime")
        || (t.contains("محرمانه") && (t.contains("رمز") || t.contains("کد")))
        || (t.contains("هشدار") && t.contains("شناسه") && t.contains("برداشت"))
        // «رمز» و بلافاصله عدد ۴ تا ۸ رقمی = رمز یک‌بارمصرف (مثل بانک ملی)، نه تراکنش انجام‌شده
        || t.matches("(?s).*رمز\\s*[:：]?\\s*[0-9]{4,8}([^0-9].*)?")) {
      return false;
    }
    // رد تبلیغات اپراتور/غیر بانکی — اما «خرید شارژ» بانکی با مانده/حساب را رد نکن
    boolean looksPromoCharge = (t.contains("شگفت انگیز") || t.contains("شگفت‌انگیز")
        || t.contains("بسته اینترنت") || t.contains("بسته اينترنت")
        || t.contains("مشترک گرامی") || t.contains("مشترک عزيز") || t.contains("مشترک عزیز")
        || t.contains("هدیه") || t.contains("جایزه") || t.contains("قرعه") || t.contains("تخفیف")
        || t.contains("کد تخفیف") || t.contains("فروشگاه") || t.contains("اپلیکیشن")
        || t.contains("دانلود") || t.contains("لینک") || t.contains("کلیک"));
    boolean bankCharge = (t.contains("خرید شارژ") || t.contains("خریدشارژ") || t.contains("شارژ"))
        && (t.contains("مانده") || t.contains("موجودی") || t.contains("حساب") || t.contains("بانک"));
    if(looksPromoCharge && !bankCharge) {
      return false;
    }
    if(t.contains("شارژ") && !bankCharge && !t.contains("مانده") && !t.contains("موجودی") && !t.contains("حساب")) {
      return false;
    }
    // تراکنش ناموفق ثبت نشود
    if(t.contains("ناموفق") || t.contains("عدم موفق") || t.contains("انجام نشد") || t.contains("رد شد")
        || t.contains("کافی نیست") || t.contains("عدم کفایت")) return false;
    boolean hasBal0 = t.contains("مانده") || t.contains("موجودی");
    // اطلاعیه/یادآوری/تبلیغ بدون خط مانده → تراکنش نیست
    if(!hasBal0 && (t.contains("یادآوری") || t.contains("سررسید") || t.contains("اطلاعیه") || t.contains("مهلت")
        || t.contains("http") || t.contains("www.") || t.contains("لغو") || t.contains("جشنواره") || t.contains("قرعه")
        || t.contains("تخفیف") || t.contains("جایزه") || t.contains("نصب") || t.contains("ثبت نام"))) return false;
    // فقط پیامک‌های واقعی بانکی
    boolean strongTx = t.contains("واریز") || t.contains("برداشت") || t.contains("کسر از") || t.contains("کسر مبلغ")
        || t.contains("انتقال وجه") || t.contains("انتقال به") || t.contains("خرید از") || t.contains("پرداخت وجه")
        || t.contains("قبض") || t.contains("سود") || t.contains("کارمزد") || t.contains("عودت") || t.contains("برگشت")
        || t.contains("چک") || t.contains("پایا") || t.contains("ساتنا");
    /* «قسط» فقط وقتی تراکنش است که نشانه‌های مالی دیگر هم باشد (مانده/موجودی، یا حساب/کارت) — تنها کلمهٔ قسط ملاک نیست */
    boolean installTx = t.contains("قسط") && (t.contains("مانده") || t.contains("موجودی") || t.contains("حساب") || t.contains("کارت"));
    if(installTx) strongTx = true;
    boolean weakTx = t.contains("خرید") || t.contains("خرید شارژ") || t.contains("شارژ") || t.contains("پرداخت") || t.contains("انتقال") || t.contains("تراکنش");
    boolean hasBalance = t.contains("موجودی") || t.contains("مانده") || t.contains("موجودي");
    boolean bankHint = t.contains("بانک") || t.contains("کارت") || t.contains("حساب") || t.contains("atm") || t.contains("pos");
    boolean bankName = t.contains("ملی")||t.contains("ملت")||t.contains("سپه")||t.contains("صادرات")||t.contains("تجارت")
        ||t.contains("کشاورزی")||t.contains("مسکن")||t.contains("رفاه")||t.contains("پارسیان")||t.contains("پاسارگاد")
        ||t.contains("سامان")||t.contains("سینا")||t.contains("شهر")||t.contains("انصار")||t.contains("کارافرین")
        ||t.contains("گردشگری")||t.contains("پستبانک")||t.contains("مهر")||t.contains("رسالت")
        ||t.contains("mellat")||t.contains("melli")||t.contains("sepah")||t.contains("saderat")||t.contains("tejarat")
        ||t.contains("keshavarzi")||t.contains("maskan")||t.contains("refah")||t.contains("parsian")||t.contains("pasargad")||t.contains("saman");
    boolean senderBank = sd.contains("بانک")||sd.contains("ملی")||sd.contains("ملت")||sd.contains("سپه")||sd.contains("صادرات")
        ||sd.contains("تجارت")||sd.contains("کشاورزی")||sd.contains("مسکن")||sd.contains("رفاه")||sd.contains("پارسیان")
        ||sd.contains("پاسارگاد")||sd.contains("سامان")||sd.contains("mellat")||sd.contains("melli")||sd.contains("sepah")||sd.contains("bank");
    boolean money = t.matches("(?s).*\\d[\\d,٬،. ]{2,}.*");
    if(!money) return false;
    // قانون کلی (مستقل از کلمه‌ها): خط «مانده/موجودی» + مبلغ + نشانهٔ بانک = تراکنش (مثل «قبض برق:22,122,000-»)؛
    // رمز یک‌بارمصرف، تبلیغ و تراکنش ناموفق بالاتر رد شده‌اند و درستی مبلغ را زنجیرهٔ مانده در نرم‌افزار می‌سنجد
    if(hasBalance && (bankHint || bankName || senderBank)) return true;
    // سخت‌گیرانه‌تر
    if(strongTx && (hasBalance || bankHint || bankName || senderBank)) return true;
    if(weakTx && hasBalance && (bankHint || bankName || senderBank)) return true;
    if(senderBank && strongTx) return true;
    return false;
  }

  /** ۱.۳.۴۴: فرستندهٔ شمارهٔ موبایل شخصی (۰۹۰x…۰۹۴x، ۰۹۹x)؛ سرشمارهٔ خدماتی بانک (مثل ۹۸۳۰۰۰۹۴۱۷) شخصی نیست */
  static boolean isPersonal(String sender){
    if(sender==null) return false;
    StringBuilder b=new StringBuilder();
    for(int i=0;i<sender.length();i++){ char ch=sender.charAt(i); if(ch>='0'&&ch<='9') b.append(ch); else if(ch>='\u06f0'&&ch<='\u06f9') b.append((char)('0'+(ch-'\u06f0'))); }
    String d=b.toString();
    if(d.startsWith("0098")) d=d.substring(4); else if(d.startsWith("98")) d=d.substring(2); else if(d.startsWith("0")) d=d.substring(1);
    return d.length()==10 && d.charAt(0)=='9' && "012349".indexOf(d.charAt(1))>=0;
  }

  /* ۱.۳.۹۶: دکمه‌های دستهٔ اعلان در یک تابع تا بعد از نوشتن شرح هم (اعلان «دسته را بزنید») همان دکمه‌ها بیایند */
  static void addCatButtons(Context c,NotificationCompat.Builder b,int nid,String text,boolean inc,boolean clean){
    try{
      SharedPreferences sp=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
      JSONArray cats=new JSONArray(sp.getString(inc?"hk_ncats_in":"hk_ncats_out","[]"));
      if(cats.length()>0){
        RemoteViews rv=new RemoteViews(c.getPackageName(),R.layout.hk_tx);
        rv.setTextViewText(R.id.hk_tx_text,text);
        int[] ids={R.id.hk_c0,R.id.hk_c1,R.id.hk_c2,R.id.hk_c3};
        /* ۱.۳.۵۳: دکمهٔ پنجم «بیشتر…» → باکس ثبت در نرم‌افزار با فهرست کامل دسته‌ها */
        try{
          rv.setTextViewText(R.id.hk_c4,"بیشتر…");
          Intent mi=new Intent(c,HkCatActivity.class); mi.setAction("ir.hesabketab.app.MORE_"+nid);
          mi.putExtra("nid",nid); mi.putExtra("cat","__more__"); mi.putExtra("label","");
          mi.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
          rv.setOnClickPendingIntent(R.id.hk_c4,PendingIntent.getActivity(c,nid*8+6,mi,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE));
        }catch(Throwable ignored){}
        for(int k=0;k<ids.length;k++){
          JSONObject ct=k<cats.length()?cats.optJSONObject(k):null;
          if(ct==null){ rv.setViewVisibility(ids[k],android.view.View.GONE); continue; }
          rv.setTextViewText(ids[k],ct.optString("l"));
          PendingIntent cpi;
          if(clean){
            Intent ci=new Intent(c,HkQuickReplyReceiver.class); ci.setAction(ACTION_CAT+"_"+nid+"_"+k);
            ci.putExtra("nid",nid); ci.putExtra("cat",ct.optString("k")); ci.putExtra("label",ct.optString("l"));
            cpi=PendingIntent.getBroadcast(c,nid*8+k+1,ci,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
          }else{
            Intent ci=new Intent(c,HkCatActivity.class); ci.setAction("ir.hesabketab.app.CAT_"+nid+"_"+k);
            ci.putExtra("nid",nid); ci.putExtra("cat",ct.optString("k")); ci.putExtra("label",ct.optString("l"));
            ci.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            cpi=PendingIntent.getActivity(c,nid*8+k+1,ci,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
          }
          rv.setOnClickPendingIntent(ids[k],cpi);
        }
        b.setStyle(new NotificationCompat.DecoratedCustomViewStyle()).setCustomBigContentView(rv);
      }
    }catch(Throwable ignored){}
  }
  /* ۱.۳.۹۶: بعد از «ثبت سریع» با شرح: همان اعلان با «بابت: …» و دکمه‌های دسته؛ زدن دسته شرح را نگه می‌دارد (فقط دسته اضافه می‌شود).
     اگر دسته‌ای زده نشود، شرح ذخیره شده و تراکنش بی‌دسته (یا با حدس از شرح) ثبت می‌شود */
  static void postCatAfterDesc(Context c,int nid,String desc){
    try{
      JSONObject it=HkQuickReplyReceiver.findItem(c,nid); if(it==null) return;
      String text=it.optString("text","");
      int sg=txSign(text);
      boolean inc=sg!=0?sg>0:(text.contains("واریز")||text.contains("+"));
      String t1=desc.isEmpty()?"بدون شرح":"بابت: "+desc;
      NotificationCompat.Builder b=baseBuilder(c,t1,"دسته را بزنید (اختیاری)");
      b.setOnlyAlertOnce(true).setPriority(NotificationCompat.PRIORITY_LOW);
      if(Build.VERSION.SDK_INT>=26) b.setTimeoutAfter(30000);
      addCatButtons(c,b,nid,t1+"\nدسته را بزنید (اختیاری)",inc,true);
      ((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(nid,b.build());
    }catch(Throwable ignored){}
  }

  /* ۱.۳.۹۷: بعد از زدن دسته (بی شرح): «… ثبت شد» و دکمهٔ «افزودن شرح» (پاسخ مستقیم)؛ تا ۳۰ ثانیه، بعد همان دسته با شرح اسم دسته ثبت می‌شود */
  static void postDescAfterCat(Context c,int nid,String label){
    try{
      String t1=label+" ثبت شد";
      NotificationCompat.Builder b=baseBuilder(c,t1,"شرح هم می‌خواهید؟ «افزودن شرح» را بزنید، بنویسید و فلش را بزنید (اختیاری)");
      b.setOnlyAlertOnce(true).setPriority(NotificationCompat.PRIORITY_LOW);
      if(Build.VERSION.SDK_INT>=26) b.setTimeoutAfter(30000);
      int fl=PendingIntent.FLAG_UPDATE_CURRENT|(Build.VERSION.SDK_INT>=31?PendingIntent.FLAG_MUTABLE:0);
      Intent qi=new Intent(c,HkQuickReplyReceiver.class); qi.setAction(ACTION_QUICK+"_AC_"+nid); qi.putExtra("nid",nid); qi.putExtra("afterCat",true); qi.putExtra("label",label);
      PendingIntent qpi=PendingIntent.getBroadcast(c,nid*8+7,qi,fl);
      RemoteInput ri=new RemoteInput.Builder(KEY_DESC).setLabel("شرح را بنویس و فلش را بزن").build();
      b.addAction(new NotificationCompat.Action.Builder(android.R.drawable.ic_menu_edit,"افزودن شرح",qpi).addRemoteInput(ri).setAllowGeneratedReplies(false).setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_REPLY).build());
      ((NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE)).notify(nid,b.build());
    }catch(Throwable ignored){}
  }

  static NotificationCompat.Builder baseBuilder(Context c,String title,String text){
    Intent i=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
    NotificationCompat.Builder b=new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(text.replace('\n',' ')).setStyle(new NotificationCompat.BigTextStyle().bigText(text)).setAutoCancel(true).setCategory(NotificationCompat.CATEGORY_MESSAGE).setPriority(NotificationCompat.PRIORITY_HIGH);
    if(i!=null){ i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP); b.setContentIntent(PendingIntent.getActivity(c,1001,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE)); }
    return b;
  }

  /** ۱.۳.۶۴: نوع تراکنش برای رنگ اعلان (همان تشخیص ویجت): ۱ واریز، ‎-۱ برداشت، ۰ نامعلوم */
  static int txSign(String text){ try{ return HkWidgetDraw.smsSign(normFa(text)); }catch(Throwable e){ return 0; } }
  static String txTitle(int sg){ return sg>0?"واریز جدید":(sg<0?"برداشت جدید":"تراکنش بانکی جدید"); }
  static void postNotification(Context c,String text,int nid,String sender){
    if(Build.VERSION.SDK_INT>=33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) return;
    NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
    if(Build.VERSION.SDK_INT>=26){ NotificationChannel ch=new NotificationChannel(CHANNEL,"تراکنش‌های بانکی",NotificationManager.IMPORTANCE_HIGH); if(Build.VERSION.SDK_INT>=29) ch.setAllowBubbles(true); nm.createNotificationChannel(ch); }
    /* ۱.۳.۴۴: پیامک از شمارهٔ شخصی دور انداخته نمی‌شود؛ در اعلان «پیامک شخصی» با شمارهٔ فرستنده معرفی می‌شود */
    /* ۱.۳.۴۵: کوتاه و بی‌ایموجی (ایموجی سطر را بلند می‌کرد و متن پیامک زیرش نصفه می‌ماند)؛ شماره چپ‌به‌راست تا «+» جلوی ۹۸ بماند */
    /* ۱.۳.۴۶: چیدمان اختصاصی و راست‌چین: عنوان («تراکنش بانکی جدید» یا «فرستندهٔ شخصی» به رنگ هشدار) و متن کامل پیامک؛
       به‌جای آیکن حباب، دکمهٔ «باکس» زیر اعلان همان باکس شناور را باز می‌کند */
    /* ۱.۳.۴۷: دوباره چیدمان رسمی اندروید (BigTextStyle)؛ چیدمان اختصاصی ۱.۳.۴۶ برداشته شد */
    boolean personal=isPersonal(sender);
    /* ۱.۳.۵۳: شخصی‌سازی: اعلان پیامک شخصی خاموش (پیامک در صف می‌ماند و در نرم‌افزار نشان داده می‌شود) */
    try{ if(personal && "0".equals(c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString("hk_npersonal","1"))) return; }catch(Throwable ignored){}
    final boolean clean=isClean(c,text,sender);
    final int sg=txSign(text);
    String title=personal?"فرستندهٔ شخصی":txTitle(sg);
    NotificationCompat.Builder b=baseBuilder(c,title,text);
    /* ۱.۳.۶۴: رنگ عملیات: عنوان و رنگ اعلان، واریز سبز و برداشت قرمز (پس‌زمینهٔ کامل را اندروید فقط برای موزیک/تماس اجازه می‌دهد) */
    if(!personal && sg!=0){
      try{
        int col=sg>0?0xFF34C759:0xFFFF3B30;
        android.text.SpannableString st=new android.text.SpannableString(title);
        st.setSpan(new android.text.style.ForegroundColorSpan(col),0,st.length(),android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        st.setSpan(new android.text.style.StyleSpan(android.graphics.Typeface.BOLD),0,st.length(),android.text.Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        b.setContentTitle(st).setColor(col);
      }catch(Throwable ignored){}
    }
    /* ۱.۳.۴۳: «ثبت سریع» از خود اعلان (پاسخ مستقیم): با زدنش فیلد «بابت چی بود؟» پایین می‌آید و با ارسال ثبت می‌شود */
    try{
      /* ۱.۳.۵۰: ثبت سریع از راه HkCatActivity: نرم‌افزار بالا می‌آید و ثبت می‌کند؛ اگر مغایرت/حساب ناموجود بود همان‌جا می‌ماند تا کاربر تکمیل کند */
      int fl=PendingIntent.FLAG_UPDATE_CURRENT|(Build.VERSION.SDK_INT>=31?PendingIntent.FLAG_MUTABLE:0);
      PendingIntent qpi;
      if(clean){
        Intent qi=new Intent(c,HkQuickReplyReceiver.class); qi.setAction(ACTION_QUICK); qi.putExtra("nid",nid);
        qpi=PendingIntent.getBroadcast(c,nid,qi,fl);
      }else{
        Intent qi=new Intent(c,HkCatActivity.class); qi.setAction("ir.hesabketab.app.QUICK_"+nid); qi.putExtra("nid",nid);
        qi.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        qpi=PendingIntent.getActivity(c,nid,qi,fl);
      }
      RemoteInput ri=new RemoteInput.Builder(KEY_DESC).setLabel("بابت چی بود؟ بنویس و فلش را بزن").build(); /* ۱.۳.۹۷: راهنمای فلش */
      NotificationCompat.Action act=new NotificationCompat.Action.Builder(android.R.drawable.ic_menu_edit,"ثبت سریع",qpi).addRemoteInput(ri).setAllowGeneratedReplies(false).setSemanticAction(NotificationCompat.Action.SEMANTIC_ACTION_REPLY).build();
      b.addAction(act);
    }catch(Throwable ignored){}
    /* ۱.۳.۴۶: دکمهٔ «باکس» → باکس شناور ثبت روی همان صفحه */
    try{
      Intent bi=new Intent(c,HkQuickActivity.class); bi.setAction("ir.hesabketab.app.BOX_"+nid); bi.putExtra("nid",nid);
      bi.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_MULTIPLE_TASK);
      PendingIntent bpi=PendingIntent.getActivity(c,nid,bi,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
      b.addAction(new NotificationCompat.Action.Builder(android.R.drawable.ic_menu_edit,"باکس",bpi).build());
    }catch(Throwable ignored){}
    /* ۱.۳.۵۰: اعلان اختصاصی: متن پیامک + چهار دستهٔ پرکاربرد؛ زدن دسته = ثبت با همان دسته (شرح = اسم دسته) */
    addCatButtons(c,b,nid,text,sg!=0?sg>0:(text.contains("واریز")||text.contains("+")),clean);
    try{ nm.notify(nid,b.build()); }
    catch(Throwable t){ try{ nm.notify(nid,baseBuilder(c,title,text).build()); }catch(Throwable ignored){} }
  }
}
