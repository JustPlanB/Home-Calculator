package ir.hesabketab.app;

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
      /* ۱.۳.۹۶: اگر پیش‌تر در «ثبت سریع» شرح نوشته شده، همان شرح می‌ماند و فقط دسته اضافه می‌شود */
      String prev=""; try{ JSONObject it0=findItem(c,cn); if(it0!=null) prev=it0.optString("quickDesc","").trim(); }catch(Exception ignored){}
      boolean catFirst=prev.isEmpty();
      if(!prev.isEmpty()) lab=prev;
      boolean ok=saveDesc(c,cn,lab);
      /* ۱.۳.۹۷: اول دسته، بعد شرح: دسته ثبت می‌شود و تا ۳۰ ثانیه می‌شود شرح هم نوشت (نرم‌افزار تا آن موقع صبر می‌کند) */
      if(ok){ try{ SharedPreferences sp=c.getSharedPreferences(BankSmsReceiver.PREFS,Context.MODE_PRIVATE); JSONArray q=new JSONArray(sp.getString(BankSmsReceiver.QUEUE,"[]")); for(int i=0;i<q.length();i++){ JSONObject x=q.optJSONObject(i); if(x!=null&&x.optInt("nid",0)==cn){ x.put("quickCat",cat); if(catFirst) x.put("quickWait",System.currentTimeMillis()); else x.remove("quickWait"); break; } } sp.edit().putString(BankSmsReceiver.QUEUE,q.toString()).commit(); }catch(Exception ignored){} }
      if(ok && catFirst){ BankSmsReceiver.postDescAfterCat(c,cn,lab); return; }
      notifyDone(c,cn,lab,ok);
      return;
    }
    if(!in.getAction().startsWith(BankSmsReceiver.ACTION_QUICK)) return;
    Bundle res=RemoteInput.getResultsFromIntent(in); if(res==null) return;
    CharSequence cs=res.getCharSequence(BankSmsReceiver.KEY_DESC);
    String desc=cs==null?"":cs.toString().trim(); if(desc.length()>200) desc=desc.substring(0,200);
    int nid=in.getIntExtra("nid",0); if(nid==0) return;
    /* ۱.۳.۹۷: شرحِ بعد از دسته: دسته سر جایش می‌ماند؛ شرح خالی = همان اسم دسته */
    if(in.getBooleanExtra("afterCat",false)){
      JSONObject it1=findItem(c,nid);
      String lab1=in.getStringExtra("label"); if(lab1==null) lab1="";
      if(desc.isEmpty()) desc=lab1;
      boolean f1=it1!=null && saveDesc(c,nid,desc);
      if(f1){ try{ SharedPreferences sp=c.getSharedPreferences(BankSmsReceiver.PREFS,Context.MODE_PRIVATE); JSONArray q=new JSONArray(sp.getString(BankSmsReceiver.QUEUE,"[]")); for(int i=0;i<q.length();i++){ JSONObject x=q.optJSONObject(i); if(x!=null&&x.optInt("nid",0)==nid){ x.remove("quickWait"); break; } } sp.edit().putString(BankSmsReceiver.QUEUE,q.toString()).commit(); }catch(Exception ignored){} }
      notifyDone(c,nid,desc,f1);
      return;
    }
    boolean found=saveDesc(c,nid,desc);
    /* ۱.۳.۹۶: بعد از نوشتن شرح، اعلان با «بابت: …» و دکمه‌های دسته (دسته اختیاری؛ زدنش شرح را پاک نمی‌کند) */
    if(found && !desc.isEmpty()){ BankSmsReceiver.postCatAfterDesc(c,nid,desc); return; }
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
        SpannableString ss=new SpannableString("ثبت شد") /* ۱.۳.۹۵: تیک فقط همان تیکِ کشیده‌شدهٔ نرم‌افزار (چیدمان اختصاصی پایین)، نه حرف ✔ */;
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
