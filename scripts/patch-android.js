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
    // رد فوری OTP / رمز پویا / شناسه تأیید برداشت (حتی با مبلغ)
    if(t.contains("شناسه تایید") || t.contains("شناسه تأيید") || t.contains("شناسه تايید")
        || t.contains("شناسه تأیید") || t.contains("شناسه تاييد") || t.contains("شناسه تایید برداشت")
        || t.contains("رمز پویا") || t.contains("رمزپویا") || t.contains("رمز موقت")
        || t.contains("رمز لحظه") || t.contains("رمزلحظه") || t.contains("رمز دوم")
        || t.contains("کد تایید") || t.contains("کد تأیید") || t.contains("کد تاييد")
        || t.contains("otp") || t.contains("one-time") || t.contains("onetime")
        || (t.contains("محرمانه") && (t.contains("رمز") || t.contains("کد")))
        || (t.contains("هشدار") && t.contains("شناسه") && t.contains("برداشت"))) {
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
    // فقط پیامک‌های واقعی بانکی
    boolean strongTx = t.contains("واریز") || t.contains("برداشت") || t.contains("کسر از") || t.contains("کسر مبلغ")
        || t.contains("انتقال وجه") || t.contains("انتقال به") || t.contains("خرید از") || t.contains("پرداخت وجه");
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
    // سخت‌گیرانه‌تر
    if(strongTx && (hasBalance || bankHint || bankName || senderBank)) return true;
    if(weakTx && hasBalance && (bankHint || bankName || senderBank)) return true;
    if(senderBank && strongTx) return true;
    return false;
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
        root.addView(host,hp);

        final WebView web=new WebView(getContext());
        web.setBackgroundColor(android.graphics.Color.WHITE);
        // SOFTWARE: capture با web.draw قابل‌اعتمادتر از HARDWARE است
        web.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE,null);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDefaultTextEncodingName("UTF-8");
        web.getSettings().setLoadWithOverviewMode(false);
        web.getSettings().setUseWideViewPort(false);
        web.getSettings().setDomStorageEnabled(true);
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
  /** فقط وقتی صفحه گوشی واقعاً خاموش/قفل شده — مستقل از onPause تعویض اپ */
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
    // تعویض اپ → صفحه روشن → هیچ DEVICE_LOCK
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
      if (!(pin.length() == 4 || pin.length() == 6)) {
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
fs.writeFileSync(path.join(javaDir,'AppLockPlugin.java'),appLockPlugin);
fs.writeFileSync(path.join(javaDir,'NativeFileExportPlugin.java'),nativeExport);
fs.writeFileSync(path.join(javaDir,'MainActivity.java'),main);

const gradle=path.join(base,'app/build.gradle');
if(fs.existsSync(gradle)){
  let s=fs.readFileSync(gradle,'utf8');
  if(!s.includes('androidx.core:core')) s=s.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.core:core:1.15.0"');
  if(!s.includes('androidx.biometric:biometric')) s=s.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.biometric:biometric:1.1.0"');
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
if(!fs.existsSync(filePaths)){
  fs.writeFileSync(filePaths,
`<?xml version="1.0" encoding="utf-8"?>
<paths xmlns:android="http://schemas.android.com/apk/res/android">
    <cache-path name="share_cache" path="share/" />
    <cache-path name="cache_root" path="." />
    <files-path name="files_root" path="." />
    <external-files-path name="external_files" path="." />
</paths>
`);
}

console.log('Android SMS + Downloads/PDF + FileProvider Share bridge patched');
