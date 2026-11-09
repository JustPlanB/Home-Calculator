package ir.hesabketab.app;

import android.app.Activity;
import android.app.NotificationManager;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Bundle;
import androidx.core.app.RemoteInput;
import org.json.JSONArray;
import org.json.JSONObject;

public class HkCatActivity extends Activity {
  @Override protected void onCreate(Bundle s){
    super.onCreate(s);
    try{
      Intent in=getIntent();
      int nid=in.getIntExtra("nid",0);
      String cat=in.getStringExtra("cat"); if(cat==null) cat="";
      String desc=in.getStringExtra("label");
      Bundle res=RemoteInput.getResultsFromIntent(in);
      if(res!=null){ CharSequence cs=res.getCharSequence(BankSmsReceiver.KEY_DESC); desc=cs==null?"":cs.toString().trim(); }
      /* ۱.۳.۹۶: دکمهٔ دسته/«بیشتر…» بعد از نوشتن شرح: شرح نوشته‌شده می‌ماند */
      else if(nid!=0){ try{ JSONObject it0=HkQuickReplyReceiver.findItem(this,nid); String prev=it0==null?"":it0.optString("quickDesc","").trim(); if(!prev.isEmpty()) desc=prev; }catch(Exception ignored){} }
      if(desc==null) desc=""; if(desc.length()>200) desc=desc.substring(0,200);
      if(nid!=0){
        SharedPreferences sp=getSharedPreferences(BankSmsReceiver.PREFS,Context.MODE_PRIVATE);
        JSONArray q=new JSONArray(sp.getString(BankSmsReceiver.QUEUE,"[]"));
        for(int i=0;i<q.length();i++){ JSONObject x=q.optJSONObject(i); if(x!=null && x.optInt("nid",0)==nid){ x.put("quickDesc",desc); x.put("quickCat",cat); x.put("quickOpen",true); x.put("quickAt",System.currentTimeMillis()); break; } }
        sp.edit().putString(BankSmsReceiver.QUEUE,q.toString()).commit();
        ((NotificationManager)getSystemService(Context.NOTIFICATION_SERVICE)).cancel(nid);
      }
      Intent oi=getPackageManager().getLaunchIntentForPackage(getPackageName());
      if(oi!=null){ oi.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP); startActivity(oi); }
    }catch(Throwable ignored){}
    finish();
  }
}
