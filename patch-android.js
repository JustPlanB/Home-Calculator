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
    if (Build.VERSION.SDK_INT >= 23 && context.checkSelfPermission(Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) return;
    SmsMessage[] msgs = Telephony.Sms.Intents.getMessagesFromIntent(intent);
    if (msgs == null || msgs.length == 0) return;
    StringBuilder body=new StringBuilder(); String sender=msgs[0].getOriginatingAddress();
    long ts=msgs[0].getTimestampMillis();
    for(SmsMessage m:msgs) if(m!=null && m.getMessageBody()!=null) body.append(m.getMessageBody()).append("\\n");
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
      JSONObject item=new JSONObject(); item.put("text",text); item.put("sender",sender==null?"":sender); item.put("receivedAt",ts>0?ts:now);
      q.put(item);
      while(q.length()>20){ JSONArray nq=new JSONArray(); for(int i=1;i<q.length();i++) nq.put(q.get(i)); q=nq; }
      sp.edit().putString(QUEUE,q.toString()).apply();
      postNotification(context,text);
    }catch(Exception ignored){}
  }

  static String normFa(String s){
    if(s==null) return "";
    String r=s.toLowerCase(java.util.Locale.ROOT);
    return r.replace('\\u0643','\\u06a9').replace('\\u064a','\\u06cc').replace('\\u0649','\\u06cc');
  }

  static boolean looksLikeBankTransaction(String s, String sender){
    String t=normFa(s), sd=normFa(sender);
    boolean tx=t.contains("واریز")||t.contains("برداشت")||t.contains("کسر")||t.contains("خرید")||t.contains("انتقال")||t.contains("پرداخت")||t.contains("تراکنش")||t.contains("وجه")||t.contains("اعلامیه")||t.contains("رمز")||t.contains("deposit")||t.contains("withdraw")||t.contains("transfer")||t.contains("purchase")||t.contains("payment");
    boolean bankWord=t.contains("بانک")||t.contains("موجودی")||t.contains("مانده")||t.contains("کارت")||t.contains("حساب")||t.contains("atm")||t.contains("pos");
    boolean bankName=t.contains("ملی")||t.contains("ملت")||t.contains("سپه")||t.contains("صادرات")||t.contains("تجارت")||t.contains("کشاورزی")||t.contains("مسکن")||t.contains("رفاه")||t.contains("پارسیان")||t.contains("پاسارگاد")||t.contains("سامان")||t.contains("سینا")||t.contains("شهر")||t.contains("انصار")||t.contains("کارافرین")||t.contains("گردشگری")||t.contains("پستبانک")||t.contains("مهر")||t.contains("رسالت")||t.contains("mellat")||t.contains("melli")||t.contains("sepah")||t.contains("saderat")||t.contains("tejarat")||t.contains("keshavarzi")||t.contains("maskan")||t.contains("refah")||t.contains("parsian")||t.contains("pasargad")||t.contains("saman");
    boolean senderBank=sd.contains("بانک")||sd.contains("ملی")||sd.contains("ملت")||sd.contains("سپه")||sd.contains("صادرات")||sd.contains("تجارت")||sd.contains("کشاورزی")||sd.contains("مسکن")||sd.contains("رفاه")||sd.contains("پارسیان")||sd.contains("پاسارگاد")||sd.contains("سامان")||sd.contains("mellat")||sd.contains("melli")||sd.contains("sepah")||sd.contains("bank");
    boolean money=t.matches("(?s).*\\\\d[\\\\d,٬،. ]{2,}.*");
    return money && (tx || bankWord || bankName || senderBank);
  }

  static void postNotification(Context c,String text){
    if(Build.VERSION.SDK_INT>=33 && c.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) return;
    NotificationManager nm=(NotificationManager)c.getSystemService(Context.NOTIFICATION_SERVICE);
    if(Build.VERSION.SDK_INT>=26){ NotificationChannel ch=new NotificationChannel(CHANNEL,"تراکنش‌های بانکی",NotificationManager.IMPORTANCE_HIGH); nm.createNotificationChannel(ch); }
    Intent i=c.getPackageManager().getLaunchIntentForPackage(c.getPackageName()); if(i==null)return;
    i.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
    PendingIntent pi=PendingIntent.getActivity(c,1001,i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
    String shortText=text.replace('\\n',' '); if(shortText.length()>110) shortText=shortText.substring(0,110)+"…";
    NotificationCompat.Builder b=new NotificationCompat.Builder(c,CHANNEL).setSmallIcon(android.R.drawable.ic_dialog_info).setContentTitle("تراکنش بانکی جدید").setContentText(shortText).setStyle(new NotificationCompat.BigTextStyle().bigText(text)).setAutoCancel(true).setContentIntent(pi).setCategory(NotificationCompat.CATEGORY_MESSAGE).setPriority(NotificationCompat.PRIORITY_HIGH);
    nm.notify((int)(System.currentTimeMillis()&0x7fffffff),b.build());
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

@CapacitorPlugin(name="BankSms", permissions={@Permission(strings={Manifest.permission.RECEIVE_SMS},alias="sms")})
public class BankSmsPlugin extends Plugin {
  private static final String PREFS=BankSmsReceiver.PREFS, QUEUE=BankSmsReceiver.QUEUE;
  @com.getcapacitor.PluginMethod public void requestPermission(PluginCall call){
    if(getPermissionState("sms")==com.getcapacitor.PermissionState.GRANTED){ call.resolve(new JSObject().put("granted",true)); return; }
    requestPermissionForAlias("sms",call,"smsPerm");
  }
  @PermissionCallback private void smsPerm(PluginCall call){ call.resolve(new JSObject().put("granted",getPermissionState("sms")==com.getcapacitor.PermissionState.GRANTED)); }
  @com.getcapacitor.PluginMethod public void getPendingSms(PluginCall call){
    SharedPreferences sp=getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    try{ JSONArray q=new JSONArray(sp.getString(QUEUE,"[]")); if(q.length()==0){call.resolve(new JSObject().put("has",false));return;} JSONObject x=q.getJSONObject(0); JSObject r=new JSObject(); r.put("has",true); r.put("text",x.optString("text")); r.put("sender",x.optString("sender")); r.put("receivedAt",x.optLong("receivedAt")); call.resolve(r); }catch(Exception e){call.reject("pending_sms_error",e);}
  }
  @com.getcapacitor.PluginMethod public void markHandled(PluginCall call){
    SharedPreferences sp=getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    try{ JSONArray q=new JSONArray(sp.getString(QUEUE,"[]")); JSONArray n=new JSONArray(); for(int i=1;i<q.length();i++) n.put(q.get(i)); sp.edit().putString(QUEUE,n.toString()).apply(); call.resolve(); }catch(Exception e){call.reject("pending_sms_error",e);}
  }
  @com.getcapacitor.PluginMethod public void clearPending(PluginCall call){ getContext().getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().remove(QUEUE).apply(); call.resolve(); }
}
`;

const nativeExport=`package ${pkg};

import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.pdf.PdfDocument;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.util.Base64;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;

@CapacitorPlugin(name="NativeFileExport")
public class NativeFileExportPlugin extends Plugin {
  private Uri insertPending(String filename,String mimeType) throws Exception {
    ContentResolver cr=getContext().getContentResolver();
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
    if(Build.VERSION.SDK_INT>=29){ ContentValues v=new ContentValues(); v.put(MediaStore.Downloads.IS_PENDING,0); getContext().getContentResolver().update(u,v,null,null); }
  }

  @com.getcapacitor.PluginMethod public void saveBase64ToDownloads(PluginCall call){
    try{
      String filename=call.getString("filename","download.bin"); String mime=call.getString("mimeType","application/octet-stream"); String data=call.getString("data","");
      if(data==null||data.isEmpty()) throw new Exception("empty data");
      byte[] bytes=Base64.decode(data,Base64.DEFAULT); Uri u=insertPending(filename,mime);
      try(OutputStream out=getContext().getContentResolver().openOutputStream(u)){ if(out==null) throw new Exception("open output failed"); out.write(bytes); out.flush(); }
      finishPending(u); call.resolve(new JSObject().put("uri",u.toString()).put("filename",filename));
    }catch(Exception e){call.reject("save_download_failed",e);}
  }

  @com.getcapacitor.PluginMethod public void exportHtmlToPdf(final PluginCall call){
    final String html=call.getString("html",""); final String filename=call.getString("filename","hesab.pdf");
    if(html==null||html.isEmpty()){call.reject("empty_html");return;}
    getActivity().runOnUiThread(() -> {
      final WebView web=new WebView(getContext());
      web.setBackgroundColor(android.graphics.Color.WHITE);
      web.getSettings().setJavaScriptEnabled(true);
      web.getSettings().setDefaultTextEncodingName("UTF-8");
      web.setWebViewClient(new WebViewClient(){
        @Override public void onPageFinished(WebView view,String url){
          view.postDelayed(() -> createPdf(view,filename,call),500);
        }
      });
      web.loadDataWithBaseURL("https://hesabketab.local/",html,"text/html","UTF-8",null);
    });
  }

  private void createPdf(WebView web,String filename,PluginCall call){
    PdfDocument doc=null; Uri uri=null;
    try{
      int viewW=1120;
      web.measure(android.view.View.MeasureSpec.makeMeasureSpec(viewW,android.view.View.MeasureSpec.EXACTLY),android.view.View.MeasureSpec.makeMeasureSpec(0,android.view.View.MeasureSpec.UNSPECIFIED));
      int viewH=Math.max(web.getMeasuredHeight(),1);
      web.layout(0,0,viewW,viewH);
      final int pageW=842, pageH=595;
      float scale=(float)pageW/(float)viewW;
      int pageContentH=Math.max(1,(int)(pageH/scale));
      int pageCount=(int)Math.ceil((double)viewH/(double)pageContentH);
      doc=new PdfDocument();
      for(int i=0;i<pageCount;i++){
        PdfDocument.PageInfo info=new PdfDocument.PageInfo.Builder(pageW,pageH,i+1).create();
        PdfDocument.Page page=doc.startPage(info);
        android.graphics.Canvas c=page.getCanvas();
        c.drawColor(android.graphics.Color.WHITE);
        c.save(); c.scale(scale,scale); c.translate(0,-i*pageContentH); web.draw(c); c.restore();
        doc.finishPage(page);
      }
      uri=insertPending(filename,"application/pdf");
      try(OutputStream out=getContext().getContentResolver().openOutputStream(uri)){ if(out==null) throw new Exception("open output failed"); doc.writeTo(out); out.flush(); }
      finishPending(uri);
      call.resolve(new JSObject().put("uri",uri.toString()).put("filename",filename));
    }catch(Exception e){
      if(uri!=null) try{getContext().getContentResolver().delete(uri,null,null);}catch(Exception ignored){}
      call.reject("pdf_export_failed",e);
    }finally{ if(doc!=null) try{doc.close();}catch(Exception ignored){} web.destroy(); }
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
    super.onCreate(savedInstanceState);
    java.util.ArrayList<String> needed=new java.util.ArrayList<>();
    if(Build.VERSION.SDK_INT>=23 && checkSelfPermission(Manifest.permission.RECEIVE_SMS)!=PackageManager.PERMISSION_GRANTED) needed.add(Manifest.permission.RECEIVE_SMS);
    if(Build.VERSION.SDK_INT>=33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED) needed.add(Manifest.permission.POST_NOTIFICATIONS);
    if(!needed.isEmpty()) requestPermissions(needed.toArray(new String[0]),4201);
  }
}
`;

fs.writeFileSync(path.join(javaDir,'BankSmsReceiver.java'),receiver);
fs.writeFileSync(path.join(javaDir,'BankSmsPlugin.java'),bankPlugin);
fs.writeFileSync(path.join(javaDir,'NativeFileExportPlugin.java'),nativeExport);
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
  const receiverTag='<receiver android:name=".BankSmsReceiver" android:exported="true" android:permission="android.permission.BROADCAST_SMS">\n            <intent-filter android:priority="999">\n                <action android:name="android.provider.Telephony.SMS_RECEIVED"/>\n            </intent-filter>\n        </receiver>';
  if(!s.includes('.BankSmsReceiver')) s=s.replace('</application>', receiverTag+'\n    </application>');
  fs.writeFileSync(manifest,s);
}
console.log('Android SMS + native Downloads/PDF bridge patched');
