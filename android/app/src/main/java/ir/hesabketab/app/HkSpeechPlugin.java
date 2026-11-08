package ir.hesabketab.app;

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
