package ir.hesabketab.app;

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
      .putString("hk_nacc4",call.getString("acc4","[]")).putString("hk_nrec",call.getString("rec","[]"))
      .putString("hk_npersonal",call.getString("personal","1")).putString("hk_nblock",call.getString("block","[]")).putString("hk_nblocks",call.getString("blockS","[]")).apply();
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
