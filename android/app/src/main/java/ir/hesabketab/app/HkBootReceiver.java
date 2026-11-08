package ir.hesabketab.app;

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
