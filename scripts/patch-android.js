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
import androidx.core.app.NotificationCompat;
import org.json.JSONArray;
import org.json.JSONObject;

public class BankSmsReceiver extends BroadcastReceiver {
  static final String PREFS="bank_sms_bridge";
  static final String QUEUE="pending_queue";
  static final String CHANNEL="bank_sms";

  @Override public void onReceive(Context context, Intent intent) {
    if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) return;
    if (context.checkSelfPermission(Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) return;
    SmsMessage[] msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent);
    if (msgs == null || msgs.length == 0) return;
    StringBuilder body=new StringBuilder(); String sender=msgs[0].getOriginatingAddress();
    long ts=msgs[0].getTimestampMillis();
    for(SmsMessage m:msgs) if(m!=null && m.getMessageBody()!=null) body.append(m.getMessageBody()).append("\\n");
    String text=body.toString().trim();
    if(!looksLikeBankTransaction(text)) return;
    SharedPreferences sp=context.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    try{
      JSONArray q=new JSONArray(sp.getString(QUEUE,"[]"));
      long now=System.currentTimeMillis();
      for(int i=0;i<q.length();i++){
        JSONObject x=q.optJSONObject(i);
        if(x!=null && text.equals(x.optString("text")) && now-x.optLong("receivedAt",0)<60000) return;
      }
      JSONObject item=new JSONObject(); item.put("text",text); item.put("sender",sender==null?"":sender); item.put("receivedAt",ts>0?ts:now);
      q.put(item);
      while(q.length()>20){ JSONArray nq=new JSONArray(); for(int i=1;i<q.length();i++) nq.put(q.get(i)); q=nq; }
      sp.edit().putString(QUEUE,q.toString()).apply();
      postNotification(context,text);
    }catch(Exception ignored){}
  }

  static boolean looksLikeBankTransaction(String s){
    String t=s.toLowerCase(java.util.Locale.ROOT);
    boolean tx=t.contains("واریز")||t.contains("برداشت")||t.contains("کسر")||t.contains("خرید")||t.contains("انتقال")||t.contains("پرداخت")||t.contains("deposit")||t.contains("withdraw");
    boolean money=t.matches("(?s).*\\\\d[\\\\d,٬،. ]{2,}.*");
    boolean bank=t.contains("بانک")||t.contains("موجودی")||t.contains("مانده")||t.contains("کارت")||t.contains("حساب")||t.contains("atm")||t.contains("pos")||t.contains("mellat")||t.contains("melli")||t.contains("tejarat")||t.contains("saderat");
    return tx && money && bank;
  }

  static void postNotification(Context c,String text){
    if(Build.VERSION.SDK_INT>=33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) return;
    NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
    if(Build.VERSION.SDK_INT>=26){ NotificationChannel ch=new NotificationChannel(CHANNEL,"تراکنش‌های بانکی",NotificationManager.IMPORTANCE_HIGH); nm.createNotificationChannel(ch); }
    Intent i=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName());
    if(i==null)return; i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent pi=PendingIntent.getActivity(c,1001,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    String shortText=text.replace('\\n',' '); if(shortText.length()>110) shortText=shortText.substring(0,110)+"…";
    NotificationCompat.Builder b=new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(c.getApplicationInfo().icon).setContentTitle("تراکنش بانکی جدید").setContentText(shortText).setStyle(new NotificationCompat.BigTextStyle().bigText(text)).setAutoCancel(true).setContentIntent(pi).setPriority(NotificationCompat.PRIORITY_HIGH);
    nm.notify((int)(System.currentTimeMillis()&0x7fffffff),b.build());
  }
}
`;
const plugin=`package ${pkg};

import android.Manifest;
import android.app.Activity;
import android.content.Context;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import androidx.activity.result.ActivityResultLauncher;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name="BankSms", permissions={@Permission(strings={Manifest.permission.RECEIVE_SMS},alias="sms")})
public class BankSmsPlugin extends Plugin {
  private static final String PREFS=BankSmsReceiver.PREFS;
  private static final String QUEUE=BankSmsReceiver.QUEUE;

  @com.getcapacitor.PluginMethod public void requestPermission(PluginCall call){
    if(getPermissionState("sms")==com.getcapacitor.PermissionState.GRANTED){ JSObject r=new JSObject(); r.put("granted",true); call.resolve(r); return; }
    requestPermissionForAlias("sms",call,"smsPerm");
  }
  @PermissionCallback private void smsPerm(PluginCall call){ JSObject r=new JSObject(); r.put("granted",getPermissionState("sms")==com.getcapacitor.PermissionState.GRANTED); call.resolve(r); }

  @com.getcapacitor.PluginMethod public void getPendingSms(PluginCall call){
    SharedPreferences sp=getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    try{
      JSONArray q=new JSONArray(sp.getString(QUEUE,"[]"));
      if(q.length()==0){call.resolve(new JSObject().put("has",false));return;}
      JSONObject x=q.getJSONObject(0); JSObject r=new JSObject(); r.put("has",true); r.put("text",x.optString("text")); r.put("sender",x.optString("sender")); r.put("receivedAt",x.optLong("receivedAt")); call.resolve(r);
    }catch(Exception e){call.reject("pending_sms_error",e);}
  }
  @com.getcapacitor.PluginMethod public void markHandled(PluginCall call){
    SharedPreferences sp=getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    try{ JSONArray q=new JSONArray(sp.getString(QUEUE,"[]")); JSONArray n=new JSONArray(); for(int i=1;i<q.length();i++) n.put(q.get(i)); sp.edit().putString(QUEUE,n.toString()).apply(); call.resolve(); }catch(Exception e){call.reject("pending_sms_error",e);}
  }
  @com.getcapacitor.PluginMethod public void clearPending(PluginCall call){ getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().remove(QUEUE).apply(); call.resolve(); }
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
    super.onCreate(savedInstanceState);
    if(Build.VERSION.SDK_INT>=23 && checkSelfPermission(Manifest.permission.RECEIVE_SMS)!=PackageManager.PERMISSION_GRANTED) requestPermissions(new String[]{Manifest.permission.RECEIVE_SMS},4201);
    if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS},4202);
  }
}
`;
fs.writeFileSync(path.join(javaDir,'BankSmsReceiver.java'),receiver);
fs.writeFileSync(path.join(javaDir,'BankSmsPlugin.java'),plugin);
fs.writeFileSync(path.join(javaDir,'MainActivity.java'),main);
const gradle=path.join(base,'app/build.gradle');
if(fs.existsSync(gradle)){
 let s=fs.readFileSync(gradle,'utf8');
 if(!s.includes('androidx.core:core')) s=s.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.core:core:1.15.0"');
 fs.writeFileSync(gradle,s);
}
const manifest=path.join(base,'app/src/main/AndroidManifest.xml');
if(fs.existsSync(manifest)){
 let s=fs.readFileSync(manifest,'utf8');
 if(!s.includes('android.permission.RECEIVE_SMS')){
   s=s.replace(/(<manifest\b[^>]*>)/, '$1\n    <uses-permission android:name="android.permission.RECEIVE_SMS"/>\n    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>');
 }
 const receiverTag='<receiver android:name=".BankSmsReceiver" android:exported="false">\n            <intent-filter>\n                <action android:name="android.provider.Telephony.SMS_RECEIVED"/>\n            </intent-filter>\n        </receiver>';
 if(!s.includes('.BankSmsReceiver')) s=s.replace('</application>', receiverTag+'\n    </application>');
 fs.writeFileSync(manifest,s);
}
console.log('Android SMS bridge patched');
