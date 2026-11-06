package ir.hesabketab.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="HkWidget")
public class HkWidgetPlugin extends Plugin {
  @com.getcapacitor.PluginMethod public void update(PluginCall call){
    try{
      SharedPreferences.Editor e=getContext().getSharedPreferences(HkWidgetProvider.PREFS, Context.MODE_PRIVATE).edit();
      e.putString("title", call.getString("title","حساب‌کتاب"));
      e.putString("month", call.getString("month", call.getString("title","")));
      e.putBoolean("todayNone", Boolean.TRUE.equals(call.getBoolean("todayNone",false)));
      e.putString("balance", call.getString("balance","—"));
      e.putString("today", call.getString("today","—"));
      e.putBoolean("neg", Boolean.TRUE.equals(call.getBoolean("negative",false)));
      e.putBoolean("locked", Boolean.TRUE.equals(call.getBoolean("locked",false)));
      e.putBoolean("light", Boolean.TRUE.equals(call.getBoolean("light",false)));
      e.putString("accounts", call.getString("accounts","[]"));
      e.putString("dayKey", call.getString("dayKey",""));
      /* ۱.۳.۷۸: ردیف‌های ویجت مخارج / درآمدها */
      e.putString("tx_exp", call.getString("txExp","[]"));
      e.putString("tx_inc", call.getString("txInc","[]"));
      /* ۱.۳.۵۶: مبلغ‌های خام برای به‌روزرسانی ویجت در لحظهٔ رسیدن پیامک */
      try{ org.json.JSONObject dj=call.getData(); if(dj.has("balRaw")){ e.putLong("balRaw", dj.optLong("balRaw",0)); e.putLong("todayRaw", dj.optLong("todayRaw",0)); e.putString("acc4Map", dj.optString("acc4Map","{}")); } }catch(Exception ignored){}
      e.apply();
      /* ۱.۳.۶۴: پیامک‌های تازهٔ صف که نرم‌افزار هنوز نخوانده، روی عدد تازه دوباره اعمال شوند */
      try{ org.json.JSONObject dj2=call.getData(); if(dj2.has("seenNids")) HkWidgetDraw.applyUnseen(getContext(), dj2.optString("seenNids","[]")); }catch(Exception ignored){}
      HkWidgetProvider.refreshAll(getContext());
      call.resolve();
    }catch(Exception ex){ call.reject("widget_failed",ex); }
  }
}
