const fs=require('fs'), path=require('path');
const root=path.resolve(__dirname,'..');
const pkg='ir.hesabketab.app';
const base=path.join(root,'android');
const javaDir=path.join(base,'app/src/main/java',...pkg.split('.'));
fs.mkdirSync(javaDir,{recursive:true});

const receiver=`package ${pkg};

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

  @Override public void onReceive(Context context, Intent intent) {
    if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;
    if (Build.VERSION.SDK_INT >= 23 && context.checkSelfPermission(Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) return;
    SmsMessage[] msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent);
    if (msgs == null || msgs.length == 0) return;
    StringBuilder body=new StringBuilder(); String sender=msgs[0].getOriginatingAddress();
    long ts=msgs[0].getTimestampMillis();
    // ۱.۳.۴۲: تکه‌های پیامک چندبخشی بدون جداکننده به هم وصل می‌شوند (قبلاً «\\n» وسطشان می‌آمد و مثلاً «0727-17:33» می‌شد «0727-1⏎7:33» → ساعت ۰۷:۳۳)
    for(SmsMessage m:msgs) if(m!=null && m.getMessageBody()!=null) body.append(m.getMessageBody());
    String text=body.toString().trim();
    if(!looksLikeBankTransaction(text, sender)) return;
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
      postNotification(context,text,nid,sender);
    }catch(Exception ignored){}
  }

  static String normFa(String s){
    if(s==null) return "";
    String r=s.toLowerCase(java.util.Locale.ROOT);
    r=r.replace('\\u0643','\\u06a9').replace('\\u064a','\\u06cc').replace('\\u0649','\\u06cc')
       .replace('\\u0629','\\u0647').replace('\\u06c0','\\u0647').replace('\\u0623','\\u0627').replace('\\u0625','\\u0627')
       .replace('\\u066c',',').replace('\\u066b','.').replace("\\u200c"," ").replace("\\u0640","");
    StringBuilder b=new StringBuilder(r.length());
    for(int i=0;i<r.length();i++){
      char c=r.charAt(i);
      if(c>='\\u06f0'&&c<='\\u06f9') c=(char)('0'+(c-'\\u06f0'));
      else if(c>='\\u0660'&&c<='\\u0669') c=(char)('0'+(c-'\\u0660'));
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
        || t.matches("(?s).*رمز\\\\s*[:：]?\\\\s*[0-9]{4,8}([^0-9].*)?")) {
      return false;
    }
    // رد تبلیغات اپراتور/غیر بانکی — اما «خرید شارژ» بانکی با مانده/حساب را رد نکن
    boolean looksPromoCharge = (t.contains("شگفت انگیز") || t.contains("شگفت\u200cانگیز")
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
    boolean money = t.matches("(?s).*\\\\d[\\\\d,٬،. ]{2,}.*");
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
    for(int i=0;i<sender.length();i++){ char ch=sender.charAt(i); if(ch>='0'&&ch<='9') b.append(ch); else if(ch>='\\u06f0'&&ch<='\\u06f9') b.append((char)('0'+(ch-'\\u06f0'))); }
    String d=b.toString();
    if(d.startsWith("0098")) d=d.substring(4); else if(d.startsWith("98")) d=d.substring(2); else if(d.startsWith("0")) d=d.substring(1);
    return d.length()==10 && d.charAt(0)=='9' && "012349".indexOf(d.charAt(1))>=0;
  }

  static NotificationCompat.Builder baseBuilder(Context c,String title,String text){
    Intent i=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
    NotificationCompat.Builder b=new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle(title).setContentText(text.replace('\\n',' ')).setStyle(new NotificationCompat.BigTextStyle().bigText(text)).setAutoCancel(true).setCategory(NotificationCompat.CATEGORY_MESSAGE).setPriority(NotificationCompat.PRIORITY_HIGH);
    if(i!=null){ i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP); b.setContentIntent(PendingIntent.getActivity(c,1001,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE)); }
    return b;
  }

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
    final boolean clean=isClean(c,text,sender);
    String title=personal?"فرستندهٔ شخصی":"تراکنش بانکی جدید";
    NotificationCompat.Builder b=baseBuilder(c,title,text);
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
      RemoteInput ri=new RemoteInput.Builder(KEY_DESC).setLabel("بابت چی بود؟ (شرح)").build();
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
    try{
      SharedPreferences sp=c.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
      boolean inc=text.contains("واریز")||text.contains("+");
      JSONArray cats=new JSONArray(sp.getString(inc?"hk_ncats_in":"hk_ncats_out","[]"));
      if(cats.length()>0){
        RemoteViews rv=new RemoteViews(c.getPackageName(),R.layout.hk_tx);
        rv.setTextViewText(R.id.hk_tx_text,text);
        int[] ids={R.id.hk_c0,R.id.hk_c1,R.id.hk_c2,R.id.hk_c3};
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
    try{ nm.notify(nid,b.build()); }
    catch(Throwable t){ try{ nm.notify(nid,baseBuilder(c,title,text).build()); }catch(Throwable ignored){} }
  }
}
`;

const bankPlugin=`package ${pkg};

import android.Manifest;
import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name="BankSms", permissions={@Permission(strings={Manifest.permission.RECEIVE_SMS},alias="sms"),@Permission(strings={Manifest.permission.READ_SMS},alias="smsread")})
public class BankSmsPlugin extends Plugin {
  private static final String PREFS=BankSmsReceiver.PREFS, QUEUE=BankSmsReceiver.QUEUE;
  @com.getcapacitor.PluginMethod public void requestPermission(PluginCall call){
    if(getPermissionState("sms")==com.getcapacitor.PermissionState.GRANTED){ call.resolve(new JSObject().put("granted",true)); return; }
    requestPermissionForAlias("sms",call,"smsPerm");
  }
  @PermissionCallback private void smsPerm(PluginCall call){ call.resolve(new JSObject().put("granted",getPermissionState("sms")==com.getcapacitor.PermissionState.GRANTED)); }
  @com.getcapacitor.PluginMethod public void getPendingSms(PluginCall call){
    SharedPreferences sp=getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    try{ JSONArray q=new JSONArray(sp.getString(QUEUE,"[]")); if(q.length()==0){call.resolve(new JSObject().put("has",false));return;} JSONObject x=q.getJSONObject(0); JSObject r=new JSObject(); r.put("has",true); r.put("text",x.optString("text")); r.put("sender",x.optString("sender")); r.put("receivedAt",x.optLong("receivedAt")); r.put("nid",x.optInt("nid",0)); r.put("count",q.length()); call.resolve(r); }catch(Exception e){call.reject("pending_sms_error",e);}
  }
  @com.getcapacitor.PluginMethod public void markHandled(PluginCall call){
    SharedPreferences sp=getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    try{
      int nid=call.getInt("nid",0);
      JSONArray q=new JSONArray(sp.getString(QUEUE,"[]")); JSONArray n=new JSONArray();
      boolean removed=false;
      for(int i=0;i<q.length();i++){
        JSONObject x=q.optJSONObject(i);
        boolean hit = nid!=0 ? (x!=null && x.optInt("nid",0)==nid) : (i==0);
        if(hit && !removed){ removed=true; continue; }
        n.put(q.get(i));
      }
      sp.edit().putString(QUEUE,n.toString()).apply(); call.resolve();
    }catch(Exception e){call.reject("pending_sms_error",e);}
  }
  /** ۱.۳.۵۰: دسته‌های پرکاربرد برای دکمه‌های اعلان */
  @com.getcapacitor.PluginMethod public void setNotifCats(PluginCall call){
    SharedPreferences sp=getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    sp.edit().putString("hk_ncats_out",call.getString("out","[]")).putString("hk_ncats_in",call.getString("inc","[]"))
      .putString("hk_nacc4",call.getString("acc4","[]")).putString("hk_nrec",call.getString("rec","[]")).apply();
    call.resolve();
  }
  /** همهٔ پیامک‌های در صف (بدون حذف) — حذف فقط وقتی کاربر آن را ثبت یا رد کرد */
  @com.getcapacitor.PluginMethod public void getAllPending(PluginCall call){
    SharedPreferences sp=getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    try{
      JSONArray q=new JSONArray(sp.getString(QUEUE,"[]"));
      com.getcapacitor.JSArray out=new com.getcapacitor.JSArray();
      for(int i=0;i<q.length();i++){
        JSONObject x=q.optJSONObject(i); if(x==null) continue;
        JSObject r=new JSObject(); r.put("text",x.optString("text")); r.put("sender",x.optString("sender")); r.put("receivedAt",x.optLong("receivedAt")); r.put("nid",x.optInt("nid",0));
        if(x.has("quickDesc")){ r.put("quick",true); r.put("quickDesc",x.optString("quickDesc","")); r.put("quickAt",x.optLong("quickAt",0)); r.put("quickCat",x.optString("quickCat","")); r.put("quickOpen",x.optBoolean("quickOpen",false)); }
        out.put(r);
      }
      call.resolve(new JSObject().put("items",out).put("count",out.length()));
    }catch(Exception e){call.reject("pending_sms_error",e);}
  }
  /** هماهنگی خوانده/نخوانده: وقتی پیامک داخل نرم‌افزار نمایش داده شد، نوتیف همان پیامک (و عدد روی آیکن) حذف شود */
  @com.getcapacitor.PluginMethod public void cancelNotification(PluginCall call){
    try{
      int id=call.getInt("id",0);
      android.app.NotificationManager nm=(android.app.NotificationManager)getContext().getSystemService(Context.NOTIFICATION_SERVICE);
      if(nm!=null && id!=0) nm.cancel(id);
      call.resolve();
    }catch(Exception e){ call.reject("cancel_failed",e); }
  }
  /** همهٔ نوتیف‌های تراکنش بانکی که دیگر در صف نیستند پاک شوند (مثلاً بعد از خواندن همه داخل نرم‌افزار) */
  @com.getcapacitor.PluginMethod public void cancelHandledNotifications(PluginCall call){
    try{
      android.app.NotificationManager nm=(android.app.NotificationManager)getContext().getSystemService(Context.NOTIFICATION_SERVICE);
      SharedPreferences sp=getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
      JSONArray q=new JSONArray(sp.getString(QUEUE,"[]"));
      java.util.HashSet<Integer> keep=new java.util.HashSet<>();
      for(int i=0;i<q.length();i++){ JSONObject x=q.optJSONObject(i); if(x!=null) keep.add(x.optInt("nid",0)); }
      if(nm!=null && android.os.Build.VERSION.SDK_INT>=23){
        for(android.service.notification.StatusBarNotification sbn: nm.getActiveNotifications()){
          if(sbn.getNotification()!=null && BankSmsReceiver.CHANNEL.equals(android.os.Build.VERSION.SDK_INT>=26?sbn.getNotification().getChannelId():BankSmsReceiver.CHANNEL) && !keep.contains(sbn.getId())) nm.cancel(sbn.getId());
        }
      }
      call.resolve();
    }catch(Exception e){ call.reject("cancel_failed",e); }
  }
  /** وضعیت دسترسی‌ها برای کلیدهای منوی همبرگری */
  @com.getcapacitor.PluginMethod public void permStatus(PluginCall call){
    JSObject r=new JSObject();
    try{
      boolean sms = android.os.Build.VERSION.SDK_INT<23 || getContext().checkSelfPermission(Manifest.permission.RECEIVE_SMS)==android.content.pm.PackageManager.PERMISSION_GRANTED;
      boolean notif = androidx.core.app.NotificationManagerCompat.from(getContext()).areNotificationsEnabled();
      if(android.os.Build.VERSION.SDK_INT>=33) notif = notif && getContext().checkSelfPermission("android.permission.POST_NOTIFICATIONS")==android.content.pm.PackageManager.PERMISSION_GRANTED;
      r.put("sms",sms); r.put("notif",notif);
    }catch(Exception e){ r.put("sms",false); r.put("notif",false); }
    call.resolve(r);
  }
  /** درخواست دوبارهٔ دسترسی اعلان (اندروید ۱۳+) */
  @com.getcapacitor.PluginMethod public void requestNotif(PluginCall call){
    try{
      if(android.os.Build.VERSION.SDK_INT>=33 && getActivity()!=null) getActivity().requestPermissions(new String[]{"android.permission.POST_NOTIFICATIONS"},4202);
      call.resolve();
    }catch(Exception e){ call.resolve(); }
  }
  /** باز کردن صفحهٔ مربوط در تنظیمات گوشی (اعلان‌ها یا مجوزهای برنامه؛ ردیف «مجوزها» در برخی گوشی‌ها برجسته می‌شود) */
  @com.getcapacitor.PluginMethod public void openPermSettings(PluginCall call){
    String which=call.getString("which","sms");
    try{
      android.content.Intent i;
      if("notif".equals(which) && android.os.Build.VERSION.SDK_INT>=26){
        i=new android.content.Intent(android.provider.Settings.ACTION_APP_NOTIFICATION_SETTINGS);
        i.putExtra(android.provider.Settings.EXTRA_APP_PACKAGE,getContext().getPackageName());
      } else {
        i=new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        i.setData(android.net.Uri.fromParts("package",getContext().getPackageName(),null));
        android.os.Bundle b=new android.os.Bundle(); b.putString(":settings:fragment_args_key","permission_settings");
        i.putExtra(":settings:fragment_args_key","permission_settings");
        i.putExtra(":settings:show_fragment_args",b);
      }
      i.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(i);
      call.resolve();
    }catch(Exception e){
      try{
        android.content.Intent j=new android.content.Intent(android.provider.Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
        j.setData(android.net.Uri.fromParts("package",getContext().getPackageName(),null));
        j.addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(j);
        call.resolve();
      }catch(Exception e2){ call.reject("unavailable"); }
    }
  }
  /** ثبت گروهی: خواندن پیامک‌های تراکنش بانکی از صندوق ورودی (فقط پیامک‌هایی که شکل تراکنش بانکی دارند) */
  @com.getcapacitor.PluginMethod public void readInbox(PluginCall call){
    if(getPermissionState("smsread")!=com.getcapacitor.PermissionState.GRANTED){ requestPermissionForAlias("smsread",call,"readPerm"); return; }
    doReadInbox(call);
  }
  @PermissionCallback private void readPerm(PluginCall call){
    if(getPermissionState("smsread")==com.getcapacitor.PermissionState.GRANTED) doReadInbox(call);
    else call.reject("permission_denied");
  }
  private void doReadInbox(final PluginCall call){
    final long from=call.getLong("from",0L), to=call.getLong("to",Long.MAX_VALUE);
    final int limit=call.getInt("limit",4000);
    new Thread(new Runnable(){ @Override public void run(){
      android.database.Cursor c=null;
      try{
        com.getcapacitor.JSArray out=new com.getcapacitor.JSArray();
        c=getContext().getContentResolver().query(android.provider.Telephony.Sms.Inbox.CONTENT_URI,
          new String[]{"address","body","date"}, "date>=? AND date<=?", new String[]{String.valueOf(from),String.valueOf(to)}, "date DESC");
        int n=0, scanned=0;
        if(c!=null){
          int iA=c.getColumnIndex("address"), iB=c.getColumnIndex("body"), iD=c.getColumnIndex("date");
          while(c.moveToNext() && n<limit && scanned<60000){
            scanned++;
            String body=c.getString(iB), addr=c.getString(iA); long d=c.getLong(iD);
            if(body==null) continue;
            if(!BankSmsReceiver.looksLikeBankTransaction(body, addr)) continue;
            JSObject o=new JSObject(); o.put("address",addr==null?"":addr); o.put("body",body); o.put("date",d);
            out.put(o); n++;
          }
        }
        call.resolve(new JSObject().put("items",out).put("count",out.length()));
      }catch(Exception e){ call.reject("read_failed",e); }
      finally{ try{ if(c!=null) c.close(); }catch(Exception ignored){} }
    }}).start();
  }
  @com.getcapacitor.PluginMethod public void clearPending(PluginCall call){ getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().remove(QUEUE).apply(); call.resolve(); }
}
`;

/* ۱.۳.۴۳: پاسخ مستقیم از اعلان تراکنش. متن «بابت چه بود؟» کنار همان پیامک در صف ذخیره می‌شود (quickDesc)؛
   نرم‌افزار (اگر باز است در چند ثانیه، وگرنه در باز شدن بعدی) ردیف را بی‌سؤال می‌سازد یا اگر تکمیل لازم است منوی ثبت را با همین شرح باز می‌کند. */
const quickReply=`package ${pkg};

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.Bundle;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Typeface;
import android.text.SpannableString;
import android.text.Spanned;
import android.text.style.ForegroundColorSpan;
import android.text.style.StyleSpan;
import android.widget.RemoteViews;
import androidx.core.app.NotificationCompat;
import androidx.core.app.RemoteInput;
import org.json.JSONArray;
import org.json.JSONObject;

public class HkQuickReplyReceiver extends BroadcastReceiver {
  @Override public void onReceive(Context c, Intent in){
    if(in==null || in.getAction()==null) return;
    /* ۱.۳.۵۱: دکمهٔ دستهٔ اعلانِ بی‌مشکل: ثبت همان‌جا (شرح = اسم دسته) */
    if(in.getAction().startsWith(BankSmsReceiver.ACTION_CAT)){
      int cn=in.getIntExtra("nid",0); if(cn==0) return;
      String lab=in.getStringExtra("label"); if(lab==null) lab="";
      String cat=in.getStringExtra("cat"); if(cat==null) cat="";
      boolean ok=saveDesc(c,cn,lab);
      if(ok){ try{ SharedPreferences sp=c.getSharedPreferences(BankSmsReceiver.PREFS,Context.MODE_PRIVATE); JSONArray q=new JSONArray(sp.getString(BankSmsReceiver.QUEUE,"[]")); for(int i=0;i<q.length();i++){ JSONObject x=q.optJSONObject(i); if(x!=null&&x.optInt("nid",0)==cn){ x.put("quickCat",cat); break; } } sp.edit().putString(BankSmsReceiver.QUEUE,q.toString()).commit(); }catch(Exception ignored){} }
      notifyDone(c,cn,lab,ok);
      return;
    }
    if(!BankSmsReceiver.ACTION_QUICK.equals(in.getAction())) return;
    Bundle res=RemoteInput.getResultsFromIntent(in); if(res==null) return;
    CharSequence cs=res.getCharSequence(BankSmsReceiver.KEY_DESC);
    String desc=cs==null?"":cs.toString().trim(); if(desc.length()>200) desc=desc.substring(0,200);
    int nid=in.getIntExtra("nid",0); if(nid==0) return;
    boolean found=saveDesc(c,nid,desc);
    notifyDone(c,nid,desc,found);
  }
  /** شرح را کنار همان پیامک در صف می‌گذارد (نرم‌افزار ردیف را می‌سازد) */
  static boolean saveDesc(Context c,int nid,String desc){
    boolean found=false;
    try{
      SharedPreferences sp=c.getSharedPreferences(BankSmsReceiver.PREFS,Context.MODE_PRIVATE);
      JSONArray q=new JSONArray(sp.getString(BankSmsReceiver.QUEUE,"[]"));
      for(int i=0;i<q.length();i++){ JSONObject x=q.optJSONObject(i); if(x!=null && x.optInt("nid",0)==nid){ x.put("quickDesc",desc); x.put("quickAt",System.currentTimeMillis()); found=true; break; } }
      if(found) sp.edit().putString(BankSmsReceiver.QUEUE,q.toString()).commit();
    }catch(Exception ignored){}
    return found;
  }
  static JSONObject findItem(Context c,int nid){
    try{
      SharedPreferences sp=c.getSharedPreferences(BankSmsReceiver.PREFS,Context.MODE_PRIVATE);
      JSONArray q=new JSONArray(sp.getString(BankSmsReceiver.QUEUE,"[]"));
      for(int i=0;i<q.length();i++){ JSONObject x=q.optJSONObject(i); if(x!=null && x.optInt("nid",0)==nid) return x; }
    }catch(Exception ignored){}
    return null;
  }
  /** ۱.۳.۴۵: همان تیک داخل نرم‌افزار (مسیر M5 13 l4 4 L19 7، خط گرد)، سبز و بی‌دایره */
  static Bitmap tick(int size){
    Bitmap bm=Bitmap.createBitmap(size,size,Bitmap.Config.ARGB_8888);
    Canvas cv=new Canvas(bm);
    float u=size/24f;
    Paint w=new Paint(Paint.ANTI_ALIAS_FLAG); w.setColor(0xFF30D158); w.setStyle(Paint.Style.STROKE); w.setStrokeWidth(3f*u); w.setStrokeCap(Paint.Cap.ROUND); w.setStrokeJoin(Paint.Join.ROUND);
    Path ph=new Path(); ph.moveTo(5*u,13*u); ph.lineTo(9*u,17*u); ph.lineTo(19*u,7*u);
    cv.drawPath(ph,w);
    return bm;
  }
  /** پیام بعد از ثبت: بالا «بابت: …»، پایین «ثبت شد» سبز با تیک */
  static void notifyDone(Context c,int nid,String desc,boolean found){
    try{
      NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
      Intent oi=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
      PendingIntent pi=null;
      if(oi!=null){ oi.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP); pi=PendingIntent.getActivity(c,1001,oi,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE); }
      CharSequence line;
      if(found){
        SpannableString ss=new SpannableString("ثبت شد ✔");
        ss.setSpan(new ForegroundColorSpan(0xFF30D158),0,ss.length(),Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        ss.setSpan(new StyleSpan(Typeface.BOLD),0,ss.length(),Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        line=ss;
      } else line="این تراکنش قبلاً ثبت یا رد شده";
      NotificationCompat.Builder b=new NotificationCompat.Builder(c,BankSmsReceiver.CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info)
        .setContentTitle(found?(desc.isEmpty()?"بدون شرح":"بابت: "+desc):"حساب‌کتاب")
        .setContentText(line)
        .setOnlyAlertOnce(true).setAutoCancel(true).setPriority(NotificationCompat.PRIORITY_LOW);
      /* ۱.۳.۴۵: چیدمان اختصاصی: «بابت: …» هم‌اندازهٔ نام نرم‌افزار، زیرش «ثبت شد» درشت و بولد با تیک نرم‌افزار */
      if(found){
        try{
          RemoteViews rv=new RemoteViews(c.getPackageName(),R.layout.hk_done);
          rv.setTextViewText(R.id.hk_done_desc,desc.isEmpty()?"بدون شرح":"بابت: "+desc);
          rv.setImageViewBitmap(R.id.hk_done_tick,tick(72));
          b.setStyle(new NotificationCompat.DecoratedCustomViewStyle()).setCustomContentView(rv);
        }catch(Throwable ignored){}
      }
      if(pi!=null) b.setContentIntent(pi);
      if(Build.VERSION.SDK_INT>=26) b.setTimeoutAfter(8000);
      nm.notify(nid,b.build());
    }catch(Throwable ignored){}
  }
}
`;

/* ۱.۳.۵۰: دکمهٔ دسته / ثبت سریع اعلان: شرح و دسته را کنار پیامک در صف می‌گذارد، اعلان را برمی‌دارد و نرم‌افزار را باز می‌کند.
   نرم‌افزار ثبت می‌کند و اگر همه‌چیز درست بود خودش را کوچک می‌کند؛ اگر مغایرت یا حساب ناموجود بود باز می‌ماند تا کاربر تکمیل کند. */
const catActivity=`package ${pkg};

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import androidx.core.app.RemoteInput;
import org.json.JSONArray;
import org.json.JSONObject;

public class HkCatActivity extends Activity {
  @Override protected void onCreate(Bundle s){
    super.onCreate(s);
    try{
      Intent in=getIntent();
      int nid=in.getIntExtra("nid",0);
      String cat=in.getStringExtra("cat"); if(cat==null) cat="";
      String desc=in.getStringExtra("label");
      Bundle res=RemoteInput.getResultsFromIntent(in);
      if(res!=null){ CharSequence cs=res.getCharSequence(BankSmsReceiver.KEY_DESC); desc=cs==null?"":cs.toString().trim(); }
      if(desc==null) desc=""; if(desc.length()>200) desc=desc.substring(0,200);
      if(nid!=0){
        SharedPreferences sp=getSharedPreferences(BankSmsReceiver.PREFS,Context.MODE_PRIVATE);
        JSONArray q=new JSONArray(sp.getString(BankSmsReceiver.QUEUE,"[]"));
        for(int i=0;i<q.length();i++){ JSONObject x=q.optJSONObject(i); if(x!=null && x.optInt("nid",0)==nid){ x.put("quickDesc",desc); x.put("quickCat",cat); x.put("quickOpen",true); x.put("quickAt",System.currentTimeMillis()); break; } }
        sp.edit().putString(BankSmsReceiver.QUEUE,q.toString()).commit();
        ((NotificationManager)getSystemService(Context.NOTIFICATION_SERVICE)).cancel(nid);
      }
      Intent oi=getPackageManager().getLaunchIntentForPackage(getPackageName());
      if(oi!=null){ oi.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP); startActivity(oi); }
    }catch(Throwable ignored){}
    finish();
  }
}
`;

/* ۱.۳.۴۴: باکس شناور ثبت (حباب کنار اعلان، مثل پیامک‌ها): متن پیامک، فیلد «بابت چی بود؟» با قلم درشت و دکمهٔ «ثبت»؛
   شرح مثل «ثبت سریع» کنار همان پیامک در صف می‌رود و نرم‌افزار ردیف را می‌سازد (یا اگر تکمیل لازم است منوی ثبت را با همین شرح باز می‌کند). */
const quickActivity=`package ${pkg};

import android.app.Activity;
import android.content.Intent;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import org.json.JSONObject;

public class HkQuickActivity extends Activity {
  private int nid;
  private LinearLayout box;
  private int dp(float v){ return (int)TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP,v,getResources().getDisplayMetrics()); }
  private GradientDrawable round(int color,float r){ GradientDrawable g=new GradientDrawable(); g.setColor(color); g.setCornerRadius(dp(r)); return g; }
  /** ۱.۳.۴۵: همهٔ نوشته‌ها راست‌چین */
  private void rtl(TextView v){ v.setGravity(Gravity.RIGHT); v.setTextDirection(View.TEXT_DIRECTION_RTL); v.setTextAlignment(View.TEXT_ALIGNMENT_GRAVITY); }
  private LinearLayout.LayoutParams full(){ return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT); }

  @Override protected void onCreate(Bundle b){
    super.onCreate(b);
    getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE|WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    /* ۱.۳.۴۶: پنجرهٔ شناور بالای صفحه (کیبورد پایین باز می‌شود و روی «ثبت» نمی‌آید) */
    try{
      getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(0x00000000));
      getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT);
      WindowManager.LayoutParams wl=getWindow().getAttributes(); wl.gravity=Gravity.TOP; wl.y=dp(56); wl.dimAmount=0.45f; getWindow().setAttributes(wl);
      getWindow().addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
    }catch(Exception ignored){}
    nid=getIntent()!=null?getIntent().getIntExtra("nid",0):0;
    JSONObject it=nid!=0?HkQuickReplyReceiver.findItem(this,nid):null;
    ScrollView sv=new ScrollView(this);
    box=new LinearLayout(this);
    box.setOrientation(LinearLayout.VERTICAL);
    box.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
    box.setPadding(dp(18),dp(18),dp(18),dp(18));
    box.setBackground(round(0xFF1C1C1E,22));
    LinearLayout.LayoutParams outer=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT);
    sv.setPadding(dp(10),dp(10),dp(10),dp(10));
    sv.addView(box,outer);
    setContentView(sv);
    if(it==null){ showGone(); return; }
    String text=it.optString("text",""), sender=it.optString("sender","");
    boolean personal=BankSmsReceiver.isPersonal(sender);
    TextView t=new TextView(this);
    t.setText(personal?("⚠️ پیامک شخصی \\u2066"+sender.replace(" ","")+"\\u2069"):"تراکنش بانکی جدید");
    t.setTextColor(personal?0xFFFF9F0A:0xFFFFFFFF); t.setTextSize(17); t.setTypeface(Typeface.DEFAULT_BOLD); rtl(t);
    box.addView(t,full());
    if(personal){
      TextView w=new TextView(this);
      w.setText("از سرشمارهٔ بانک نیامده؛ اگر مطمئنید ثبت کنید");
      w.setTextColor(0xFFFFB340); w.setTextSize(13); w.setPadding(0,dp(4),0,0); rtl(w);
      box.addView(w,full());
    }
    TextView sms=new TextView(this);
    sms.setText(text); sms.setTextColor(0xFFD1D1D6); sms.setTextSize(14); sms.setLineSpacing(0,1.15f);
    sms.setPadding(dp(14),dp(10),dp(14),dp(10)); rtl(sms);
    /* متن پیامک آخرِ باکس و در قاب کوتاهِ قابل اسکرول */
    ScrollView smsSv=new ScrollView(this); smsSv.setBackground(round(0xFF2C2C2E,14)); smsSv.addView(sms);
    final EditText et=new EditText(this);
    et.setHint("بابت چی بود؟ (شرح)"); et.setHintTextColor(0xFF8E8E93); et.setTextColor(0xFFFFFFFF); et.setTextSize(19);
    et.setSingleLine(true); et.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES); et.setImeOptions(EditorInfo.IME_ACTION_DONE);
    et.setBackground(round(0xFF2C2C2E,14)); et.setPadding(dp(14),dp(12),dp(14),dp(12)); et.setGravity(Gravity.RIGHT|Gravity.CENTER_VERTICAL); et.setTextDirection(View.TEXT_DIRECTION_RTL); et.setTextAlignment(View.TEXT_ALIGNMENT_GRAVITY);
    /* ۱.۳.۴۵: نشانگر تایپ سفید (قبلاً مشکی و نامعلوم بود) */
    if(android.os.Build.VERSION.SDK_INT>=29){ GradientDrawable cur=new GradientDrawable(); cur.setColor(0xFFFFFFFF); cur.setSize(dp(2),dp(22)); et.setTextCursorDrawable(cur); }
    LinearLayout.LayoutParams lp2=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,dp(54)); lp2.topMargin=dp(12);
    box.addView(et,lp2);
    LinearLayout row=new LinearLayout(this); row.setOrientation(LinearLayout.HORIZONTAL); row.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
    /* ۱.۳.۴۵: دو دکمهٔ هم‌اندازه با قلم هم‌سایز؛ «ثبت» سبز مات مبالغ درآمد نرم‌افزار */
    Button ok=new Button(this); ok.setText("ثبت"); ok.setAllCaps(false); ok.setTextColor(0xFF10200A); ok.setTextSize(15); ok.setTypeface(Typeface.DEFAULT_BOLD); ok.setBackground(round(0xD99EE858,14));
    Button open=new Button(this); open.setText("باز کردن نرم‌افزار"); open.setAllCaps(false); open.setTextColor(0xFFFFFFFF); open.setTextSize(15); open.setTypeface(Typeface.DEFAULT_BOLD); open.setBackground(round(0xFF3A3A3C,14));
    LinearLayout.LayoutParams bl=new LinearLayout.LayoutParams(0,dp(50),1f); LinearLayout.LayoutParams bl2=new LinearLayout.LayoutParams(0,dp(50),1f); bl2.setMarginStart(dp(10));
    row.addView(ok,bl); row.addView(open,bl2);
    LinearLayout.LayoutParams lp3=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT); lp3.topMargin=dp(12);
    box.addView(row,lp3);
    LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,Math.min(dp(150),ViewGroup.LayoutParams.WRAP_CONTENT)); lp.topMargin=dp(12);
    smsSv.setLayoutParams(lp);
    box.addView(smsSv);
    smsSv.post(()->{ try{ if(smsSv.getHeight()>dp(150)){ ViewGroup.LayoutParams q=smsSv.getLayoutParams(); q.height=dp(150); smsSv.setLayoutParams(q);} }catch(Exception ignored){} });
    ok.setOnClickListener(v->submit(et.getText().toString()));
    et.setOnEditorActionListener((v,a,e)->{ if(a==EditorInfo.IME_ACTION_DONE){ submit(et.getText().toString()); return true; } return false; });
    open.setOnClickListener(v->{ try{ Intent li=getPackageManager().getLaunchIntentForPackage(getPackageName()); if(li!=null){ li.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP); startActivity(li); } }catch(Exception ignored){} finish(); });
    et.requestFocus();
  }

  private void submit(String raw){
    String desc=raw==null?"":raw.trim(); if(desc.length()>200) desc=desc.substring(0,200);
    boolean found=HkQuickReplyReceiver.saveDesc(this,nid,desc);
    HkQuickReplyReceiver.notifyDone(this,nid,desc,found);
    try{ ((android.view.inputmethod.InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(box.getWindowToken(),0); }catch(Exception ignored){}
    if(!found){ showGone(); return; }
    box.removeAllViews();
    box.setGravity(Gravity.CENTER_HORIZONTAL);
    ImageView iv=new ImageView(this); iv.setImageBitmap(HkQuickReplyReceiver.tick(dp(56)));
    box.addView(iv,new LinearLayout.LayoutParams(dp(56),dp(56)));
    TextView d=new TextView(this); d.setText(desc.isEmpty()?"بدون شرح":"بابت: "+desc); d.setTextColor(0xFFFFFFFF); d.setTextSize(16); d.setGravity(Gravity.CENTER); d.setPadding(0,dp(12),0,0);
    box.addView(d);
    TextView ok=new TextView(this); ok.setText("ثبت شد"); ok.setTextColor(0xFF30D158); ok.setTextSize(18); ok.setTypeface(Typeface.DEFAULT_BOLD); ok.setGravity(Gravity.CENTER); ok.setPadding(0,dp(6),0,0);
    box.addView(ok);
    box.postDelayed(this::finish,1300);
  }

  private void showGone(){
    box.removeAllViews();
    TextView t=new TextView(this); t.setText("این تراکنش قبلاً ثبت یا رد شده"); t.setTextColor(0xFFFFFFFF); t.setTextSize(16); t.setGravity(Gravity.CENTER);
    box.addView(t);
    box.postDelayed(this::finish,1600);
  }
}
`;

const nativeExport=`package ${pkg};

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.pdf.PdfDocument;
import android.widget.FrameLayout;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;

@CapacitorPlugin(name="NativeFileExport")
public class NativeFileExportPlugin extends Plugin {
  /* فایلی که با «باز کردن با…» یا «اشتراک‌گذاری» به نرم‌افزار داده شده (مثلاً پشتیبان در Downloads) */
  private static String openedName=null; private static byte[] openedData=null;
  public static boolean captureOpened(android.app.Activity act, Intent intent){
    try{
      if(intent==null) return false;
      String a=intent.getAction(); Uri u=null;
      /* عکس و PDF اشتراکی = پیوست (HkMedia.captureShared)، نه فایل پشتیبان */
      String ty=intent.getType(); if(Intent.ACTION_SEND.equals(a) && ty!=null && (ty.startsWith("image/") || ty.equals("application/pdf"))) return false;
      if(Intent.ACTION_VIEW.equals(a)) u=intent.getData();
      else if(Intent.ACTION_SEND.equals(a)){ Object x=intent.getParcelableExtra(Intent.EXTRA_STREAM); if(x instanceof Uri) u=(Uri)x; }
      if(u==null) return false;
      ContentResolver cr=act.getContentResolver();
      String name="backup.json";
      android.database.Cursor c=null;
      try{ c=cr.query(u,new String[]{android.provider.OpenableColumns.DISPLAY_NAME},null,null,null); if(c!=null && c.moveToFirst() && c.getString(0)!=null) name=c.getString(0); }catch(Exception ignored){} finally{ if(c!=null) c.close(); }
      try(java.io.InputStream in=cr.openInputStream(u)){
        if(in==null) return false;
        ByteArrayOutputStream bo=new ByteArrayOutputStream(); byte[] buf=new byte[65536]; int r; long t=0;
        while((r=in.read(buf))>0){ t+=r; if(t>64L*1024*1024) return false; bo.write(buf,0,r); }
        openedName=name; openedData=bo.toByteArray();
      }
      intent.setAction(Intent.ACTION_MAIN); intent.setData(null);
      return true;
    }catch(Exception e){ return false; }
  }
  @com.getcapacitor.PluginMethod public void takeOpenedFile(PluginCall call){
    JSObject r=new JSObject();
    if(openedData!=null){ r.put("name",openedName); r.put("data",Base64.encodeToString(openedData,Base64.NO_WRAP)); }
    openedName=null; openedData=null;
    call.resolve(r);
  }

  private String uniqueDownloadName(String filename) {
    if(filename==null || filename.trim().isEmpty()) filename="download.bin";
    ContentResolver cr=getContext().getContentResolver();
    String base=filename;
    String ext="";
    int dot=filename.lastIndexOf('.');
    if(dot>0){ base=filename.substring(0,dot); ext=filename.substring(dot); }
    boolean isHesabBackup = base.startsWith("hesab-backup-");
    String restAfterPrefix = isHesabBackup ? base.substring("hesab-backup-".length()) : null;
    for(int n=0;n<10000;n++){
      String candidate;
      if(n==0) candidate = filename;
      else if(isHesabBackup) candidate = "hesab-backup-" + n + "-" + restAfterPrefix + ext;
      else candidate = base + "-" + n + ext;
      android.database.Cursor c=null;
      try{
        c=cr.query(MediaStore.Downloads.EXTERNAL_CONTENT_URI,
          new String[]{MediaStore.Downloads.DISPLAY_NAME},
          MediaStore.Downloads.DISPLAY_NAME+"=?",new String[]{candidate},null);
        if(c==null || !c.moveToFirst()) return candidate;
      }finally{ if(c!=null) c.close(); }
    }
    return filename;
  }

  private Uri insertPending(String filename,String mimeType) throws Exception {
    ContentResolver cr=getContext().getContentResolver();
    filename=uniqueDownloadName(filename);
    ContentValues v=new ContentValues();
    v.put(MediaStore.Downloads.DISPLAY_NAME,filename);
    v.put(MediaStore.Downloads.MIME_TYPE,mimeType==null?"application/octet-stream":mimeType);
    if(Build.VERSION.SDK_INT>=29) v.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS);
    if(Build.VERSION.SDK_INT>=29) v.put(MediaStore.Downloads.IS_PENDING,1);
    Uri u=cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);
    if(u==null) throw new Exception("Downloads insert failed");
    return u;
  }

  private void finishPending(Uri u) {
    if(Build.VERSION.SDK_INT>=29){
      ContentValues v=new ContentValues();
      v.put(MediaStore.Downloads.IS_PENDING,0);
      getContext().getContentResolver().update(u,v,null,null);
    }
  }

  private byte[] decodeBase64(String data) throws Exception {
    if(data==null||data.isEmpty()) throw new Exception("empty data");
    int comma=data.indexOf(',');
    if(data.startsWith("data:") && comma>0) data=data.substring(comma+1);
    return Base64.decode(data, Base64.DEFAULT);
  }

  private File writeCacheFile(String filename, byte[] bytes) throws Exception {
    File dir=new File(getContext().getCacheDir(), "share");
    if(!dir.exists() && !dir.mkdirs()) throw new Exception("cache dir failed");
    String safe=(filename==null?"file.bin":filename).replaceAll("[\\\\/]+","_");
    File out=new File(dir, safe);
    try(FileOutputStream fos=new FileOutputStream(out)){
      fos.write(bytes);
      fos.flush();
    }
    return out;
  }

  private Uri saveToDownloads(String filename, String mimeType, byte[] bytes) throws Exception {
    Uri u=insertPending(filename, mimeType);
    try(OutputStream out=getContext().getContentResolver().openOutputStream(u)){
      if(out==null) throw new Exception("open output failed");
      out.write(bytes);
      out.flush();
    }
    finishPending(u);
    return u;
  }

  @com.getcapacitor.PluginMethod public void saveBase64ToDownloads(PluginCall call){
    try{
      String filename=call.getString("filename","download.bin");
      String mime=call.getString("mimeType","application/octet-stream");
      String data=call.getString("data","");
      byte[] bytes=decodeBase64(data);
      Uri u=saveToDownloads(filename, mime, bytes);
      call.resolve(new JSObject().put("uri",u.toString()).put("filename",filename).put("ok",true));
    }catch(Exception e){ call.reject("save_download_failed",e); }
  }

  /* ===== پشتیبان خودکار: پوشهٔ Downloads/HesabKetab (اندروید ۱۰ به بالا؛ بعد از حذف نرم‌افزار هم می‌ماند) ===== */
  private static final String AUTO_DIR="HesabKetab";
  private String autoRel(){ return Environment.DIRECTORY_DOWNLOADS+"/"+AUTO_DIR+"/"; }
  private boolean autoSafeName(String n){ return n!=null && n.matches("hesab-(auto|safety|latest)-[0-9A-Za-z._-]{1,80}[.]json"); }
  /* حافظهٔ داخلی خود نرم‌افزار (در فایل‌منیجر دیده نمی‌شود): پشتیبان‌های روزانه و ایمنی؛ در Downloads فقط «آخرین پشتیبان» */
  private boolean isInternal(PluginCall c){ return "internal".equals(c.getString("store","")); }
  private File internalDir(){ File d=new File(getContext().getFilesDir(),"backups"); if(!d.exists()) d.mkdirs(); return d; }
  private byte[] readFileBytes(File f) throws Exception {
    if(f.length()>64L*1024*1024) throw new Exception("too_large");
    try(java.io.FileInputStream in=new java.io.FileInputStream(f)){
      ByteArrayOutputStream bo=new ByteArrayOutputStream(); byte[] buf=new byte[65536]; int r;
      while((r=in.read(buf))>0) bo.write(buf,0,r);
      return bo.toByteArray();
    }
  }
  private void saveInternal(PluginCall call, String name, byte[] bytes) throws Exception {
    File dir=internalDir(), f=new File(dir,name), tmp=new File(dir,name+".tmp");
    if(f.exists()){ call.reject("name_exists"); return; }
    try(FileOutputStream out=new FileOutputStream(tmp)){ out.write(bytes); out.flush(); try{ out.getFD().sync(); }catch(Exception ignored){} }
    byte[] back=readFileBytes(tmp);
    if(!java.util.Arrays.equals(back,bytes)){ tmp.delete(); throw new Exception("verify_failed"); }
    if(!tmp.renameTo(f)){ tmp.delete(); throw new Exception("finish_failed"); }
    call.resolve(new JSObject().put("ok",true).put("verified",true).put("filename",name).put("folder","internal"));
  }

  @com.getcapacitor.PluginMethod public void saveAutoBackup(PluginCall call){
    if(Build.VERSION.SDK_INT<29){ call.reject("unsupported"); return; }
    try{
      String name=call.getString("filename","");
      if(!autoSafeName(name)){ call.reject("bad_name"); return; }
      byte[] bytes=decodeBase64(call.getString("data",""));
      if(isInternal(call)){ saveInternal(call,name,bytes); return; }
      ContentResolver cr=getContext().getContentResolver();
      /* نوشتن امن بدون هیچ حذفی: هر پشتیبان نام یکتای خودش را دارد (برنامه زمان را در نام می‌گذارد)، پس فایل تازه
         هرگز جای فایل قبلی را نمی‌گیرد. ترتیب: درج با نام نهایی در حالت pending (نامرئی) ← نوشتن ← خواندن دوباره و
         مقایسهٔ بایت‌به‌بایت ← تمام‌کردن pending ← اطمینان از اینکه با همان نام و شناسه به‌عنوان فایل تمام‌شده پیدا می‌شود.
         هر شکستی فقط همین آیتم تازهٔ ناتمام را برمی‌دارد؛ فایل‌های قبلی هرگز اینجا حذف نمی‌شوند (پاک‌کردن نسخه‌های قدیمی
         فقط با هرس سمت برنامه و فقط پس از تأیید همین فایل انجام می‌شود). */
      if(findCompletedAuto(cr,name)!=null){ call.reject("name_exists"); return; }
      ContentValues v=new ContentValues();
      v.put(MediaStore.Downloads.DISPLAY_NAME,name);
      v.put(MediaStore.Downloads.MIME_TYPE,"application/json");
      v.put(MediaStore.Downloads.RELATIVE_PATH,autoRel());
      v.put(MediaStore.Downloads.IS_PENDING,1);
      Uri u=cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);
      if(u==null){ call.reject("insert_failed"); return; }
      try{
        /* اگر سیستم نام را عوض کرده باشد (مثلاً «(1)»)، این فایل پذیرفته نمی‌شود */
        if(!name.equals(queryDisplayName(cr,u))) throw new Exception("name_conflict");
        try(OutputStream out=cr.openOutputStream(u)){
          if(out==null) throw new Exception("open output failed");
          out.write(bytes); out.flush();
        }
        byte[] back=readAllBytes(cr,u);
        if(back==null || !java.util.Arrays.equals(back,bytes)) throw new Exception("verify_failed");
        ContentValues done=new ContentValues();
        done.put(MediaStore.Downloads.IS_PENDING,0);
        if(cr.update(u,done,null,null)<1) throw new Exception("finish_failed");
        Long found=findCompletedAuto(cr,name);
        if(found==null || found.longValue()!=android.content.ContentUris.parseId(u)) throw new Exception("not_discoverable");
      }catch(Exception we){ try{ cr.delete(u,null,null); }catch(Exception ignored){} throw we; }
      call.resolve(new JSObject().put("ok",true).put("verified",true).put("uri",u.toString()).put("filename",name).put("folder","Download/"+AUTO_DIR));
    }catch(Exception e){ call.reject("auto_backup_failed",e); }
  }

  @com.getcapacitor.PluginMethod public void listAutoBackups(PluginCall call){
    if(isInternal(call)){
      try{
        com.getcapacitor.JSArray arr=new com.getcapacitor.JSArray();
        File[] fs=internalDir().listFiles();
        if(fs!=null) for(File f: fs){ if(f.isFile() && autoSafeName(f.getName())) arr.put(new JSObject().put("name",f.getName()).put("size",f.length()).put("modified",f.lastModified()/1000)); }
        call.resolve(new JSObject().put("files",arr));
      }catch(Exception e){ call.reject("list_failed",e); }
      return;
    }
    if(Build.VERSION.SDK_INT<29){ call.reject("unsupported"); return; }
    android.database.Cursor c=null;
    try{
      com.getcapacitor.JSArray arr=new com.getcapacitor.JSArray();
      c=getContext().getContentResolver().query(MediaStore.Downloads.EXTERNAL_CONTENT_URI,
        new String[]{MediaStore.Downloads.DISPLAY_NAME, MediaStore.Downloads.SIZE, MediaStore.Downloads.DATE_MODIFIED},
        MediaStore.Downloads.RELATIVE_PATH+"=? AND "+MediaStore.Downloads.IS_PENDING+"=0", new String[]{autoRel()}, null);
      while(c!=null && c.moveToNext()){
        String n=c.getString(0);
        if(!autoSafeName(n)) continue;
        arr.put(new JSObject().put("name",n).put("size",c.getLong(1)).put("modified",c.getLong(2)));
      }
      call.resolve(new JSObject().put("files",arr));
    }catch(Exception e){ call.reject("list_failed",e); }
    finally{ if(c!=null) c.close(); }
  }

  private byte[] readAllBytes(ContentResolver cr, Uri u) throws Exception {
    try(java.io.InputStream in=cr.openInputStream(u)){
      if(in==null) return null;
      ByteArrayOutputStream bo=new ByteArrayOutputStream();
      byte[] buf=new byte[65536]; int r; long total=0;
      while((r=in.read(buf))>0){ total+=r; if(total>64L*1024*1024) throw new Exception("too_large"); bo.write(buf,0,r); }
      return bo.toByteArray();
    }
  }
  /** شناسهٔ یک پشتیبان خودکار تمام‌شده (نه pending) با همین نام در پوشهٔ HesabKetab، یا null */
  private Long findCompletedAuto(ContentResolver cr, String name){
    android.database.Cursor c=null;
    try{
      c=cr.query(MediaStore.Downloads.EXTERNAL_CONTENT_URI, new String[]{MediaStore.Downloads._ID},
        MediaStore.Downloads.DISPLAY_NAME+"=? AND "+MediaStore.Downloads.RELATIVE_PATH+"=? AND "+MediaStore.Downloads.IS_PENDING+"=0", new String[]{name, autoRel()}, null);
      if(c!=null && c.moveToFirst()) return Long.valueOf(c.getLong(0));
    }catch(Exception ignored){}
    finally{ if(c!=null) c.close(); }
    return null;
  }
  private String queryDisplayName(ContentResolver cr, Uri u){
    android.database.Cursor c=null;
    try{
      c=cr.query(u,new String[]{MediaStore.Downloads.DISPLAY_NAME},null,null,null);
      if(c!=null && c.moveToFirst()) return c.getString(0);
    }catch(Exception ignored){}
    finally{ if(c!=null) c.close(); }
    return null;
  }
  /** خواندن یک پشتیبان خودکار تمام‌شده (فقط پوشهٔ HesabKetab و فقط نام‌های مجاز) — برای تأیید پیش از پاک‌سازی */
  @com.getcapacitor.PluginMethod public void readAutoBackup(PluginCall call){
    if(isInternal(call)){
      try{
        String name=call.getString("name","");
        if(!autoSafeName(name)){ call.reject("bad_name"); return; }
        File f=new File(internalDir(),name);
        if(!f.isFile()){ call.reject("not_found"); return; }
        byte[] bytes=readFileBytes(f);
        call.resolve(new JSObject().put("data",Base64.encodeToString(bytes,Base64.NO_WRAP)).put("size",bytes.length));
      }catch(Exception e){ call.reject("read_failed",e); }
      return;
    }
    if(Build.VERSION.SDK_INT<29){ call.reject("unsupported"); return; }
    android.database.Cursor c=null;
    try{
      String name=call.getString("name","");
      if(!autoSafeName(name)){ call.reject("bad_name"); return; }
      ContentResolver cr=getContext().getContentResolver();
      c=cr.query(MediaStore.Downloads.EXTERNAL_CONTENT_URI, new String[]{MediaStore.Downloads._ID},
        MediaStore.Downloads.DISPLAY_NAME+"=? AND "+MediaStore.Downloads.RELATIVE_PATH+"=? AND "+MediaStore.Downloads.IS_PENDING+"=0", new String[]{name, autoRel()}, null);
      if(c==null || !c.moveToFirst()){ call.reject("not_found"); return; }
      Uri u=android.content.ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, c.getLong(0));
      byte[] bytes=readAllBytes(cr,u);
      if(bytes==null){ call.reject("read_failed"); return; }
      call.resolve(new JSObject().put("data",Base64.encodeToString(bytes,Base64.NO_WRAP)).put("size",bytes.length));
    }catch(Exception e){ call.reject("read_failed",e); }
    finally{ if(c!=null) c.close(); }
  }

  @com.getcapacitor.PluginMethod public void deleteAutoBackup(PluginCall call){
    if(isInternal(call)){
      String name=call.getString("name","");
      if(!autoSafeName(name)){ call.reject("bad_name"); return; }
      File f=new File(internalDir(),name);
      call.resolve(new JSObject().put("deleted", f.isFile() && f.delete() ? 1 : 0));
      return;
    }
    if(Build.VERSION.SDK_INT<29){ call.reject("unsupported"); return; }
    try{
      String name=call.getString("name","");
      if(!autoSafeName(name)){ call.reject("bad_name"); return; }
      int n=getContext().getContentResolver().delete(MediaStore.Downloads.EXTERNAL_CONTENT_URI,
        MediaStore.Downloads.DISPLAY_NAME+"=? AND "+MediaStore.Downloads.RELATIVE_PATH+"=?", new String[]{name, autoRel()});
      call.resolve(new JSObject().put("deleted",n));
    }catch(Exception e){ call.reject("delete_failed",e); }
  }

  /** باز کردن فایل ذخیره‌شده با انتخاب برنامه (فهرست برنامه‌های سازگار، مثلاً نمایشگرهای PDF) */
  @com.getcapacitor.PluginMethod public void openUri(PluginCall call){
    try{
      String uri=call.getString("uri","");
      String mime=call.getString("mimeType","application/pdf");
      String title=call.getString("title","باز کردن با");
      if(uri==null || !uri.startsWith("content://")){ call.reject("bad_uri"); return; }
      Intent view=new Intent(Intent.ACTION_VIEW);
      view.setDataAndType(Uri.parse(uri), mime);
      view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      Intent chooser=Intent.createChooser(view, title);
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_GRANT_READ_URI_PERMISSION);
      getActivity().startActivity(chooser);
      call.resolve(new JSObject().put("ok", true));
    }catch(android.content.ActivityNotFoundException e){ call.reject("no_app",e); }
    catch(Exception e){ call.reject("open_failed",e); }
  }

  @com.getcapacitor.PluginMethod public void shareBase64File(PluginCall call){
    try{
      String filename=call.getString("filename","share.bin");
      String mime=call.getString("mimeType","application/octet-stream");
      String data=call.getString("data","");
      String title=call.getString("title","اشتراک‌گذاری");
      boolean alsoDownload = true;
      try { Boolean b = call.getBoolean("saveToDownloads", true); if(b!=null) alsoDownload=b; } catch(Exception ignored){}
      byte[] bytes=decodeBase64(data);

      Uri downloadUri=null;
      if(alsoDownload){
        try{ downloadUri=saveToDownloads(filename, mime, bytes); }catch(Exception e){ /* continue to share */ }
      }

      File cacheFile=writeCacheFile(filename, bytes);
      String authority=getContext().getPackageName()+".fileprovider";
      Uri contentUri=FileProvider.getUriForFile(getContext(), authority, cacheFile);

      Intent send=new Intent(Intent.ACTION_SEND);
      send.setType(mime==null?"application/octet-stream":mime);
      send.putExtra(Intent.EXTRA_STREAM, contentUri);
      send.putExtra(Intent.EXTRA_SUBJECT, title);
      send.putExtra(Intent.EXTRA_TEXT, title);
      send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

      Intent chooser=Intent.createChooser(send, title);
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getActivity().startActivity(chooser);

      JSObject r=new JSObject();
      r.put("ok", true);
      r.put("shared", true);
      r.put("uri", contentUri.toString());
      if(downloadUri!=null) r.put("downloadUri", downloadUri.toString());
      r.put("filename", filename);
      call.resolve(r);
    }catch(Exception e){ call.reject("share_failed",e); }
  }

  @com.getcapacitor.PluginMethod public void exportHtmlToPdf(final PluginCall call){
    final String html=call.getString("html","");
    final String filename=call.getString("filename","hesab.pdf");
    if(html==null||html.isEmpty()){ call.reject("empty_html"); return; }

    getActivity().runOnUiThread(new Runnable(){
      @Override public void run(){
        final FrameLayout root=(FrameLayout)getActivity().getWindow().getDecorView();
        final FrameLayout host=new FrameLayout(getContext());
        host.setBackgroundColor(android.graphics.Color.WHITE);
        final int viewW = 794; // A4 width at 96dpi CSS px
        FrameLayout.LayoutParams hp=new FrameLayout.LayoutParams(viewW, 1600);
        // پشت محتوای نرم‌افزار (اندیس ۰): همان چیدمان و رندر قبلی، ولی صفحه‌های گزارش روی صفحه دیده نمی‌شوند
        root.addView(host,0,hp);

        final WebView web=new WebView(getContext());
        web.setBackgroundColor(android.graphics.Color.WHITE);
        // SOFTWARE: capture با web.draw قابل‌اعتمادتر از HARDWARE است
        web.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE,null);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDefaultTextEncodingName("UTF-8");
        web.getSettings().setLoadWithOverviewMode(false);
        web.getSettings().setUseWideViewPort(false);
        web.getSettings().setDomStorageEnabled(true);
        // امنیت: این WebView فقط HTML گزارش را نشان می‌دهد؛ دسترسی به فایل/محتوای گوشی لازم نیست
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setGeolocationEnabled(false);
        web.setInitialScale(100);
        host.addView(web,new FrameLayout.LayoutParams(viewW, 1600));

        web.setWebViewClient(new WebViewClient(){
          private boolean started=false;
          private int attempts=0;
          @Override public void onPageFinished(final WebView view,String url){
            if(started) return;
            final Runnable[] holder = new Runnable[1];
            holder[0] = new Runnable(){
              @Override public void run(){
                if(started) return;
                attempts++;
                try{
                  view.evaluateJavascript(
                    "(function(){var b=document.body,h=document.documentElement;var pages=document.querySelectorAll('.pdf-page');var ph=0;if(pages&&pages.length){for(var i=0;i<pages.length;i++){ph+=Math.max(pages[i].offsetHeight,pages[i].scrollHeight,1080);}return Math.max(ph,b.scrollHeight,b.offsetHeight,h.scrollHeight);}return Math.max(b.scrollHeight,b.offsetHeight,h.clientHeight,h.scrollHeight,h.offsetHeight);})()",
                    new android.webkit.ValueCallback<String>(){
                      @Override public void onReceiveValue(String value){
                        if(started) return;
                        int measured = 0;
                        try{
                          if(value!=null && !value.equals("null")) measured = (int)Math.ceil(Double.parseDouble(value));
                        }catch(Exception ignored){}
                        if(measured < 80){
                          measured = (int)Math.ceil(view.getContentHeight() * view.getScale());
                        }
                        if(measured < 80 && attempts < 8){
                          new Handler(Looper.getMainLooper()).postDelayed(holder[0], 500L);
                          return;
                        }
                        if(measured < 100 && attempts < 10){
                          new Handler(Looper.getMainLooper()).postDelayed(holder[0], 400L);
                          return;
                        }
                        if(measured < 100){
                          started=true;
                          call.reject("pdf_content_too_short");
                          try{ host.removeView(view); root.removeView(host); }catch(Exception ignored){}
                          view.destroy();
                          return;
                        }
                        measured = (int)(measured * 1.08) + 48;
                        started=true;
                        createPdfByPages(view,filename,call,host,root, viewW);
                      }
                    }
                  );
                }catch(Exception e){
                  try{
                    int measured = (int)Math.ceil(view.getContentHeight() * view.getScale());
                    if(measured < 80 && attempts < 8){
                      new Handler(Looper.getMainLooper()).postDelayed(holder[0], 500L);
                      return;
                    }
                    if(measured < 100 && attempts < 10){
                      new Handler(Looper.getMainLooper()).postDelayed(holder[0], 400L);
                      return;
                    }
                    if(measured < 100){
                      started=true;
                      call.reject("pdf_content_too_short");
                      try{ host.removeView(view); root.removeView(host); }catch(Exception ignored){}
                      view.destroy();
                      return;
                    }
                    measured = (int)(measured * 1.08) + 48;
                    started=true;
                    createPdfByPages(view,filename,call,host,root, viewW);
                  }catch(Exception e2){
                    started=true;
                    call.reject("pdf_measure_failed",e2);
                    try{ host.removeView(view); root.removeView(host); }catch(Exception ignored){}
                    view.destroy();
                  }
                }
              }
            };
            new Handler(Looper.getMainLooper()).postDelayed(holder[0], 1400L);
          }
        });
        web.loadDataWithBaseURL("https://hesabketab.local/",html,"text/html","UTF-8",null);
      }
    });
  }

  private void createPdf(WebView web,String filename,PluginCall call,FrameLayout host,FrameLayout root,int contentH, int viewW){
    // سازگاری با فراخوانی قدیمی — به مسیر صفحه به صفحه هدایت می‌شود
    createPdfByPages(web, filename, call, host, root, viewW);
  }

  /** رندر هر .pdf-page جداگانه — JS تنها مرجع مرز صفحات است */
  private void createPdfByPages(final WebView web, final String filename, final PluginCall call,
                                final FrameLayout host, final FrameLayout root, final int viewW){
    web.evaluateJavascript(
      "(function(){var ps=document.querySelectorAll('.pdf-page');return ps?ps.length:0;})()",
      new android.webkit.ValueCallback<String>(){
        @Override public void onReceiveValue(String value){
          int pageCount = 0;
          try {
            if (value != null && !value.equals("null")) pageCount = (int)Double.parseDouble(value);
          } catch (Exception ignored) {}
          if (pageCount < 1) {
            // fallback: یک صفحه از کل body
            pageCount = 1;
          }
          final int total = pageCount;
          final android.graphics.pdf.PdfDocument doc = new android.graphics.pdf.PdfDocument();
          final int[] index = new int[]{0};
          final int scaleCap = 4; // کیفیت فعلی را حفظ کن
          final int layoutW = viewW > 0 ? viewW : 794;

          final Runnable[] step = new Runnable[1];
          step[0] = new Runnable(){
            @Override public void run(){
              if (index[0] >= total) {
                // تمام — ذخیره
                Uri uri = null;
                try {
                  java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
                  doc.writeTo(bos);
                  doc.close();
                  byte[] pdfBytes = bos.toByteArray();
                  if (pdfBytes == null || pdfBytes.length < 100) {
                    call.reject("pdf_empty");
                    cleanupWeb(web, host, root);
                    return;
                  }
                  uri = saveToDownloads(filename, "application/pdf", pdfBytes);
                  call.resolve(new JSObject().put("uri", uri.toString()).put("filename", filename).put("ok", true).put("pages", total));
                } catch (Exception e) {
                  try { doc.close(); } catch (Exception ignored) {}
                  call.reject("pdf_export_failed", e);
                } finally {
                  cleanupWeb(web, host, root);
                }
                return;
              }

              final int pageIndex = index[0];
              // فقط این صفحه را نمایش بده
              String js =
                "(function(){" +
                "var ps=document.querySelectorAll('.pdf-page');" +
                "for(var i=0;i<ps.length;i++){ps[i].style.display=(i===" + pageIndex + "?'block':'none');}" +
                "var p=ps[" + pageIndex + "];" +
                "if(!p)return JSON.stringify({h:0,empty:true});" +
                "var h=Math.max(p.scrollHeight,p.offsetHeight,1);" +
                "var text=(p.innerText||'').replace(/\\s+/g,'');" +
                "return JSON.stringify({h:h,empty:text.length<3});" +
                "})()";

              web.evaluateJavascript(js, new android.webkit.ValueCallback<String>(){
                @Override public void onReceiveValue(String jsonRaw){
                  try {
                    String raw = jsonRaw;
                    if (raw != null && raw.length() >= 2 && raw.charAt(0) == '\"') {
                      // evaluateJavascript returns JSON-quoted string
                      raw = new org.json.JSONArray("[" + raw + "]").getString(0);
                    }
                    org.json.JSONObject info;
                    try {
                      String jsonSrc = (raw != null && raw.length() > 0) ? raw : "{}";
                      info = new org.json.JSONObject(jsonSrc);
                    } catch (Exception parseEx) {
                      info = new org.json.JSONObject();
                    }
                    boolean empty = info.optBoolean("empty", false);
                    int cssH = Math.max(1, info.optInt("h", 400));
                    if (empty) {
                      // صفحه خالی را رد کن
                      index[0]++;
                      new android.os.Handler(android.os.Looper.getMainLooper()).post(step[0]);
                      return;
                    }

                    // layout WebView به اندازه همین صفحه
                    final int layoutH = cssH + 8;
                    web.measure(
                      android.view.View.MeasureSpec.makeMeasureSpec(layoutW, android.view.View.MeasureSpec.EXACTLY),
                      android.view.View.MeasureSpec.makeMeasureSpec(layoutH, android.view.View.MeasureSpec.EXACTLY));
                    web.layout(0, 0, layoutW, layoutH);
                    host.updateViewLayout(web, new FrameLayout.LayoutParams(layoutW, layoutH));
                    host.measure(
                      android.view.View.MeasureSpec.makeMeasureSpec(layoutW, android.view.View.MeasureSpec.EXACTLY),
                      android.view.View.MeasureSpec.makeMeasureSpec(layoutH, android.view.View.MeasureSpec.EXACTLY));
                    host.layout(0, 0, layoutW, layoutH);

                    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new Runnable(){
                      @Override public void run(){
                        android.graphics.Bitmap bmp = null;
                        try {
                          int bmpW = layoutW * scaleCap;
                          int bmpH = layoutH * scaleCap;
                          bmp = android.graphics.Bitmap.createBitmap(bmpW, bmpH, android.graphics.Bitmap.Config.ARGB_8888);
                          android.graphics.Canvas bmpCanvas = new android.graphics.Canvas(bmp);
                          bmpCanvas.drawColor(android.graphics.Color.WHITE);
                          bmpCanvas.scale(scaleCap, scaleCap);
                          web.draw(bmpCanvas);

                          // رد bitmap تقریباً سفید
                          int stepPx = Math.max(8, Math.min(bmpW, bmpH) / 40);
                          int dark = 0, n = 0;
                          for (int yy = 0; yy < bmpH; yy += stepPx) {
                            for (int xx = 0; xx < bmpW; xx += stepPx) {
                              int p = bmp.getPixel(Math.min(xx, bmpW - 1), Math.min(yy, bmpH - 1));
                              int r = (p >> 16) & 0xFF, g = (p >> 8) & 0xFF, b = p & 0xFF;
                              n++;
                              if (r < 250 || g < 250 || b < 250) dark++;
                            }
                          }
                          if (n > 0 && (dark * 100) / n < 2) {
                            // سفید — رد
                            if (bmp != null && !bmp.isRecycled()) bmp.recycle();
                            index[0]++;
                            new android.os.Handler(android.os.Looper.getMainLooper()).post(step[0]);
                            return;
                          }

                          final int pageW = 595;
                          final int pageH = 842;
                          final int margin = 18;
                          final float usableW = pageW - 2f * margin;
                          float pxPerPt = bmpW / usableW;
                          float dstH = Math.min(pageH - 2f * margin, bmpH / pxPerPt);

                          android.graphics.pdf.PdfDocument.PageInfo pinfo =
                            new android.graphics.pdf.PdfDocument.PageInfo.Builder(pageW, pageH, index[0] + 1).create();
                          android.graphics.pdf.PdfDocument.Page page = doc.startPage(pinfo);
                          android.graphics.Canvas c = page.getCanvas();
                          c.drawColor(android.graphics.Color.WHITE);
                          android.graphics.Paint paint = new android.graphics.Paint(
                            android.graphics.Paint.ANTI_ALIAS_FLAG | android.graphics.Paint.FILTER_BITMAP_FLAG);
                          android.graphics.Rect src = new android.graphics.Rect(0, 0, bmpW, bmpH);
                          android.graphics.RectF dst = new android.graphics.RectF(margin, margin, margin + usableW, margin + dstH);
                          c.drawBitmap(bmp, src, dst, paint);
                          doc.finishPage(page);
                        } catch (Exception e) {
                          try { doc.close(); } catch (Exception ignored) {}
                          call.reject("pdf_page_failed", e);
                          cleanupWeb(web, host, root);
                          return;
                        } finally {
                          if (bmp != null && !bmp.isRecycled()) try { bmp.recycle(); } catch (Exception ignored) {}
                        }
                        index[0]++;
                        new android.os.Handler(android.os.Looper.getMainLooper()).post(step[0]);
                      }
                    }, 120);
                  } catch (Exception e) {
                    try { doc.close(); } catch (Exception ignored) {}
                    call.reject("pdf_page_meta_failed", e);
                    cleanupWeb(web, host, root);
                  }
                }
              });
            }
          };
          new android.os.Handler(android.os.Looper.getMainLooper()).post(step[0]);
        }
      }
    );
  }

  private void cleanupWeb(WebView web, FrameLayout host, FrameLayout root){
    try { host.removeView(web); } catch (Exception ignored) {}
    try { root.removeView(host); } catch (Exception ignored) {}
    try { web.destroy(); } catch (Exception ignored) {}
  }
}
`;


const appLockPlugin=`package ${pkg};

import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.concurrent.Executor;

@CapacitorPlugin(name="AppLock")
public class AppLockPlugin extends Plugin {
  static final String PREFS = "app_lock_secure_v1";
  static final String K_HASH = "pin_hash";
  static final String K_SALT = "pin_salt";
  static final String K_ENABLED = "enabled";
  static final String K_BIO = "bio_enabled";
  static final String K_LEN = "pin_len";
  static final String K_AUTO = "auto_lock_sec";
  /** فقط وقتی صفحه گوشی واقعاً خاموش/قفل شده — مستقل از onPause تعویض برنامه */
  static final String K_WAS_LOCKED = "device_was_locked";

  private BroadcastReceiver screenOffReceiver;

  private SharedPreferences sp() {
    return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  }

  private void markDeviceLocked() {
    try { sp().edit().putBoolean(K_WAS_LOCKED, true).apply(); } catch (Exception ignored) {}
  }

  private boolean isScreenOff() {
    try {
      PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
      if (pm != null && !pm.isInteractive()) return true;
    } catch (Exception ignored) {}
    return false;
  }

  private boolean isKeyguardLockedNow() {
    try {
      KeyguardManager km = (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
      if (km != null && km.isKeyguardLocked()) return true;
    } catch (Exception ignored) {}
    return false;
  }

  @Override
  public void load() {
    super.load();
    try {
      if (screenOffReceiver == null) {
        screenOffReceiver = new BroadcastReceiver() {
          @Override public void onReceive(Context context, Intent intent) {
            if (intent != null && Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) {
              markDeviceLocked();
            }
          }
        };
        IntentFilter f = new IntentFilter(Intent.ACTION_SCREEN_OFF);
        Context appCtx = getContext().getApplicationContext();
        if (Build.VERSION.SDK_INT >= 33) {
          appCtx.registerReceiver(screenOffReceiver, f, Context.RECEIVER_NOT_EXPORTED);
        } else {
          appCtx.registerReceiver(screenOffReceiver, f);
        }
      }
    } catch (Exception ignored) {}
  }

  @Override
  protected void handleOnPause() {
    super.handleOnPause();
    // تعویض برنامه → صفحه روشن → هیچ DEVICE_LOCK
    // قفل صفحه → صفحه خاموش یا keyguard → DEVICE_LOCK
    if (isScreenOff() || isKeyguardLockedNow()) {
      markDeviceLocked();
    }
  }

  @Override
  protected void handleOnStop() {
    super.handleOnStop();
    if (isScreenOff() || isKeyguardLockedNow()) {
      markDeviceLocked();
    }
  }

  private static String toHex(byte[] b) {
    StringBuilder sb = new StringBuilder(b.length * 2);
    for (byte x : b) sb.append(String.format("%02x", x));
    return sb.toString();
  }

  private static byte[] fromHex(String s) {
    int n = s.length();
    byte[] out = new byte[n / 2];
    for (int i = 0; i < n; i += 2) {
      out[i / 2] = (byte) Integer.parseInt(s.substring(i, i + 2), 16);
    }
    return out;
  }

  private static String sha256(String pin, byte[] salt) throws Exception {
    MessageDigest md = MessageDigest.getInstance("SHA-256");
    md.update(salt);
    md.update(pin.getBytes("UTF-8"));
    byte[] once = md.digest();
    md.reset();
    md.update(salt);
    md.update(once);
    return toHex(md.digest());
  }

  @com.getcapacitor.PluginMethod
  public void isEnabled(PluginCall call) {
    boolean en = sp().getBoolean(K_ENABLED, false) && sp().contains(K_HASH);
    call.resolve(new JSObject().put("enabled", en));
  }

  @com.getcapacitor.PluginMethod
  public void getPinLength(PluginCall call) {
    call.resolve(new JSObject().put("length", sp().getInt(K_LEN, 6)));
  }

  @com.getcapacitor.PluginMethod
  public void setPin(PluginCall call) {
    try {
      String pin = call.getString("pin", "");
      if (pin == null) pin = "";
      pin = pin.replaceAll("[^0-9]", "");
      if (pin.length() < 4 || pin.length() > 6) {
        call.reject("pin_invalid_length");
        return;
      }
      byte[] salt = new byte[16];
      new SecureRandom().nextBytes(salt);
      String hash = sha256(pin, salt);
      sp().edit()
        .putString(K_HASH, hash)
        .putString(K_SALT, toHex(salt))
        .putBoolean(K_ENABLED, true)
        .putInt(K_LEN, pin.length())
        .apply();
      call.resolve(new JSObject().put("ok", true));
    } catch (Exception e) {
      call.reject("set_pin_failed", e);
    }
  }

  @com.getcapacitor.PluginMethod
  public void verifyPin(PluginCall call) {
    try {
      String pin = call.getString("pin", "");
      if (pin == null) pin = "";
      pin = pin.replaceAll("[^0-9]", "");
      String hash = sp().getString(K_HASH, null);
      String saltHex = sp().getString(K_SALT, null);
      if (hash == null || saltHex == null) {
        call.resolve(new JSObject().put("ok", false));
        return;
      }
      String h = sha256(pin, fromHex(saltHex));
      call.resolve(new JSObject().put("ok", hash.equals(h)));
    } catch (Exception e) {
      call.resolve(new JSObject().put("ok", false));
    }
  }

  @com.getcapacitor.PluginMethod
  public void disable(PluginCall call) {
    sp().edit().clear().apply();
    call.resolve(new JSObject().put("ok", true));
  }

  @com.getcapacitor.PluginMethod
  public void isBiometricEnabled(PluginCall call) {
    call.resolve(new JSObject().put("enabled", sp().getBoolean(K_BIO, false)));
  }

  @com.getcapacitor.PluginMethod
  public void setBiometricEnabled(PluginCall call) {
    boolean on = false;
    try { Boolean v = call.getBoolean("enabled", false); if (v != null) on = v; } catch (Exception ignored) {}
    sp().edit().putBoolean(K_BIO, on).apply();
    call.resolve(new JSObject().put("ok", true));
  }

  @com.getcapacitor.PluginMethod
  public void getAutoLockSeconds(PluginCall call) {
    call.resolve(new JSObject().put("seconds", sp().getInt(K_AUTO, 0)));
  }

  @com.getcapacitor.PluginMethod
  public void setAutoLockSeconds(PluginCall call) {
    int sec = 0;
    try { Integer v = call.getInt("seconds", 0); if (v != null) sec = v; } catch (Exception ignored) {}
    sp().edit().putInt(K_AUTO, sec).apply();
    call.resolve(new JSObject().put("ok", true));
  }

  /** فقط flag مربوط به DEVICE_LOCK را برمی‌گرداند و پاک می‌کند — مستقل از TIMEOUT و APP_EXIT */
  @com.getcapacitor.PluginMethod
  public void consumeDeviceLockedFlag(PluginCall call) {
    boolean was = false;
    try {
      was = sp().getBoolean(K_WAS_LOCKED, false);
      sp().edit().putBoolean(K_WAS_LOCKED, false).apply();
    } catch (Exception ignored) {}
    call.resolve(new JSObject().put("wasLocked", was));
  }

  @com.getcapacitor.PluginMethod
  public void isDeviceLocked(PluginCall call) {
    call.resolve(new JSObject().put("locked", isScreenOff() || isKeyguardLockedNow()));
  }

  @com.getcapacitor.PluginMethod
  public void canUseBiometric(PluginCall call) {
    try {
      BiometricManager bm = BiometricManager.from(getContext());
      int can = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
      boolean ok = (can == BiometricManager.BIOMETRIC_SUCCESS);
      call.resolve(new JSObject().put("available", ok));
    } catch (Exception e) {
      call.resolve(new JSObject().put("available", false));
    }
  }

  @com.getcapacitor.PluginMethod
  public void authenticateBiometric(PluginCall call) {
    call.setKeepAlive(true);
    try {
      final FragmentActivity act = (FragmentActivity) getActivity();
      if (act == null) { call.reject("no_activity"); return; }
      final Executor ex = ContextCompat.getMainExecutor(getContext());
      final String title = call.getString("title", "احراز هویت");
      final String subtitle = call.getString("subtitle", "");
      act.runOnUiThread(new Runnable() {
        @Override public void run() {
          try {
            BiometricPrompt prompt = new BiometricPrompt(act, ex, new BiometricPrompt.AuthenticationCallback() {
              @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                call.resolve(new JSObject().put("ok", true));
              }
              @Override public void onAuthenticationError(int errorCode, CharSequence errString) {
                call.resolve(new JSObject().put("ok", false).put("error", String.valueOf(errString)));
              }
              @Override public void onAuthenticationFailed() {
              }
            });
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
              .setTitle(title != null ? title : "احراز هویت")
              .setSubtitle(subtitle != null ? subtitle : "")
              .setNegativeButtonText("انصراف")
              .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK)
              .setConfirmationRequired(false)
              .build();
            prompt.authenticate(info);
          } catch (Exception e) {
            call.reject("bio_failed", e);
          }
        }
      });
    } catch (Exception e) {
      call.reject("bio_failed", e);
    }
  }
}
`;

// یادآورهای کاربر: نوتیف سیستمی زمان‌بندی‌شده (AlarmManager) + تنظیم دوباره بعد از ری‌استارت/آپدیت
const hkReminders=`package ${pkg};

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name="HkReminders")
public class HkRemindersPlugin extends Plugin {
  static final String PREFS="hk_reminders";
  static final String KEY="items";
  static final String ACTION="ir.hesabketab.app.USER_REMINDER";

  @com.getcapacitor.PluginMethod public void schedule(PluginCall call){
    try{
      JSArray arr=call.getArray("items");
      Context c=getContext();
      cancelAll(c);
      JSONArray keep=new JSONArray();
      long now=System.currentTimeMillis();
      if(arr!=null){
        for(int i=0;i<arr.length() && keep.length()<64;i++){
          JSONObject o=arr.optJSONObject(i);
          if(o==null) continue;
          long at=o.optLong("at",0);
          if(at<=now) continue;
          JSONObject x=new JSONObject();
          x.put("id",o.optInt("id",1000+i)); x.put("at",at);
          x.put("title",o.optString("title","یادآور")); x.put("body",o.optString("body",""));
          x.put("target",o.optString("target",""));
          keep.put(x);
        }
      }
      c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString(KEY,keep.toString()).apply();
      armAll(c);
      JSObject r=new JSObject(); r.put("scheduled",keep.length()); call.resolve(r);
    }catch(Exception e){ call.reject("reminder_schedule_failed",e); }
  }

  static JSONArray load(Context c){
    try{ return new JSONArray(c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(KEY,"[]")); }catch(Exception e){ return new JSONArray(); }
  }
  static PendingIntent pending(Context c,JSONObject x){
    Intent i=new Intent(c,HkReminderReceiver.class);
    i.setAction(ACTION);
    i.putExtra("id",x.optInt("id")); i.putExtra("title",x.optString("title")); i.putExtra("body",x.optString("body")); i.putExtra("target",x.optString("target",""));
    return PendingIntent.getBroadcast(c,x.optInt("id"),i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  }
  static void cancelAll(Context c){
    AlarmManager am=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
    if(am==null) return;
    JSONArray q=load(c);
    for(int i=0;i<q.length();i++){ JSONObject x=q.optJSONObject(i); if(x!=null){ try{ am.cancel(pending(c,x)); }catch(Exception ignored){} } }
  }
  static void armAll(Context c){
    AlarmManager am=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
    if(am==null) return;
    JSONArray q=load(c);
    long now=System.currentTimeMillis();
    for(int i=0;i<q.length();i++){
      JSONObject x=q.optJSONObject(i);
      if(x==null) continue;
      long at=x.optLong("at",0);
      if(at<=now) continue;
      PendingIntent pi=pending(c,x);
      try{
        boolean exact=Build.VERSION.SDK_INT<31 || am.canScheduleExactAlarms();
        if(exact && Build.VERSION.SDK_INT>=23) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
        else if(Build.VERSION.SDK_INT>=23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
        else am.set(AlarmManager.RTC_WAKEUP,at,pi);
      }catch(Exception e){
        try{ am.set(AlarmManager.RTC_WAKEUP,at,pi); }catch(Exception ignored){}
      }
    }
  }
  /** لمس نوتیف (قسط/یادآور) → نرم‌افزار باز شود و همان منو نشان داده شود */
  static final String LAUNCH_PREFS="hk_launch";
  static void saveTarget(Context c, Intent in){
    try{
      if(in==null) return;
      String t=in.getStringExtra("hk_target");
      if(t==null || t.isEmpty()) return;
      c.getSharedPreferences(LAUNCH_PREFS,Context.MODE_PRIVATE).edit().putString("target",t).putLong("at",System.currentTimeMillis()).apply();
      in.removeExtra("hk_target");
    }catch(Exception ignored){}
  }
  @com.getcapacitor.PluginMethod public void takeLaunchTarget(PluginCall call){
    try{
      SharedPreferences sp=getContext().getSharedPreferences(LAUNCH_PREFS,Context.MODE_PRIVATE);
      String t=sp.getString("target",""); long at=sp.getLong("at",0);
      sp.edit().remove("target").remove("at").apply();
      if(System.currentTimeMillis()-at>10*60*1000L) t="";
      call.resolve(new JSObject().put("target",t));
    }catch(Exception e){ call.resolve(new JSObject().put("target","")); }
  }
  static void forget(Context c,int id){
    try{
      JSONArray q=load(c), n=new JSONArray();
      for(int i=0;i<q.length();i++){ JSONObject x=q.optJSONObject(i); if(x!=null && x.optInt("id")!=id) n.put(x); }
      c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString(KEY,n.toString()).apply();
    }catch(Exception ignored){}
  }
}
`;

const hkReminderReceiver=`package ${pkg};

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;

/** فقط آلارم‌های خود نرم‌افزار (exported=false) */
public class HkReminderReceiver extends BroadcastReceiver {
  static final String CHANNEL="user_reminders";
  @Override public void onReceive(Context c, Intent in){
    if(in==null || !HkRemindersPlugin.ACTION.equals(in.getAction())) return;
    int id=in.getIntExtra("id",0);
    HkRemindersPlugin.forget(c,id);
    if(Build.VERSION.SDK_INT>=33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) return;
    NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
    if(nm==null) return;
    if(Build.VERSION.SDK_INT>=26){ nm.createNotificationChannel(new NotificationChannel(CHANNEL,"یادآورها",NotificationManager.IMPORTANCE_HIGH)); }
    Intent open=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
    PendingIntent pi=null;
    String target=in.getStringExtra("target");
    if(open!=null){
      open.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
      if(target!=null && !target.isEmpty()) open.putExtra("hk_target",target);
      pi=PendingIntent.getActivity(c,id,open,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    }
    String title=in.getStringExtra("title"); String body=in.getStringExtra("body");
    NotificationCompat.Builder b=new NotificationCompat.Builder(c,CHANNEL)
      .setSmallIcon(android.R.drawable.ic_popup_reminder)
      .setContentTitle(title==null?"یادآور":title)
      .setContentText(body==null?"":body)
      .setStyle(new NotificationCompat.BigTextStyle().bigText(body==null?"":body))
      .setAutoCancel(true)
      .setCategory(NotificationCompat.CATEGORY_REMINDER)
      .setPriority(NotificationCompat.PRIORITY_HIGH);
    if(pi!=null) b.setContentIntent(pi);
    nm.notify(id,b.build());
  }
}
`;

const hkBootReceiver=`package ${pkg};

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** بعد از روشن شدن گوشی یا به‌روزرسانی اپ، آلارم‌های یادآور دوباره تنظیم شوند (آلارم‌ها با ری‌استارت پاک می‌شوند) */
public class HkBootReceiver extends BroadcastReceiver {
  @Override public void onReceive(Context c, Intent in){
    String a=in==null?null:in.getAction();
    if(Intent.ACTION_BOOT_COMPLETED.equals(a) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(a)
        || "android.intent.action.QUICKBOOT_POWERON".equals(a)){
      try{ HkRemindersPlugin.armAll(c); }catch(Exception ignored){}
      /* بعد از به‌روزرسانی اپ، ویجت‌ها با چیدمان جدید دوباره کشیده شوند */
      try{ HkWidgetProvider.refreshAll(c); }catch(Exception ignored){}
    }
  }
}
`;

// گفتار به متن (برای فیلد شرح): ترجیح پردازش روی خود گوشی (بدون اینترنت)
const hkSpeech=`package ${pkg};

import android.Manifest;
import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.speech.RecognitionListener;
import android.speech.RecognizerIntent;
import android.speech.SpeechRecognizer;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.util.ArrayList;

/**
 * گفتار به متن با سه تلاش پشت‌سرهم (هر کدام بعد از مکث کوتاه، چون ساختن فوری recognizer جدید داخل onError
 * روی خیلی از گوشی‌ها با خطای CLIENT/BUSY رد می‌شود):
 *   ۱) تشخیص روی خود دستگاه (اندروید ۱۲+)   ۲) سرویس پیش‌فرض با ترجیح آفلاین   ۳) سرویس پیش‌فرض آنلاین
 */
@CapacitorPlugin(name="HkSpeech", permissions={@Permission(strings={Manifest.permission.RECORD_AUDIO},alias="mic")})
public class HkSpeechPlugin extends Plugin {
  private SpeechRecognizer rec;
  private PluginCall pending;
  private String lang="fa-IR";
  private int attempt=0;
  private boolean gotSpeech=false;
  private final Handler ui=new Handler(Looper.getMainLooper());

  @com.getcapacitor.PluginMethod public void isAvailable(PluginCall call){
    JSObject r=new JSObject();
    boolean any=SpeechRecognizer.isRecognitionAvailable(getContext());
    boolean onDev=false;
    if(Build.VERSION.SDK_INT>=31){ try{ onDev=SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext()); }catch(Exception ignored){} }
    r.put("available",any||onDev); r.put("onDevice",onDev);
    call.resolve(r);
  }
  @com.getcapacitor.PluginMethod public void start(PluginCall call){
    lang=call.getString("lang","fa-IR");
    if(getPermissionState("mic")!=PermissionState.GRANTED){ requestPermissionForAlias("mic",call,"micPerm"); return; }
    begin(call);
  }
  @PermissionCallback private void micPerm(PluginCall call){
    if(getPermissionState("mic")==PermissionState.GRANTED){
      /* بعد از دیالوگ اجازه، اکتیویتی دوباره فعال می‌شود؛ کمی صبر تا میکروفون آزاد شود */
      final PluginCall c=call;
      ui.postDelayed(new Runnable(){ @Override public void run(){ begin(c); }}, 450);
    } else call.reject("permission_denied");
  }
  private boolean onDeviceOk(){
    if(Build.VERSION.SDK_INT<31) return false;
    try{ return SpeechRecognizer.isOnDeviceRecognitionAvailable(getContext()); }catch(Exception e){ return false; }
  }
  /* موتوری که آخرین بار جواب داده ذخیره می‌شود تا دفعهٔ بعد مستقیم همان شروع شود
     (هر تلاشِ ناموفق یک بوق اضافه می‌زد؛ استاندارد یک بوق در شروع است) */
  private int savedEngine(){ try{ return getContext().getSharedPreferences("hk_speech",android.content.Context.MODE_PRIVATE).getInt("engine",-1); }catch(Exception e){ return -1; } }
  private void saveEngine(int a){ try{ getContext().getSharedPreferences("hk_speech",android.content.Context.MODE_PRIVATE).edit().putInt("engine",a).apply(); }catch(Exception ignored){} }
  private void begin(final PluginCall call){
    if(pending!=null){ try{ pending.reject("replaced"); }catch(Exception ignored){} }
    pending=call; gotSpeech=false;
    int se=savedEngine();
    if(se==0 && !onDeviceOk()) se=-1;
    attempt = se>=0 ? se : (onDeviceOk() ? 0 : 1);
    ui.post(new Runnable(){ @Override public void run(){ listen(); }});
  }
  private void nextAttempt(final int err){
    destroyRec();
    /* موتور ذخیره‌شده دیگر کار نمی‌کند: از اول ترتیب عادی */
    if(savedEngine()==attempt) saveEngine(-1);
    if(attempt<2 && !gotSpeech){
      attempt++;
      ui.postDelayed(new Runnable(){ @Override public void run(){ if(pending!=null) listen(); }}, 350);
      return;
    }
    PluginCall c=pending; pending=null;
    if(c!=null) c.reject("speech_error_"+err, String.valueOf(err));
  }
  private void listen(){
    destroyRec();
    try{
      final boolean onDev = attempt==0 && Build.VERSION.SDK_INT>=31;
      rec = onDev ? SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext()) : SpeechRecognizer.createSpeechRecognizer(getContext());
      rec.setRecognitionListener(new RecognitionListener(){
        @Override public void onReadyForSpeech(Bundle b){ saveEngine(attempt); notifyListeners("state",new JSObject().put("state","ready").put("engine",attempt)); }
        @Override public void onBeginningOfSpeech(){ gotSpeech=true; notifyListeners("state",new JSObject().put("state","speaking")); }
        @Override public void onRmsChanged(float v){ notifyListeners("level",new JSObject().put("rms",(double)v)); }
        @Override public void onBufferReceived(byte[] b){}
        @Override public void onEndOfSpeech(){ notifyListeners("state",new JSObject().put("state","processing")); }
        @Override public void onError(int err){
          /* ۶: سکوت، ۷: چیزی تشخیص داده نشد → خطای کاربر است، نه موتور؛ تلاش بعدی لازم نیست */
          if(err==6 || err==7){ destroyRec(); PluginCall c=pending; pending=null; if(c!=null) c.reject("speech_error_"+err, String.valueOf(err)); return; }
          nextAttempt(err);
        }
        @Override public void onResults(Bundle b){
          ArrayList<String> m=b==null?null:b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
          PluginCall c=pending; pending=null; destroyRec();
          if(c!=null) c.resolve(new JSObject().put("text",(m!=null&&!m.isEmpty())?m.get(0):""));
        }
        @Override public void onPartialResults(Bundle b){
          ArrayList<String> m=b==null?null:b.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION);
          if(m!=null && !m.isEmpty()) notifyListeners("partial",new JSObject().put("text",m.get(0)));
        }
        @Override public void onEvent(int t, Bundle b){}
      });
      Intent i=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
      i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
      i.putExtra(RecognizerIntent.EXTRA_LANGUAGE,lang);
      i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE,lang);
      i.putExtra(RecognizerIntent.EXTRA_ONLY_RETURN_LANGUAGE_PREFERENCE,lang);
      i.putExtra(RecognizerIntent.EXTRA_PREFER_OFFLINE, attempt<2);
      i.putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS,true);
      i.putExtra(RecognizerIntent.EXTRA_MAX_RESULTS,1);
      i.putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE,getContext().getPackageName());
      /* «سوپر» و … را ستاره‌دار نکند (اندروید ۱۳+: RecognizerIntent.EXTRA_MASK_OFFENSIVE_WORDS؛ روی نسخه‌های قبل بی‌اثر) */
      i.putExtra("android.speech.extra.MASK_OFFENSIVE_WORDS",false);
      rec.startListening(i);
    }catch(Exception e){
      nextAttempt(5);
    }
  }
  @com.getcapacitor.PluginMethod public void stop(PluginCall call){
    ui.post(new Runnable(){ @Override public void run(){ try{ if(rec!=null) rec.stopListening(); }catch(Exception ignored){} }});
    call.resolve();
  }
  @com.getcapacitor.PluginMethod public void cancel(PluginCall call){
    ui.post(new Runnable(){ @Override public void run(){
      PluginCall c=pending; pending=null; destroyRec();
      if(c!=null){ try{ c.reject("cancelled"); }catch(Exception ignored){} }
    }});
    call.resolve();
  }
  /* دانلود بستهٔ گفتار فارسی آفلاین: اندروید ۱۳+ با موتور روی دستگاه (پنجرهٔ دانلود سیستم)؛
     در غیر این صورت تنظیمات «ورودی صوتی» گوشی باز می‌شود تا کاربر خودش بستهٔ فارسی را دانلود کند */
  /* بستهٔ گفتار فارسی آفلاین:
     ۱) اندروید ۱۳+: اول از سرویس گفتارِ روی دستگاه می‌پرسد فارسی نصب است / قابل دانلود است یا نه؛
        اگر قابل دانلود بود دانلود را واقعاً شروع می‌کند و پیشرفتش را (اندروید ۱۴+) با رویداد offlineDl خبر می‌دهد.
     ۲) اگر این راه نبود یا فارسی را پشتیبانی نمی‌کرد: صفحهٔ بستهٔ زبان آفلاینِ گوگل، وگرنه تنظیمات ورودی صوتی. */
  @com.getcapacitor.PluginMethod public void downloadOffline(final PluginCall call){
    final String lg=call.getString("lang","fa-IR");
    ui.post(new Runnable(){ @Override public void run(){
      if(Build.VERSION.SDK_INT>=33 && onDeviceOk()){
        try{ checkAndDownload(call,lg); return; }catch(Throwable ignored){}
      }
      openOfflineSettings(call,"no_ondevice");
    }});
  }
  private static boolean hasLang(java.util.List<String> l,String lg){
    if(l==null) return false;
    String p=lg.length()>=2 ? lg.substring(0,2).toLowerCase() : lg.toLowerCase();
    for(String x:l){ if(x!=null && x.toLowerCase().startsWith(p)) return true; }
    return false;
  }
  @android.annotation.TargetApi(33) private void checkAndDownload(final PluginCall call,final String lg){
    final SpeechRecognizer r=SpeechRecognizer.createOnDeviceSpeechRecognizer(getContext());
    final Intent i=new Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL,RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
    i.putExtra(RecognizerIntent.EXTRA_LANGUAGE,lg);
    final java.util.concurrent.Executor ex=getContext().getMainExecutor();
    final boolean[] done=new boolean[]{false};
    /* اگر سرویس جواب نداد، بعد از ۶ ثانیه سراغ تنظیمات برو */
    ui.postDelayed(new Runnable(){ @Override public void run(){ if(done[0]) return; done[0]=true; try{ r.destroy(); }catch(Exception ignored){} openOfflineSettings(call,"timeout"); }}, 6000);
    r.checkRecognitionSupport(i,ex,new android.speech.RecognitionSupportCallback(){
      @Override public void onSupportResult(android.speech.RecognitionSupport s){
        if(done[0]) return; done[0]=true;
        if(hasLang(s.getInstalledOnDeviceLanguages(),lg)){ try{ r.destroy(); }catch(Exception ignored){} call.resolve(new JSObject().put("status","installed")); return; }
        if(hasLang(s.getPendingOnDeviceLanguages(),lg)){ try{ r.destroy(); }catch(Exception ignored){} call.resolve(new JSObject().put("status","pending")); return; }
        if(!hasLang(s.getSupportedOnDeviceLanguages(),lg)){ try{ r.destroy(); }catch(Exception ignored){} openOfflineSettings(call,"unsupported"); return; }
        try{
          if(Build.VERSION.SDK_INT>=34){
            r.triggerModelDownload(i,ex,new android.speech.ModelDownloadListener(){
              @Override public void onProgress(int p){ notifyListeners("offlineDl",new JSObject().put("state","progress").put("progress",p)); }
              @Override public void onSuccess(){ notifyListeners("offlineDl",new JSObject().put("state","done")); try{ r.destroy(); }catch(Exception ignored){} }
              @Override public void onScheduled(){ notifyListeners("offlineDl",new JSObject().put("state","scheduled")); try{ r.destroy(); }catch(Exception ignored){} }
              @Override public void onError(int e){ notifyListeners("offlineDl",new JSObject().put("state","error").put("code",e)); try{ r.destroy(); }catch(Exception ignored){} }
            });
          } else {
            r.triggerModelDownload(i);
            ui.postDelayed(new Runnable(){ @Override public void run(){ try{ r.destroy(); }catch(Exception ignored){} }}, 8000);
          }
          call.resolve(new JSObject().put("status","downloading").put("progressEvents",Build.VERSION.SDK_INT>=34));
        }catch(Throwable t){ try{ r.destroy(); }catch(Exception ignored){} openOfflineSettings(call,"trigger_failed"); }
      }
      @Override public void onError(int e){
        if(done[0]) return; done[0]=true;
        try{ r.destroy(); }catch(Exception ignored){}
        openOfflineSettings(call,"check_error_"+e);
      }
    });
  }
  private boolean startAct(Intent s){
    try{ s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); getContext().startActivity(s); return true; }catch(Throwable t){ return false; }
  }
  private void openOfflineSettings(PluginCall call,String why){
    Intent g=new Intent(); g.setClassName("com.google.android.googlequicksearchbox","com.google.android.voicesearch.greco3.languagepack.InstallActivity");
    if(startAct(g)){ call.resolve(new JSObject().put("status","settings").put("method","google_pack").put("why",why)); return; }
    if(startAct(new Intent(android.provider.Settings.ACTION_VOICE_INPUT_SETTINGS))){ call.resolve(new JSObject().put("status","settings").put("method","voice").put("why",why)); return; }
    if(startAct(new Intent(android.provider.Settings.ACTION_INPUT_METHOD_SETTINGS))){ call.resolve(new JSObject().put("status","settings").put("method","ime").put("why",why)); return; }
    call.reject("unavailable");
  }
  private void destroyRec(){ try{ if(rec!=null){ rec.cancel(); rec.destroy(); } }catch(Exception ignored){} rec=null; }
  @Override protected void handleOnDestroy(){ destroyRec(); }
}
`;

// رنگ زمینهٔ نوارهای سیستم (پشت نوار وضعیت و ناوبری) هم‌رنگ تم نرم‌افزار + رنگ آیکن‌های نوار
const appChrome=`package ${pkg};

import android.graphics.Color;
import android.view.View;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="AppChrome")
public class AppChromePlugin extends Plugin {
  static void apply(android.app.Activity act, int color, boolean light){
    if(act==null) return;
    Window w=act.getWindow();
    View decor=w.getDecorView();
    decor.setBackgroundColor(color);
    try{
      View wv=null;
      try{ wv=((com.getcapacitor.BridgeActivity)act).getBridge().getWebView(); }catch(Exception ignored){}
      if(wv!=null){ wv.setBackgroundColor(color); if(wv.getParent() instanceof View) ((View)wv.getParent()).setBackgroundColor(color); }
    }catch(Exception ignored){}
    WindowInsetsControllerCompat ic=WindowCompat.getInsetsController(w,decor);
    ic.setAppearanceLightStatusBars(light);
    ic.setAppearanceLightNavigationBars(light);
  }
  /** وقتی قفل برنامه فعال است: جلوگیری از اسکرین‌شات و نمایش محتوای مالی در پیش‌نمایش «برنامه‌های اخیر» */
  @com.getcapacitor.PluginMethod public void setSecure(final PluginCall call){
    final boolean on=Boolean.TRUE.equals(call.getBoolean("on",false));
    getActivity().runOnUiThread(new Runnable(){ @Override public void run(){
      try{
        if(on) getActivity().getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
        else getActivity().getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
        call.resolve();
      }catch(Exception e){ call.reject("secure_failed",e); }
    }});
  }
  @com.getcapacitor.PluginMethod public void setTheme(final PluginCall call){
    final String hex=call.getString("color","#1b1b1b");
    final boolean light=Boolean.TRUE.equals(call.getBoolean("light",false));
    getActivity().runOnUiThread(new Runnable(){ @Override public void run(){
      try{ apply(getActivity(), Color.parseColor(hex), light); call.resolve(); }
      catch(Exception e){ call.reject("app_chrome_failed",e); }
    }});
  }
}
`;

const hkUpdater=`package ${pkg};

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** بروزرسانی داخل نرم‌افزار: دانلود APK امضاشده از Releases با گزارش درصد، سپس باز کردن نصب‌کنندهٔ اندروید */
@CapacitorPlugin(name="HkUpdater")
public class HkUpdaterPlugin extends Plugin {
  private volatile boolean busy=false;

  private static boolean allowed(String u){
    return u!=null && u.startsWith("https://") && (u.startsWith("https://github.com/") || u.startsWith("https://objects.githubusercontent.com/") || u.startsWith("https://release-assets.githubusercontent.com/"));
  }

  @com.getcapacitor.PluginMethod public void download(final PluginCall call){
    final String url=call.getString("url","");
    if(!allowed(url)){ call.reject("bad_url"); return; }
    if(busy){ call.reject("busy"); return; }
    busy=true;
    new Thread(new Runnable(){ @Override public void run(){
      HttpURLConnection c=null;
      try{
        File dir=new File(getContext().getCacheDir(),"updates");
        if(!dir.exists()) dir.mkdirs();
        File out=new File(dir,"hesab-ketab.apk");
        File tmp=new File(dir,"hesab-ketab.apk.part");
        String cur=url;
        for(int hop=0; hop<6; hop++){
          c=(HttpURLConnection)new URL(cur).openConnection();
          c.setInstanceFollowRedirects(false);
          c.setConnectTimeout(15000);
          c.setReadTimeout(30000);
          c.setRequestProperty("User-Agent","HesabKetab-Updater");
          int code=c.getResponseCode();
          if(code>=300 && code<400){
            String loc=c.getHeaderField("Location");
            c.disconnect(); c=null;
            if(loc==null || !allowed(loc)) throw new Exception("bad_redirect");
            cur=loc; continue;
          }
          if(code!=200) throw new Exception("http_"+code);
          break;
        }
        if(c==null) throw new Exception("too_many_redirects");
        long total=c.getContentLengthLong();
        InputStream in=c.getInputStream();
        FileOutputStream fo=new FileOutputStream(tmp);
        byte[] buf=new byte[65536];
        long got=0; int last=-1; int n;
        while((n=in.read(buf))!=-1){
          fo.write(buf,0,n); got+=n;
          int pct= total>0 ? (int)Math.min(100, (got*100)/total) : -1;
          if(pct!=last){ last=pct; JSObject ev=new JSObject(); ev.put("percent",pct); ev.put("received",got); ev.put("total",total); notifyListeners("progress",ev); }
        }
        fo.close(); in.close();
        if(total>0 && got!=total) throw new Exception("incomplete");
        if(out.exists()) out.delete();
        if(!tmp.renameTo(out)) throw new Exception("rename_failed");
        JSObject r=new JSObject(); r.put("path",out.getAbsolutePath()); r.put("size",got);
        call.resolve(r);
      }catch(Exception e){
        call.reject(e.getMessage()==null?"download_failed":e.getMessage());
      }finally{
        try{ if(c!=null) c.disconnect(); }catch(Exception ignored){}
        busy=false;
      }
    }}).start();
  }

  /** اگر اجازهٔ «نصب برنامه‌های ناشناس» برای این نرم‌افزار داده نشده باشد، صفحهٔ تنظیمات همان اجازه باز می‌شود */
  @com.getcapacitor.PluginMethod public void install(final PluginCall call){
    try{
      File f=new File(getContext().getCacheDir(),"updates/hesab-ketab.apk");
      if(!f.exists()){ call.reject("no_file"); return; }
      if(Build.VERSION.SDK_INT>=26 && !getContext().getPackageManager().canRequestPackageInstalls()){
        Intent s=new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:"+getContext().getPackageName()));
        s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(s);
        call.reject("need_permission");
        return;
      }
      Uri u=FileProvider.getUriForFile(getContext(), getContext().getPackageName()+".fileprovider", f);
      Intent i=new Intent(Intent.ACTION_VIEW);
      i.setDataAndType(u,"application/vnd.android.package-archive");
      i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(i);
      call.resolve();
    }catch(Exception e){ call.reject("install_failed",e); }
  }
}
`;

const hkWidgetDraw=`package ${pkg};

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

  static final class Data { String month, balance, today, accounts; boolean neg, locked, light, none; }

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

  static Data load(Context c){
    SharedPreferences sp=c.getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    Data d=new Data();
    d.month=sp.getString("month", sp.getString("title",""));
    d.balance=sp.getString("balance","—");
    d.today=sp.getString("today","—");
    d.neg=sp.getBoolean("neg",false);
    d.locked=sp.getBoolean("locked",false);
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
  private static int balColor(Data d){
    if(d.locked) return text(d);
    return d.neg?Color.parseColor("#ff6b4a"):(d.light?Color.parseColor("#3f9a5c"):Color.parseColor("#9ee858"));
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
    L.add(new Line(false,true,BOLD,1.7f,0.12f,d.locked?"••••••":d.balance,balColor(d)));
    L.add(new Line(false,false,REG,0.95f,0.5f,"خرج امروز",muted(d)));
    if(d.locked) L.add(new Line(false,false,REG,0.95f,0.12f,"برای دیدن مبالغ، نرم‌افزار را باز کنید",text(d)));
    else if(d.none) L.add(new Line(false,false,REG,1.05f,0.12f,"هنوز خرجی نداشتی",text(d)));
    else L.add(new Line(false,true,BOLD,1.7f,0.12f,d.today,Color.parseColor("#ff6b4a")));
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
        float s2=fit(REG,size,m,aw*0.42f);
        cv.drawText(m, padX, y+TXT_A*size, paint(REG,s2,muted(d),Paint.Align.LEFT));
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
    cv.drawText(m, padX, y+TXT_A*u, paint(REG,fit(REG,u*0.9f,m,aw*0.42f),muted(d),Paint.Align.LEFT));
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
      String val=d.locked?"••••••":r[1];
      int col=d.locked?text(d):("1".equals(r[2])?Color.parseColor("#ff6b4a"):(d.light?Color.parseColor("#3f9a5c"):Color.parseColor("#9ee858")));
      Paint vp=paint(BOLD,fit(BOLD,u*rowR,val,aw*0.52f),col,Paint.Align.LEFT);
      cv.drawText(val, padX, y+NUM_A*u, vp);
      /* نقطه(های) رنگ پروژه درست جلوی عدد موجودی (مثل موجودی آنی نرم‌افزار) */
      if(!d.locked && r.length>4 && r[4]!=null && r[4].length()>0){
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
    String tv=d.locked?"••••••":(d.none?"۰":d.today);
    cv.drawText(tv, padX, y+NUM_A*u, paint(BOLD,fit(BOLD,u,tv,aw*0.52f),d.locked?text(d):Color.parseColor("#ff6b4a"),Paint.Align.LEFT));
    return bm;
  }

  /** ویجت یک‌خطی: صفحهٔ ۰ = موجودی، صفحهٔ ۱ = خرج امروز (با اسکرول عمودی) */
  static Bitmap page(Context c, int W, int H, float k, Data d, int page){
    fonts(c);
    Bitmap bm=Bitmap.createBitmap(W, H, Bitmap.Config.ARGB_8888);
    Canvas cv=new Canvas(bm);
    /* سمت چپ فقط دو نقطهٔ کوچک نشانگر صفحه (اسکرول بی‌پایان با کشیدن عمودی) */
    float btnW=16*k;
    float padX=14*k, padY=Math.max(5*k, H*0.1f), ah=H-2*padY, aw=W-2*padX-btnW;
    String label=page==0?"موجودی":"خرج امروز";
    String val; boolean num=true; Typeface vf=BOLD; float vr=1.9f; int vc=text(d);
    if(page==0){ val=d.locked?"••••••":d.balance; vc=balColor(d); }
    else if(d.locked){ val="نرم‌افزار را باز کنید"; num=false; vf=REG; vr=1.1f; }
    else if(d.none){ val="هنوز خرجی نداشتی"; num=false; vf=REG; vr=1.1f; }
    else{ val=d.today; vc=Color.parseColor("#ff6b4a"); }
    float b1=TXT_A+TXT_D, b2=num?(NUM_A+NUM_D):(TXT_A+TXT_D), gap=0.1f;
    float u=ah/(b1+vr*b2+gap);
    float s=fit(REG,u,label,aw);
    cv.drawText(label, W-padX, padY+TXT_A*u, paint(REG,s,muted(d),Paint.Align.RIGHT));
    float y=padY+u*b1+gap*u, vs=vr*u, a=num?NUM_A:TXT_A;
    s=fit(vf,vs,val,aw);
    if(num) cv.drawText(val, btnW+6*k, y+a*vs, paint(vf,s,vc,Paint.Align.LEFT));
    else cv.drawText(val, W-padX, y+a*vs, paint(vf,s,vc,Paint.Align.RIGHT));
    float cx=10*k, cy=H/2f, r=2.2f*k;
    for(int i=0;i<2;i++){
      Paint p=new Paint(Paint.ANTI_ALIAS_FLAG);
      p.setColor(i==page?text(d):(d.light?Color.parseColor("#c7c7cc"):Color.parseColor("#48484a")));
      cv.drawCircle(cx, cy+(i==0?-1:1)*4.5f*k, r, p);
    }
    return bm;
  }
}
`;

const hkWidget=`package ${pkg};

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
  @Override public void onReceive(Context ctx, Intent intent){
    if(intent!=null && HkWidgetDraw.ACTION_MIDNIGHT.equals(intent.getAction())){ refreshAll(ctx); return; }
    super.onReceive(ctx, intent);
  }

  static void refreshAll(Context ctx){
    HkWidgetDraw.scheduleMidnight(ctx);
    try{
      AppWidgetManager mgr=AppWidgetManager.getInstance(ctx);
      int[] ids=mgr.getAppWidgetIds(new ComponentName(ctx, HkWidgetProvider.class));
      for(int id: ids) render(ctx, mgr, id);
    }catch(Exception ignored){}
    HkWidgetSmallProvider.refreshAll(ctx);
    try{ HkWidgetAccountsProvider.refreshAll(ctx); }catch(Exception ignored){}
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
      mgr.updateAppWidget(id, v);
    }catch(Exception ignored){}
  }
}
`;

const hkWidgetAccounts=`package ${pkg};

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.os.Bundle;
import android.widget.RemoteViews;

/** ویجت حساب‌ها: موجودی هر حساب بانکی (کارت) جدا + خرج امروز */
public class HkWidgetAccountsProvider extends AppWidgetProvider {
  @Override public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids){ for(int id: ids) render(ctx, mgr, id); }
  @Override public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle o){ render(ctx, mgr, id); }
  static void refreshAll(Context ctx){
    try{
      AppWidgetManager mgr=AppWidgetManager.getInstance(ctx);
      int[] ids=mgr.getAppWidgetIds(new ComponentName(ctx, HkWidgetAccountsProvider.class));
      for(int id: ids) render(ctx, mgr, id);
    }catch(Exception ignored){}
  }
  static void render(Context ctx, AppWidgetManager mgr, int id){
    try{
      HkWidgetDraw.Data d=HkWidgetDraw.load(ctx);
      float[] sz=HkWidgetDraw.size(ctx, mgr, id, 250, 200);
      RemoteViews v=new RemoteViews(ctx.getPackageName(), R.layout.hk_widget);
      v.setInt(R.id.hk_w_root,"setBackgroundResource", d.light ? R.drawable.hk_widget_bg_light : R.drawable.hk_widget_bg);
      v.setImageViewBitmap(R.id.hk_w_img, HkWidgetDraw.accounts(ctx, (int)sz[0], (int)sz[1], sz[2], d));
      v.setOnClickPendingIntent(R.id.hk_w_root, HkWidgetProvider.openApp(ctx, false));
      mgr.updateAppWidget(id, v);
    }catch(Exception ignored){}
  }
}
`;

const hkWidgetSmall=`package ${pkg};

import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.widget.RemoteViews;

/** ویجت یک‌خطی: موجودی و خرج امروز پشت‌سرهم در یک فهرست بی‌پایان؛ با کشیدن عمودی (در هر جهت) بینشان جابه‌جا می‌شوی */
public class HkWidgetSmallProvider extends AppWidgetProvider {
  static final int LOOP_COUNT=2000;
  @Override public void onUpdate(Context ctx, AppWidgetManager mgr, int[] ids){
    for(int id: ids) render(ctx, mgr, id);
  }
  @Override public void onAppWidgetOptionsChanged(Context ctx, AppWidgetManager mgr, int id, Bundle o){
    render(ctx, mgr, id);
  }
  /* پاک‌کردن کلید صفحهٔ نسخهٔ قبلی (دکمهٔ جابه‌جایی) */
  @Override public void onDeleted(Context ctx, int[] ids){
    try{ android.content.SharedPreferences.Editor e=ctx.getSharedPreferences(HkWidgetDraw.PREFS, Context.MODE_PRIVATE).edit(); for(int id: ids) e.remove("small_page_"+id); e.apply(); }catch(Exception ignored){}
  }

  static void refreshAll(Context ctx){
    try{
      AppWidgetManager mgr=AppWidgetManager.getInstance(ctx);
      int[] ids=mgr.getAppWidgetIds(new ComponentName(ctx, HkWidgetSmallProvider.class));
      for(int id: ids) render(ctx, mgr, id);
    }catch(Exception ignored){}
  }

  @SuppressWarnings("deprecation")
  static void render(Context ctx, AppWidgetManager mgr, int id){
    try{
      HkWidgetDraw.Data d=HkWidgetDraw.load(ctx);
      RemoteViews v=new RemoteViews(ctx.getPackageName(), R.layout.hk_widget_small);
      v.setInt(R.id.hk_ws_root,"setBackgroundResource", d.light ? R.drawable.hk_widget_bg_light : R.drawable.hk_widget_bg);
      Intent svc=new Intent(ctx, HkWidgetListService.class);
      svc.putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id);
      svc.setData(Uri.parse(svc.toUri(Intent.URI_INTENT_SCHEME)));
      v.setRemoteAdapter(R.id.hk_ws_list, svc);
      v.setPendingIntentTemplate(R.id.hk_ws_list, HkWidgetProvider.openApp(ctx, true));
      v.setScrollPosition(R.id.hk_ws_list, LOOP_COUNT/2);
      v.setOnClickPendingIntent(R.id.hk_ws_root, HkWidgetProvider.openApp(ctx, false));
      mgr.updateAppWidget(id, v);
      mgr.notifyAppWidgetViewDataChanged(id, R.id.hk_ws_list);
    }catch(Exception ignored){}
  }
}
`;

const hkWidgetList=`package ${pkg};

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
      /* اسکرول بی‌پایان: صفحه‌ها پشت‌سرهم تکرار می‌شوند (زوج = موجودی، فرد = خرج امروز) */
      public int getCount(){ return HkWidgetSmallProvider.LOOP_COUNT; }
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
`;

const hkWidgetPlugin=`package ${pkg};

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="HkWidget")
public class HkWidgetPlugin extends Plugin {
  @com.getcapacitor.PluginMethod public void update(PluginCall call){
    try{
      SharedPreferences.Editor e=getContext().getSharedPreferences(HkWidgetProvider.PREFS, Context.MODE_PRIVATE).edit();
      e.putString("title", call.getString("title","حساب‌کتاب"));
      e.putString("month", call.getString("month", call.getString("title","")));
      e.putBoolean("todayNone", Boolean.TRUE.equals(call.getBoolean("todayNone",false)));
      e.putString("balance", call.getString("balance","—"));
      e.putString("today", call.getString("today","—"));
      e.putBoolean("neg", Boolean.TRUE.equals(call.getBoolean("negative",false)));
      e.putBoolean("locked", Boolean.TRUE.equals(call.getBoolean("locked",false)));
      e.putBoolean("light", Boolean.TRUE.equals(call.getBoolean("light",false)));
      e.putString("accounts", call.getString("accounts","[]"));
      e.putString("dayKey", call.getString("dayKey",""));
      e.apply();
      HkWidgetProvider.refreshAll(getContext());
      call.resolve();
    }catch(Exception ex){ call.reject("widget_failed",ex); }
  }
}
`;

const hkMedia=`package ${pkg};

import android.Manifest;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.net.Uri;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.ByteArrayOutputStream;
import java.io.File;

/** پیوست ردیف: گرفتن عکس با دوربین (نه گالری) و اجازهٔ میکروفون برای ضبط یادداشت صوتی */
@CapacitorPlugin(name="HkMedia", permissions={
  @Permission(strings={Manifest.permission.RECORD_AUDIO, Manifest.permission.MODIFY_AUDIO_SETTINGS}, alias="mic")
})
public class HkMediaPlugin extends Plugin {
  private File photoFile;

  @com.getcapacitor.PluginMethod public void micPermission(PluginCall call){
    if(getPermissionState("mic")==PermissionState.GRANTED){ call.resolve(new JSObject().put("granted",true)); return; }
    requestPermissionForAlias("mic",call,"micCb");
  }
  @PermissionCallback private void micCb(PluginCall call){
    boolean ok=getPermissionState("mic")==PermissionState.GRANTED;
    boolean never=!ok && getActivity()!=null && !getActivity().shouldShowRequestPermissionRationale(Manifest.permission.RECORD_AUDIO);
    call.resolve(new JSObject().put("granted",ok).put("blocked",never));
  }
  @com.getcapacitor.PluginMethod public void openAppSettings(PluginCall call){
    try{
      Intent i=new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:"+getContext().getPackageName()));
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); getContext().startActivity(i); call.resolve();
    }catch(Exception e){ call.reject("open_failed",e); }
  }
  @com.getcapacitor.PluginMethod public void takePhoto(PluginCall call){
    try{
      File dir=new File(getContext().getCacheDir(),"capture"); if(!dir.exists()) dir.mkdirs();
      File[] old=dir.listFiles(); if(old!=null) for(File f: old) f.delete();
      photoFile=new File(dir,"photo_"+System.currentTimeMillis()+".jpg");
      Uri u=FileProvider.getUriForFile(getContext(), getContext().getPackageName()+".fileprovider", photoFile);
      Intent i=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
      i.putExtra(MediaStore.EXTRA_OUTPUT,u);
      i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);
      startActivityForResult(call,i,"photoCb");
    }catch(Exception e){ call.reject("camera_failed",e); }
  }
  @ActivityCallback private void photoCb(PluginCall call, ActivityResult result){
    if(call==null) return;
    try{
      if(photoFile==null || !photoFile.exists() || photoFile.length()==0){ call.reject("cancelled"); return; }
      /* کوچک‌کردن در خود گوشی (ضلع بلند ۱۶۰۰) و چرخاندن طبق EXIF؛ JPEG کیفیت ۸۲ */
      BitmapFactory.Options o=new BitmapFactory.Options(); o.inJustDecodeBounds=true;
      BitmapFactory.decodeFile(photoFile.getAbsolutePath(),o);
      int max=Math.max(o.outWidth,o.outHeight), ss=1;
      while(max/(ss*2)>=1600) ss*=2;
      BitmapFactory.Options o2=new BitmapFactory.Options(); o2.inSampleSize=ss;
      Bitmap b=BitmapFactory.decodeFile(photoFile.getAbsolutePath(),o2);
      if(b==null){ call.reject("decode_failed"); return; }
      float k=Math.min(1f,1600f/Math.max(b.getWidth(),b.getHeight()));
      int rot=0;
      try{
        androidx.exifinterface.media.ExifInterface ex=new androidx.exifinterface.media.ExifInterface(photoFile.getAbsolutePath());
        int or=ex.getAttributeInt(androidx.exifinterface.media.ExifInterface.TAG_ORIENTATION,1);
        rot= or==6?90: or==3?180: or==8?270: 0;
      }catch(Throwable ignored){}
      Matrix m=new Matrix(); m.postScale(k,k); if(rot!=0) m.postRotate(rot);
      Bitmap out=Bitmap.createBitmap(b,0,0,b.getWidth(),b.getHeight(),m,true);
      ByteArrayOutputStream bo=new ByteArrayOutputStream();
      out.compress(Bitmap.CompressFormat.JPEG,82,bo);
      photoFile.delete();
      call.resolve(new JSObject().put("data",Base64.encodeToString(bo.toByteArray(),Base64.NO_WRAP)).put("mime","image/jpeg"));
    }catch(Exception e){ call.reject("photo_failed",e); }
  }
  /* خواندن عکس از Uri با کوچک‌کردن هنگام خواندن (ضلع بلند MAXS) و چرخش EXIF؛ HEIC و عکس خیلی بزرگ هم */
  static Bitmap decodeScaled(android.content.Context ctx, Uri u, final int MAXS) throws Exception {
      Bitmap b=null; boolean rotated=false;
      if(android.os.Build.VERSION.SDK_INT>=28){
        try{
          android.graphics.ImageDecoder.Source src=android.graphics.ImageDecoder.createSource(ctx.getContentResolver(),u);
          b=android.graphics.ImageDecoder.decodeBitmap(src,(dec,info,s)->{
            int w=info.getSize().getWidth(), h=info.getSize().getHeight(), mx=Math.max(w,h);
            if(mx>MAXS){ float k=MAXS/(float)mx; dec.setTargetSize(Math.max(1,Math.round(w*k)),Math.max(1,Math.round(h*k))); }
            dec.setAllocator(android.graphics.ImageDecoder.ALLOCATOR_SOFTWARE);
          });
          rotated=true;
        }catch(Throwable t){ b=null; }
      }
      if(b==null){
        BitmapFactory.Options o=new BitmapFactory.Options(); o.inJustDecodeBounds=true;
        try(java.io.InputStream in=ctx.getContentResolver().openInputStream(u)){ BitmapFactory.decodeStream(in,null,o); }
        int max=Math.max(o.outWidth,o.outHeight), ss=1;
        while(max/(ss*2)>=MAXS) ss*=2;
        BitmapFactory.Options o2=new BitmapFactory.Options(); o2.inSampleSize=ss;
        try(java.io.InputStream in=ctx.getContentResolver().openInputStream(u)){ b=BitmapFactory.decodeStream(in,null,o2); }
      }
      if(b==null) return null;
      int rot=0;
      if(!rotated){
        try(java.io.InputStream in=ctx.getContentResolver().openInputStream(u)){
          androidx.exifinterface.media.ExifInterface ex=new androidx.exifinterface.media.ExifInterface(in);
          int or=ex.getAttributeInt(androidx.exifinterface.media.ExifInterface.TAG_ORIENTATION,1);
          rot= or==6?90: or==3?180: or==8?270: 0;
        }catch(Throwable ignored){}
      }
      float k=Math.min(1f,(float)MAXS/Math.max(b.getWidth(),b.getHeight()));
      Bitmap out=b;
      if(k<1f || rot!=0){ Matrix m=new Matrix(); m.postScale(k,k); if(rot!=0) m.postRotate(rot); out=Bitmap.createBitmap(b,0,0,b.getWidth(),b.getHeight(),m,true); }
      return out;
  }
  /* ۱.۳.۳۷: عکس یا PDF که از برنامهٔ دیگر (بانک، گالری، …) با «اشتراک‌گذاری» به نرم‌افزار داده شده → پیوست یک ردیف.
     Uriها نگه داشته می‌شوند و با takeShared (در رشتهٔ افزونه، نه رشتهٔ اصلی) کوچک و JPEG می‌شوند؛ PDF = صفحهٔ اول به‌صورت عکس */
  private static final java.util.ArrayList<Uri> sharedUris=new java.util.ArrayList<>();
  private static final java.util.ArrayList<String> sharedTypes=new java.util.ArrayList<>();
  public static boolean captureShared(android.app.Activity act, Intent intent){
    try{
      if(intent==null) return false;
      String a=intent.getAction(), t=intent.getType();
      if(!(Intent.ACTION_SEND.equals(a) || Intent.ACTION_SEND_MULTIPLE.equals(a))) return false;
      java.util.ArrayList<Uri> us=new java.util.ArrayList<>();
      if(Intent.ACTION_SEND.equals(a)){ Object x=intent.getParcelableExtra(Intent.EXTRA_STREAM); if(x instanceof Uri) us.add((Uri)x); }
      else { java.util.ArrayList<android.os.Parcelable> l=intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM); if(l!=null) for(android.os.Parcelable q: l) if(q instanceof Uri) us.add((Uri)q); }
      if(us.isEmpty()) return false;
      android.content.ContentResolver cr=act.getContentResolver();
      boolean any=false;
      synchronized(sharedUris){
        for(Uri u: us){
          if(sharedUris.size()>=10) break;
          String mt=null; try{ mt=cr.getType(u); }catch(Exception ignored){}
          if(mt==null) mt=t;
          if(mt==null) continue;
          if(mt.startsWith("image/") || mt.equals("application/pdf")){ sharedUris.add(u); sharedTypes.add(mt); any=true; }
        }
      }
      if(any){ intent.setAction(Intent.ACTION_MAIN); intent.removeExtra(Intent.EXTRA_STREAM); }
      return any;
    }catch(Exception e){ return false; }
  }
  private Bitmap renderPdfFirstPage(Uri u) throws Exception {
    android.os.ParcelFileDescriptor pfd=getContext().getContentResolver().openFileDescriptor(u,"r");
    if(pfd==null) return null;
    try(android.graphics.pdf.PdfRenderer r=new android.graphics.pdf.PdfRenderer(pfd)){
      if(r.getPageCount()<1) return null;
      try(android.graphics.pdf.PdfRenderer.Page pg=r.openPage(0)){
        int w=pg.getWidth(), h=pg.getHeight(); float k=1600f/Math.max(1,Math.max(w,h));
        Bitmap b=Bitmap.createBitmap(Math.max(1,Math.round(w*k)),Math.max(1,Math.round(h*k)),Bitmap.Config.ARGB_8888);
        b.eraseColor(android.graphics.Color.WHITE);
        pg.render(b,null,null,android.graphics.pdf.PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
        return b;
      }
    }
  }
  @com.getcapacitor.PluginMethod public void takeShared(PluginCall call){
    java.util.ArrayList<Uri> us; java.util.ArrayList<String> ts;
    synchronized(sharedUris){ us=new java.util.ArrayList<>(sharedUris); ts=new java.util.ArrayList<>(sharedTypes); sharedUris.clear(); sharedTypes.clear(); }
    com.getcapacitor.JSArray arr=new com.getcapacitor.JSArray();
    int failed=0;
    for(int i=0;i<us.size();i++){
      try{
        boolean pdf="application/pdf".equals(ts.get(i));
        Bitmap b=pdf? renderPdfFirstPage(us.get(i)) : decodeScaled(getContext(),us.get(i),1600);
        if(b==null){ failed++; continue; }
        ByteArrayOutputStream bo=new ByteArrayOutputStream();
        b.compress(Bitmap.CompressFormat.JPEG,82,bo);
        arr.put(new JSObject().put("data",Base64.encodeToString(bo.toByteArray(),Base64.NO_WRAP)).put("mime","image/jpeg").put("pdf",pdf));
      }catch(Throwable e){ failed++; }
    }
    call.resolve(new JSObject().put("items",arr).put("failed",failed));
  }
  /* انتخاب از گالری با انتخابگر خود اندروید: HEIC و عکس‌های خیلی بزرگ هم اینجا خوانده می‌شوند
     (ImageDecoder از اندروید ۹ با کوچک‌کردن هنگام خواندن و چرخش EXIF؛ پیش از آن BitmapFactory با inSampleSize + EXIF)؛ خروجی JPEG کوچک‌شده */
  @com.getcapacitor.PluginMethod public void pickImage(PluginCall call){
    try{
      Intent i=new Intent(Intent.ACTION_GET_CONTENT); i.setType("image/*"); i.addCategory(Intent.CATEGORY_OPENABLE);
      startActivityForResult(call,i,"pickCb");
    }catch(Exception e){ call.reject("picker_failed",e); }
  }
  @ActivityCallback private void pickCb(PluginCall call, ActivityResult result){
    if(call==null) return;
    try{
      Intent d=result.getData(); Uri u=d==null?null:d.getData();
      if(result.getResultCode()!=android.app.Activity.RESULT_OK || u==null){ call.reject("cancelled"); return; }
      Bitmap out=decodeScaled(getContext(),u,1600);
      if(out==null){ call.reject("decode_failed"); return; }
      ByteArrayOutputStream bo=new ByteArrayOutputStream();
      out.compress(Bitmap.CompressFormat.JPEG,82,bo);
      call.resolve(new JSObject().put("data",Base64.encodeToString(bo.toByteArray(),Base64.NO_WRAP)).put("mime","image/jpeg"));
    }catch(Throwable e){ call.reject("pick_failed",e instanceof Exception?(Exception)e:new Exception(e)); }
  }
}
`;

const main=`package ${pkg};

import android.Manifest;
import android.os.Build;
import android.os.Bundle;
import android.content.pm.PackageManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override public void onCreate(Bundle savedInstanceState){
    registerPlugin(BankSmsPlugin.class);
    registerPlugin(NativeFileExportPlugin.class);
    registerPlugin(AppLockPlugin.class);
    registerPlugin(AppChromePlugin.class);
    registerPlugin(HkRemindersPlugin.class);
    registerPlugin(HkSpeechPlugin.class);
    registerPlugin(HkUpdaterPlugin.class);
    registerPlugin(HkWidgetPlugin.class);
    registerPlugin(HkMediaPlugin.class);
    super.onCreate(savedInstanceState);
    try{ HkMediaPlugin.captureShared(this,getIntent()); }catch(Exception ignored){}
    try{ NativeFileExportPlugin.captureOpened(this,getIntent()); }catch(Exception ignored){}
    // پیش از بارگذاری صفحه: زمینهٔ تیرهٔ پیش‌فرض نرم‌افزار پشت نوارهای سیستم (جلوگیری از نوار سفید)
    try{ AppChromePlugin.apply(this, android.graphics.Color.parseColor("#1b1b1b"), false); }catch(Exception ignored){}
    java.util.ArrayList<String> needed=new java.util.ArrayList<>();
    if(Build.VERSION.SDK_INT>=23 && checkSelfPermission(Manifest.permission.RECEIVE_SMS)!=PackageManager.PERMISSION_GRANTED) needed.add(Manifest.permission.RECEIVE_SMS);
    if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) needed.add(Manifest.permission.POST_NOTIFICATIONS);
    if(!needed.isEmpty()) requestPermissions(needed.toArray(new String[0]),4201);
    try{ HkRemindersPlugin.saveTarget(this,getIntent()); }catch(Exception ignored){}
  }
  @Override public void onNewIntent(android.content.Intent intent){
    super.onNewIntent(intent);
    try{ HkRemindersPlugin.saveTarget(this,intent); }catch(Exception ignored){}
    try{ if(HkMediaPlugin.captureShared(this,intent) && getBridge()!=null) getBridge().triggerWindowJSEvent("hkShareAttach"); }catch(Exception ignored){}
    try{ if(NativeFileExportPlugin.captureOpened(this,intent) && getBridge()!=null) getBridge().triggerWindowJSEvent("hkFileOpened"); }catch(Exception ignored){}
  }
}
`;

fs.writeFileSync(path.join(javaDir,'BankSmsReceiver.java'),receiver);
fs.writeFileSync(path.join(javaDir,'BankSmsPlugin.java'),bankPlugin);
fs.writeFileSync(path.join(javaDir,'HkQuickReplyReceiver.java'),quickReply);
fs.writeFileSync(path.join(javaDir,'HkQuickActivity.java'),quickActivity);
fs.writeFileSync(path.join(javaDir,'HkCatActivity.java'),catActivity);
fs.writeFileSync(path.join(javaDir,'AppLockPlugin.java'),appLockPlugin);
fs.writeFileSync(path.join(javaDir,'NativeFileExportPlugin.java'),nativeExport);
fs.writeFileSync(path.join(javaDir,'MainActivity.java'),main);
fs.writeFileSync(path.join(javaDir,'AppChromePlugin.java'),appChrome);
fs.writeFileSync(path.join(javaDir,'HkRemindersPlugin.java'),hkReminders);
fs.writeFileSync(path.join(javaDir,'HkReminderReceiver.java'),hkReminderReceiver);
fs.writeFileSync(path.join(javaDir,'HkBootReceiver.java'),hkBootReceiver);
fs.writeFileSync(path.join(javaDir,'HkSpeechPlugin.java'),hkSpeech);
fs.writeFileSync(path.join(javaDir,'HkUpdaterPlugin.java'),hkUpdater);
fs.writeFileSync(path.join(javaDir,'HkWidgetProvider.java'),hkWidget);
fs.writeFileSync(path.join(javaDir,'HkWidgetPlugin.java'),hkWidgetPlugin);
fs.writeFileSync(path.join(javaDir,'HkWidgetDraw.java'),hkWidgetDraw);
fs.writeFileSync(path.join(javaDir,'HkWidgetSmallProvider.java'),hkWidgetSmall);
fs.writeFileSync(path.join(javaDir,'HkWidgetAccountsProvider.java'),hkWidgetAccounts);
fs.writeFileSync(path.join(javaDir,'HkWidgetListService.java'),hkWidgetList);
fs.writeFileSync(path.join(javaDir,'HkMediaPlugin.java'),hkMedia);

const gradle=path.join(base,'app/build.gradle');
if(fs.existsSync(gradle)){
  let s=fs.readFileSync(gradle,'utf8');
  if(!s.includes('androidx.core:core')) s=s.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.core:core:1.15.0"');
  if(!s.includes('androidx.biometric:biometric')) s=s.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.biometric:biometric:1.1.0"');
  if(!s.includes('androidx.exifinterface:exifinterface')) s=s.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.exifinterface:exifinterface:1.3.7"');
  fs.writeFileSync(gradle,s);
}
const manifest=path.join(base,'app/src/main/AndroidManifest.xml');
if(fs.existsSync(manifest)){
  let s=fs.readFileSync(manifest,'utf8');
  if(!s.includes('android.permission.RECEIVE_SMS')){
    s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.RECEIVE_SMS"/>\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>');
  }
  const receiverTag='<receiver android:name=".BankSmsReceiver" android:exported="true" android:permission="android.permission.BROADCAST_SMS">\n            <intent-filter android:priority="999">\n                <action android:name="android.provider.Telephony.SMS_RECEIVED"/>\n            </intent-filter>\n        </receiver>';
  if(!s.includes('.BankSmsReceiver')) s=s.replace('</application>', receiverTag+'\n    </application>');
  // ۱.۳.۴۳: گیرندهٔ «ثبت» از خود اعلان (فقط از PendingIntent همین برنامه؛ از بیرون قابل صدا زدن نیست)
  if(!s.includes('.HkQuickReplyReceiver')) s=s.replace('</application>', '        <receiver android:name=".HkQuickReplyReceiver" android:exported="false"/>\n    </application>');
  // ۱.۳.۴۴: باکس شناور ثبت (حباب اعلان) — فقط از PendingIntent خود برنامه باز می‌شود
  if(!s.includes('.HkCatActivity')) s=s.replace('</application>', '        <activity android:name=".HkCatActivity" android:exported="false" android:excludeFromRecents="true" android:noHistory="true" android:taskAffinity="" android:theme="@android:style/Theme.Translucent.NoTitleBar"/>\n    </application>');
  if(!s.includes('.HkQuickActivity')) s=s.replace('</application>', '        <activity android:name=".HkQuickActivity" android:exported="false" android:allowEmbedded="true" android:resizeableActivity="true" android:documentLaunchMode="always" android:excludeFromRecents="true" android:theme="@android:style/Theme.DeviceDefault.Dialog.NoActionBar" android:windowSoftInputMode="stateVisible|adjustResize"/>\n    </application>');
  if(!s.includes('android.permission.RECORD_AUDIO')) s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.RECORD_AUDIO"/>');
  // ضبط صدا داخل صفحه (getUserMedia) بدون این مجوز بی‌صدا رد می‌شود
  if(!s.includes('android.permission.MODIFY_AUDIO_SETTINGS')) s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>');
  // اندروید ۱۱+: پیدا کردن برنامهٔ دوربین برای «گرفتن عکس»
  if(!s.includes('android.media.action.IMAGE_CAPTURE')) s=s.replace('</manifest>', '    <queries>\n        <intent>\n            <action android:name="android.media.action.IMAGE_CAPTURE"/>\n        </intent>\n    </queries>\n</manifest>');
  // باز کردن فایل پشتیبان با زدن رویش (Downloads / اشتراک‌گذاری)
  if(!s.includes('hk-open-backup')){
    const openFilters =
      '            <!-- hk-open-backup -->\n' +
      '            <intent-filter>\n' +
      '                <action android:name="android.intent.action.VIEW"/>\n' +
      '                <category android:name="android.intent.category.DEFAULT"/>\n' +
      '                <category android:name="android.intent.category.BROWSABLE"/>\n' +
      '                <data android:scheme="content"/>\n' +
      '                <data android:scheme="file"/>\n' +
      '                <data android:mimeType="application/json"/>\n' +
      '                <data android:mimeType="application/octet-stream"/>\n' +
      '            </intent-filter>\n' +
      '            <intent-filter>\n' +
      '                <action android:name="android.intent.action.SEND"/>\n' +
      '                <category android:name="android.intent.category.DEFAULT"/>\n' +
      '                <data android:mimeType="application/json"/>\n' +
      '                <data android:mimeType="application/octet-stream"/>\n' +
      '            </intent-filter>\n';
    s=s.replace(/(<activity\b[^>]*android:name="[.\w]*MainActivity"[\s\S]*?)(<\/activity>)/, function(m0,a,b){ return a+openFilters+'        '+b; });
  }
  // ۱.۳.۳۷: اشتراک‌گذاری عکس/PDF از برنامه‌های دیگر (رسید بانک، گالری) → پیوست ردیف
  if(!s.includes('hk-share-attach')){
    const shareFilter =
      '            <!-- hk-share-attach -->\n' +
      '            <intent-filter>\n' +
      '                <action android:name="android.intent.action.SEND"/>\n' +
      '                <action android:name="android.intent.action.SEND_MULTIPLE"/>\n' +
      '                <category android:name="android.intent.category.DEFAULT"/>\n' +
      '                <data android:mimeType="image/*"/>\n' +
      '                <data android:mimeType="application/pdf"/>\n' +
      '            </intent-filter>\n';
    s=s.replace(/(<activity\b[^>]*android:name="[.\w]*MainActivity"[\s\S]*?)(<\/activity>)/, function(m0,a,b){ return a+shareFilter+'        '+b; });
  }
  // ثبت گروهی پیامک‌ها: خواندن صندوق ورودی (فقط با اجازهٔ کاربر، از منوی «ثبت دستی پیامک»)
  if(!s.includes('android.permission.READ_SMS')) s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.READ_SMS"/>');
  // اندروید ۱۱+: برای پیدا کردن سرویس تشخیص گفتار باید اعلام شود
  if(!s.includes('android.speech.RecognitionService')) s=s.replace('</manifest>', '    <queries>\n        <intent>\n            <action android:name="android.speech.RecognitionService"/>\n        </intent>\n    </queries>\n</manifest>');
  // بروزرسانی داخل نرم‌افزار: باز کردن نصب‌کنندهٔ اندروید برای APK دانلودشده
  if(!s.includes('android.permission.REQUEST_INSTALL_PACKAGES')) s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES"/>');
  if(!s.includes('android.permission.RECEIVE_BOOT_COMPLETED')) s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED"/>');
  if(!s.includes('.HkReminderReceiver')) s=s.replace('</application>', '        <receiver android:name=".HkReminderReceiver" android:exported="false"/>\n    </application>');
  if(!s.includes('.HkBootReceiver')) s=s.replace('</application>',
    '        <receiver android:name=".HkBootReceiver" android:exported="true">\n' +
    '            <intent-filter>\n' +
    '                <action android:name="android.intent.action.BOOT_COMPLETED"/>\n' +
    '                <action android:name="android.intent.action.MY_PACKAGE_REPLACED"/>\n' +
    '                <action android:name="android.intent.action.QUICKBOOT_POWERON"/>\n' +
    '            </intent-filter>\n' +
    '        </receiver>\n    </application>');
  // ویجت صفحهٔ اصلی گوشی
  if(!s.includes('.HkWidgetProvider')) s=s.replace('</application>',
    '        <receiver android:name=".HkWidgetProvider" android:exported="true" android:label="حساب‌کتاب">\n' +
    '            <intent-filter>\n' +
    '                <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>\n' +
    '            </intent-filter>\n' +
    '            <meta-data android:name="android.appwidget.provider" android:resource="@xml/hk_widget_info"/>\n' +
    '        </receiver>\n    </application>');
  // ویجت یک‌خطی (با اسکرول عمودی) و سرویس فهرست آن
  if(!s.includes('.HkWidgetSmallProvider')) s=s.replace('</application>',
    '        <receiver android:name=".HkWidgetSmallProvider" android:exported="true" android:label="حساب‌کتاب (یک‌خطی)">\n' +
    '            <intent-filter>\n' +
    '                <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>\n' +
    '            </intent-filter>\n' +
    '            <meta-data android:name="android.appwidget.provider" android:resource="@xml/hk_widget_small_info"/>\n' +
    '        </receiver>\n    </application>');
  // ویجت حساب‌ها (موجودی هر کارت + خرج امروز)
  if(!s.includes('.HkWidgetAccountsProvider')) s=s.replace('</application>',
    '        <receiver android:name=".HkWidgetAccountsProvider" android:exported="true" android:label="حساب‌کتاب (حساب‌ها)">\n' +
    '            <intent-filter>\n' +
    '                <action android:name="android.appwidget.action.APPWIDGET_UPDATE"/>\n' +
    '            </intent-filter>\n' +
    '            <meta-data android:name="android.appwidget.provider" android:resource="@xml/hk_widget_accounts_info"/>\n' +
    '        </receiver>\n    </application>');
  if(!s.includes('.HkWidgetListService')) s=s.replace('</application>',
    '        <service android:name=".HkWidgetListService" android:permission="android.permission.BIND_REMOTEVIEWS" android:exported="false"/>\n    </application>');
  // FileProvider for Sharesheet
  if(!s.includes('.fileprovider')){
    const providerTag =
      '        <provider\n' +
      '            android:name="androidx.core.content.FileProvider"\n' +
      '            android:authorities="${applicationId}.fileprovider"\n' +
      '            android:exported="false"\n' +
      '            android:grantUriPermissions="true">\n' +
      '            <meta-data\n' +
      '                android:name="android.support.FILE_PROVIDER_PATHS"\n' +
      '                android:resource="@xml/file_paths" />\n' +
      '        </provider>';
    s=s.replace('</application>', providerTag+'\n    </application>');
  }
  fs.writeFileSync(manifest,s);
}

// res/xml/file_paths.xml for FileProvider
const xmlDir=path.join(base,'app/src/main/res/xml');
fs.mkdirSync(xmlDir,{recursive:true});
const filePaths=path.join(xmlDir,'file_paths.xml');
// امنیت: FileProvider فقط پوشهٔ موقت اشتراک‌گذاری را در اختیار دیگر برنامه‌ها می‌گذارد (نه کل حافظهٔ نرم‌افزار/حافظهٔ خارجی)
fs.writeFileSync(filePaths,
`<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <cache-path name="share_cache" path="share/" />
    <cache-path name="updates" path="updates/" />
    <cache-path name="capture" path="capture/" />
</paths>
`);

// منابع ویجت (چیدمان، پس‌زمینه، مشخصات)
const resDir=path.join(base,'app/src/main/res');
fs.mkdirSync(path.join(resDir,'layout'),{recursive:true});
fs.mkdirSync(path.join(resDir,'drawable'),{recursive:true});
// ۱.۳.۴۶: چیدمان اختصاصی اعلان تراکنش (راست‌چین)
for(const [fn,lines] of [['hk_sms_small.xml',2],['hk_sms_big.xml',14]]){
  fs.writeFileSync(path.join(resDir,'layout',fn),
`<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:layoutDirection="rtl">
    <TextView
        android:id="@+id/hk_sms_title"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textAppearance="@style/TextAppearance.Compat.Notification.Title"
        android:textStyle="bold"
        android:gravity="start"
        android:textDirection="rtl"
        android:textAlignment="viewStart"
        android:maxLines="1"
        android:ellipsize="end"/>
    <TextView
        android:id="@+id/hk_sms_text"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="1dp"
        android:textAppearance="@style/TextAppearance.Compat.Notification"
        android:gravity="start"
        android:textDirection="rtl"
        android:textAlignment="viewStart"
        android:lineSpacingMultiplier="1.1"
        android:maxLines="${lines}"
        android:ellipsize="end"/>
</LinearLayout>
`);
}
// ۱.۳.۴۵: چیدمان پیام «ثبت شد» بعد از ثبت سریع/باکس شناور
// ۱.۳.۵۰: اعلان اختصاصی پیامک با دکمه‌های دسته
fs.writeFileSync(path.join(resDir,'layout','hk_tx.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:layoutDirection="rtl">
    <TextView
        android:id="@+id/hk_tx_text"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textAppearance="@style/TextAppearance.Compat.Notification"
        android:gravity="start"
        android:textDirection="rtl"
        android:maxLines="6"
        android:ellipsize="end"/>
    <LinearLayout
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:layout_marginTop="8dp"
        android:orientation="horizontal"
        android:layoutDirection="rtl">
        <TextView android:id="@+id/hk_c0" style="@style/HkChip"/>
        <TextView android:id="@+id/hk_c1" style="@style/HkChip"/>
        <TextView android:id="@+id/hk_c2" style="@style/HkChip"/>
        <TextView android:id="@+id/hk_c3" style="@style/HkChip"/>
    </LinearLayout>
</LinearLayout>
`);
fs.writeFileSync(path.join(resDir,'drawable','hk_chip_bg.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#26888888"/>
    <corners android:radius="14dp"/>
</shape>
`);
fs.mkdirSync(path.join(resDir,'values'),{recursive:true});
fs.writeFileSync(path.join(resDir,'values','hk_chip.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<resources>
    <style name="HkChip">
        <item name="android:layout_width">0dp</item>
        <item name="android:layout_height">32dp</item>
        <item name="android:layout_weight">1</item>
        <item name="android:layout_marginStart">3dp</item>
        <item name="android:layout_marginEnd">3dp</item>
        <item name="android:gravity">center</item>
        <item name="android:background">@drawable/hk_chip_bg</item>
        <item name="android:textSize">12.5sp</item>
        <item name="android:maxLines">1</item>
        <item name="android:ellipsize">end</item>
        <item name="android:textAppearance">@style/TextAppearance.Compat.Notification</item>
    </style>
</resources>
`);
fs.writeFileSync(path.join(resDir,'layout','hk_done.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:orientation="vertical"
    android:layoutDirection="rtl"
    android:paddingBottom="4dp">
    <TextView
        android:id="@+id/hk_done_desc"
        android:layout_width="match_parent"
        android:layout_height="wrap_content"
        android:textAppearance="@style/TextAppearance.Compat.Notification.Info"
        android:textSize="12.5sp"
        android:gravity="start"
        android:textDirection="rtl"
        android:maxLines="2"
        android:ellipsize="end"/>
    <LinearLayout
        android:layout_width="wrap_content"
        android:layout_height="wrap_content"
        android:layout_marginTop="2dp"
        android:orientation="horizontal"
        android:gravity="center_vertical"
        android:layoutDirection="rtl">
        <TextView
            android:id="@+id/hk_done_ok"
            android:layout_width="wrap_content"
            android:layout_height="wrap_content"
            android:text="ثبت شد"
            android:textSize="18sp"
            android:textStyle="bold"
            android:textColor="#30D158"/>
        <ImageView
            android:id="@+id/hk_done_tick"
            android:layout_width="22dp"
            android:layout_height="22dp"
            android:layout_marginStart="6dp"/>
    </LinearLayout>
</LinearLayout>
`);
fs.writeFileSync(path.join(resDir,'layout','hk_widget.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/hk_w_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/hk_widget_bg">
    <ImageView android:id="@+id/hk_w_img" android:layout_width="match_parent" android:layout_height="match_parent"
        android:scaleType="fitCenter" android:contentDescription="حساب‌کتاب"/>
</FrameLayout>
`);
fs.writeFileSync(path.join(resDir,'layout','hk_widget_small.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<FrameLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/hk_ws_root"
    android:layout_width="match_parent"
    android:layout_height="match_parent"
    android:background="@drawable/hk_widget_bg">
    <ListView android:id="@+id/hk_ws_list" android:layout_width="match_parent" android:layout_height="match_parent"
        android:divider="@null" android:dividerHeight="0dp" android:scrollbars="none" android:listSelector="@android:color/transparent" android:overScrollMode="never" android:fadingEdge="none"/>
</FrameLayout>
`);
fs.writeFileSync(path.join(resDir,'layout','hk_widget_item.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<ImageView xmlns:android="http://schemas.android.com/apk/res/android"
    android:id="@+id/hk_wi_img"
    android:layout_width="match_parent"
    android:layout_height="wrap_content"
    android:adjustViewBounds="true"
    android:scaleType="fitXY"
    android:contentDescription="حساب‌کتاب"/>
`);
// فونت وزیرمتن برای متن ویجت
fs.mkdirSync(path.join(resDir,'font'),{recursive:true});
['hk_vazir_regular.ttf','hk_vazir_bold.ttf'].forEach(function(f){
  fs.copyFileSync(path.join(root,'resources','widget-fonts',f), path.join(resDir,'font',f));
});
fs.writeFileSync(path.join(resDir,'drawable','hk_widget_bg.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#F21B1B1B"/>
    <corners android:radius="22dp"/>
    <stroke android:width="1dp" android:color="#22FFFFFF"/>
</shape>
`);
fs.writeFileSync(path.join(resDir,'drawable','hk_widget_bg_light.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android" android:shape="rectangle">
    <solid android:color="#F7FFFFFF"/>
    <corners android:radius="22dp"/>
    <stroke android:width="1dp" android:color="#1A000000"/>
</shape>
`);
fs.writeFileSync(path.join(xmlDir,'hk_widget_info.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:initialLayout="@layout/hk_widget"/>
`);
fs.writeFileSync(path.join(xmlDir,'hk_widget_small_info.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="40dp"
    android:targetCellWidth="3"
    android:targetCellHeight="1"
    android:updatePeriodMillis="0"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:initialLayout="@layout/hk_widget_small"/>
`);

fs.writeFileSync(path.join(xmlDir,'hk_widget_accounts_info.xml'),
`<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
    android:minWidth="180dp"
    android:minHeight="110dp"
    android:targetCellWidth="3"
    android:targetCellHeight="2"
    android:updatePeriodMillis="0"
    android:resizeMode="horizontal|vertical"
    android:widgetCategory="home_screen"
    android:initialLayout="@layout/hk_widget"/>
`);

console.log('Android SMS + Downloads/PDF + FileProvider Share bridge patched');
