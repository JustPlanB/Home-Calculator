package ir.hesabketab.app;

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
