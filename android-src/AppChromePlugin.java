package ir.hesabketab.app;

import android.graphics.Color;
import android.view.View;
import android.view.Window;
import androidx.core.view.WindowCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name="AppChrome")
public class AppChromePlugin extends Plugin {
  static void apply(android.app.Activity act, int color, boolean light){
    if(act==null) return;
    Window w=act.getWindow();
    View decor=w.getDecorView();
    decor.setBackgroundColor(color);
    try{
      View wv=null;
      try{ wv=((com.getcapacitor.BridgeActivity)act).getBridge().getWebView(); }catch(Exception ignored){}
      if(wv!=null){ wv.setBackgroundColor(color); if(wv.getParent() instanceof View) ((View)wv.getParent()).setBackgroundColor(color); }
    }catch(Exception ignored){}
    WindowInsetsControllerCompat ic=WindowCompat.getInsetsController(w,decor);
    ic.setAppearanceLightStatusBars(light);
    ic.setAppearanceLightNavigationBars(light);
  }
  /** وقتی قفل برنامه فعال است: جلوگیری از اسکرین‌شات و نمایش محتوای مالی در پیش‌نمایش «برنامه‌های اخیر» */
  @com.getcapacitor.PluginMethod public void setSecure(final PluginCall call){
    final boolean on=Boolean.TRUE.equals(call.getBoolean("on",false));
    getActivity().runOnUiThread(new Runnable(){ @Override public void run(){
      try{
        if(on) getActivity().getWindow().addFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
        else getActivity().getWindow().clearFlags(android.view.WindowManager.LayoutParams.FLAG_SECURE);
        call.resolve();
      }catch(Exception e){ call.reject("secure_failed",e); }
    }});
  }
  @com.getcapacitor.PluginMethod public void setTheme(final PluginCall call){
    final String hex=call.getString("color","#1b1b1b");
    final boolean light=Boolean.TRUE.equals(call.getBoolean("light",false));
    getActivity().runOnUiThread(new Runnable(){ @Override public void run(){
      try{ apply(getActivity(), Color.parseColor(hex), light); call.resolve(); }
      catch(Exception e){ call.reject("app_chrome_failed",e); }
    }});
  }
}
