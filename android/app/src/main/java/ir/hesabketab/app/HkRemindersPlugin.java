package ir.hesabketab.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import org.json.JSONArray;
import org.json.JSONObject;

@CapacitorPlugin(name="HkReminders")
public class HkRemindersPlugin extends Plugin {
  static final String PREFS="hk_reminders";
  static final String KEY="items";
  static final String ACTION="ir.hesabketab.app.USER_REMINDER";

  @com.getcapacitor.PluginMethod public void schedule(PluginCall call){
    try{
      JSArray arr=call.getArray("items");
      Context c=getContext();
      cancelAll(c);
      JSONArray keep=new JSONArray();
      long now=System.currentTimeMillis();
      if(arr!=null){
        for(int i=0;i<arr.length() && keep.length()<64;i++){
          JSONObject o=arr.optJSONObject(i);
          if(o==null) continue;
          long at=o.optLong("at",0);
          if(at<=now) continue;
          JSONObject x=new JSONObject();
          x.put("id",o.optInt("id",1000+i)); x.put("at",at);
          x.put("title",o.optString("title","یادآور")); x.put("body",o.optString("body",""));
          x.put("target",o.optString("target",""));
          keep.put(x);
        }
      }
      c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString(KEY,keep.toString()).apply();
      armAll(c);
      JSObject r=new JSObject(); r.put("scheduled",keep.length()); call.resolve(r);
    }catch(Exception e){ call.reject("reminder_schedule_failed",e); }
  }

  static JSONArray load(Context c){
    try{ return new JSONArray(c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).getString(KEY,"[]")); }catch(Exception e){ return new JSONArray(); }
  }
  static PendingIntent pending(Context c,JSONObject x){
    Intent i=new Intent(c,HkReminderReceiver.class);
    i.setAction(ACTION);
    i.putExtra("id",x.optInt("id")); i.putExtra("title",x.optString("title")); i.putExtra("body",x.optString("body")); i.putExtra("target",x.optString("target",""));
    return PendingIntent.getBroadcast(c,x.optInt("id"),i,PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
  }
  static void cancelAll(Context c){
    AlarmManager am=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
    if(am==null) return;
    JSONArray q=load(c);
    for(int i=0;i<q.length();i++){ JSONObject x=q.optJSONObject(i); if(x!=null){ try{ am.cancel(pending(c,x)); }catch(Exception ignored){} } }
  }
  static void armAll(Context c){
    AlarmManager am=(AlarmManager)c.getSystemService(Context.ALARM_SERVICE);
    if(am==null) return;
    JSONArray q=load(c);
    long now=System.currentTimeMillis();
    for(int i=0;i<q.length();i++){
      JSONObject x=q.optJSONObject(i);
      if(x==null) continue;
      long at=x.optLong("at",0);
      if(at<=now) continue;
      PendingIntent pi=pending(c,x);
      try{
        boolean exact=Build.VERSION.SDK_INT<31 || am.canScheduleExactAlarms();
        if(exact && Build.VERSION.SDK_INT>=23) am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
        else if(Build.VERSION.SDK_INT>=23) am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,at,pi);
        else am.set(AlarmManager.RTC_WAKEUP,at,pi);
      }catch(Exception e){
        try{ am.set(AlarmManager.RTC_WAKEUP,at,pi); }catch(Exception ignored){}
      }
    }
  }
  /** لمس نوتیف (قسط/یادآور) → نرم‌افزار باز شود و همان منو نشان داده شود */
  static final String LAUNCH_PREFS="hk_launch";
  static void saveTarget(Context c, Intent in){
    try{
      if(in==null) return;
      String t=in.getStringExtra("hk_target");
      if(t==null || t.isEmpty()) return;
      c.getSharedPreferences(LAUNCH_PREFS,Context.MODE_PRIVATE).edit().putString("target",t).putLong("at",System.currentTimeMillis()).apply();
      in.removeExtra("hk_target");
    }catch(Exception ignored){}
  }
  @com.getcapacitor.PluginMethod public void takeLaunchTarget(PluginCall call){
    try{
      SharedPreferences sp=getContext().getSharedPreferences(LAUNCH_PREFS,Context.MODE_PRIVATE);
      String t=sp.getString("target",""); long at=sp.getLong("at",0);
      sp.edit().remove("target").remove("at").apply();
      if(System.currentTimeMillis()-at>10*60*1000L) t="";
      call.resolve(new JSObject().put("target",t));
    }catch(Exception e){ call.resolve(new JSObject().put("target","")); }
  }
  static void forget(Context c,int id){
    try{
      JSONArray q=load(c), n=new JSONArray();
      for(int i=0;i<q.length();i++){ JSONObject x=q.optJSONObject(i); if(x!=null && x.optInt("id")!=id) n.put(x); }
      c.getSharedPreferences(PREFS,Context.MODE_PRIVATE).edit().putString(KEY,n.toString()).apply();
    }catch(Exception ignored){}
  }
}
