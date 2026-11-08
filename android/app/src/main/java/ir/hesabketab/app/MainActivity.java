package ir.hesabketab.app;

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
