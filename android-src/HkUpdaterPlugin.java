package ir.hesabketab.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

/** بروزرسانی داخل نرم‌افزار: دانلود APK امضاشده از Releases با گزارش درصد، سپس باز کردن نصب‌کنندهٔ اندروید */
@CapacitorPlugin(name="HkUpdater")
public class HkUpdaterPlugin extends Plugin {
  private volatile boolean busy=false;

  private static boolean allowed(String u){
    return u!=null && u.startsWith("https://") && (u.startsWith("https://github.com/") || u.startsWith("https://objects.githubusercontent.com/") || u.startsWith("https://release-assets.githubusercontent.com/"));
  }

  @com.getcapacitor.PluginMethod public void download(final PluginCall call){
    final String url=call.getString("url","");
    if(!allowed(url)){ call.reject("bad_url"); return; }
    if(busy){ call.reject("busy"); return; }
    busy=true;
    new Thread(new Runnable(){ @Override public void run(){
      HttpURLConnection c=null;
      try{
        File dir=new File(getContext().getCacheDir(),"updates");
        if(!dir.exists()) dir.mkdirs();
        File out=new File(dir,"hesab-ketab.apk");
        File tmp=new File(dir,"hesab-ketab.apk.part");
        String cur=url;
        for(int hop=0; hop<6; hop++){
          c=(HttpURLConnection)new URL(cur).openConnection();
          c.setInstanceFollowRedirects(false);
          c.setConnectTimeout(15000);
          c.setReadTimeout(30000);
          c.setRequestProperty("User-Agent","HesabKetab-Updater");
          int code=c.getResponseCode();
          if(code>=300 && code<400){
            String loc=c.getHeaderField("Location");
            c.disconnect(); c=null;
            if(loc==null || !allowed(loc)) throw new Exception("bad_redirect");
            cur=loc; continue;
          }
          if(code!=200) throw new Exception("http_"+code);
          break;
        }
        if(c==null) throw new Exception("too_many_redirects");
        long total=c.getContentLengthLong();
        InputStream in=c.getInputStream();
        FileOutputStream fo=new FileOutputStream(tmp);
        byte[] buf=new byte[65536];
        long got=0; int last=-1; int n;
        while((n=in.read(buf))!=-1){
          fo.write(buf,0,n); got+=n;
          int pct= total>0 ? (int)Math.min(100, (got*100)/total) : -1;
          if(pct!=last){ last=pct; JSObject ev=new JSObject(); ev.put("percent",pct); ev.put("received",got); ev.put("total",total); notifyListeners("progress",ev); }
        }
        fo.close(); in.close();
        if(total>0 && got!=total) throw new Exception("incomplete");
        if(out.exists()) out.delete();
        if(!tmp.renameTo(out)) throw new Exception("rename_failed");
        JSObject r=new JSObject(); r.put("path",out.getAbsolutePath()); r.put("size",got);
        call.resolve(r);
      }catch(Exception e){
        call.reject(e.getMessage()==null?"download_failed":e.getMessage());
      }finally{
        try{ if(c!=null) c.disconnect(); }catch(Exception ignored){}
        busy=false;
      }
    }}).start();
  }

  /** اگر اجازهٔ «نصب برنامه‌های ناشناس» برای این نرم‌افزار داده نشده باشد، صفحهٔ تنظیمات همان اجازه باز می‌شود */
  @com.getcapacitor.PluginMethod public void install(final PluginCall call){
    try{
      File f=new File(getContext().getCacheDir(),"updates/hesab-ketab.apk");
      if(!f.exists()){ call.reject("no_file"); return; }
      if(Build.VERSION.SDK_INT>=26 && !getContext().getPackageManager().canRequestPackageInstalls()){
        Intent s=new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:"+getContext().getPackageName()));
        s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
        getContext().startActivity(s);
        call.reject("need_permission");
        return;
      }
      Uri u=FileProvider.getUriForFile(getContext(), getContext().getPackageName()+".fileprovider", f);
      Intent i=new Intent(Intent.ACTION_VIEW);
      i.setDataAndType(u,"application/vnd.android.package-archive");
      i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION|Intent.FLAG_ACTIVITY_NEW_TASK);
      getContext().startActivity(i);
      call.resolve();
    }catch(Exception e){ call.reject("install_failed",e); }
  }
}
