package ir.hesabketab.app;

import android.Manifest;
import android.os.Build;
import android.os.Bundle;
import android.content.pm.PackageManager;
import android.view.MotionEvent;
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
  /* ۱.۴.۱۰: دکمهٔ کناری قلم (S Pen) یا سرِ پاک‌کن: WebView وضعیت دکمه را همیشه به صفحه نمی‌رساند (S24/S26 Ultra)؛
     وضعیتش از لمس و شناور شدنِ قلم خوانده و به صورت window.__hkPenBtn به صفحه داده می‌شود (پاک‌کنِ دست‌نویس) */
  private boolean hkPenBtn=false;
  private void hkPenTrack(MotionEvent ev){
    try{
      if(ev==null||ev.getPointerCount()<1) return;
      int tt=ev.getToolType(0);
      boolean stylus=(tt==MotionEvent.TOOL_TYPE_STYLUS||tt==MotionEvent.TOOL_TYPE_ERASER);
      int act=ev.getActionMasked();
      boolean end=(act==MotionEvent.ACTION_UP||act==MotionEvent.ACTION_CANCEL||act==MotionEvent.ACTION_HOVER_EXIT);
      boolean b=!end && stylus && (tt==MotionEvent.TOOL_TYPE_ERASER || (ev.getButtonState()&(MotionEvent.BUTTON_STYLUS_PRIMARY|MotionEvent.BUTTON_STYLUS_SECONDARY))!=0);
      if(b!=hkPenBtn){
        hkPenBtn=b;
        if(getBridge()!=null && getBridge().getWebView()!=null){
          getBridge().getWebView().evaluateJavascript("window.__hkPenBtn="+(b?"true":"false")+";",null);
        }
      }
    }catch(Exception ignored){}
  }
  @Override public boolean dispatchTouchEvent(MotionEvent ev){ hkPenTrack(ev); return super.dispatchTouchEvent(ev); }
  @Override public boolean dispatchGenericMotionEvent(MotionEvent ev){ hkPenTrack(ev); return super.dispatchGenericMotionEvent(ev); }
  @Override public void onNewIntent(android.content.Intent intent){
    super.onNewIntent(intent);
    try{ HkRemindersPlugin.saveTarget(this,intent); }catch(Exception ignored){}
    try{ if(HkMediaPlugin.captureShared(this,intent) && getBridge()!=null) getBridge().triggerWindowJSEvent("hkShareAttach"); }catch(Exception ignored){}
    try{ if(NativeFileExportPlugin.captureOpened(this,intent) && getBridge()!=null) getBridge().triggerWindowJSEvent("hkFileOpened"); }catch(Exception ignored){}
  }
}
