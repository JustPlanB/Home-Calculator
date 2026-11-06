package ir.hesabketab.app;

import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.os.Handler;
import android.os.Looper;
import android.provider.MediaStore;
import android.util.Base64;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.graphics.pdf.PdfDocument;
import android.widget.FrameLayout;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;
import java.io.FileOutputStream;
import java.io.OutputStream;
import java.io.ByteArrayOutputStream;

@CapacitorPlugin(name="NativeFileExport")
public class NativeFileExportPlugin extends Plugin {
  /* فایلی که با «باز کردن با…» یا «اشتراک‌گذاری» به نرم‌افزار داده شده (مثلاً پشتیبان در Downloads) */
  private static String openedName=null; private static byte[] openedData=null;
  public static boolean captureOpened(android.app.Activity act, Intent intent){
    try{
      if(intent==null) return false;
      String a=intent.getAction(); Uri u=null;
      /* عکس و PDF اشتراکی = پیوست (HkMedia.captureShared)، نه فایل پشتیبان */
      String ty=intent.getType(); if(Intent.ACTION_SEND.equals(a) && ty!=null && (ty.startsWith("image/") || ty.equals("application/pdf"))) return false;
      if(Intent.ACTION_VIEW.equals(a)) u=intent.getData();
      else if(Intent.ACTION_SEND.equals(a)){ Object x=intent.getParcelableExtra(Intent.EXTRA_STREAM); if(x instanceof Uri) u=(Uri)x; }
      if(u==null) return false;
      ContentResolver cr=act.getContentResolver();
      String name="backup.json";
      android.database.Cursor c=null;
      try{ c=cr.query(u,new String[]{android.provider.OpenableColumns.DISPLAY_NAME},null,null,null); if(c!=null && c.moveToFirst() && c.getString(0)!=null) name=c.getString(0); }catch(Exception ignored){} finally{ if(c!=null) c.close(); }
      try(java.io.InputStream in=cr.openInputStream(u)){
        if(in==null) return false;
        ByteArrayOutputStream bo=new ByteArrayOutputStream(); byte[] buf=new byte[65536]; int r; long t=0;
        while((r=in.read(buf))>0){ t+=r; if(t>64L*1024*1024) return false; bo.write(buf,0,r); }
        openedName=name; openedData=bo.toByteArray();
      }
      intent.setAction(Intent.ACTION_MAIN); intent.setData(null);
      return true;
    }catch(Exception e){ return false; }
  }
  @com.getcapacitor.PluginMethod public void takeOpenedFile(PluginCall call){
    JSObject r=new JSObject();
    if(openedData!=null){ r.put("name",openedName); r.put("data",Base64.encodeToString(openedData,Base64.NO_WRAP)); }
    openedName=null; openedData=null;
    call.resolve(r);
  }

  private String uniqueDownloadName(String filename) {
    if(filename==null || filename.trim().isEmpty()) filename="download.bin";
    ContentResolver cr=getContext().getContentResolver();
    String base=filename;
    String ext="";
    int dot=filename.lastIndexOf('.');
    if(dot>0){ base=filename.substring(0,dot); ext=filename.substring(dot); }
    boolean isHesabBackup = base.startsWith("hesab-backup-");
    String restAfterPrefix = isHesabBackup ? base.substring("hesab-backup-".length()) : null;
    for(int n=0;n<10000;n++){
      String candidate;
      if(n==0) candidate = filename;
      else if(isHesabBackup) candidate = "hesab-backup-" + n + "-" + restAfterPrefix + ext;
      else candidate = base + "-" + n + ext;
      android.database.Cursor c=null;
      try{
        c=cr.query(MediaStore.Downloads.EXTERNAL_CONTENT_URI,
          new String[]{MediaStore.Downloads.DISPLAY_NAME},
          MediaStore.Downloads.DISPLAY_NAME+"=?",new String[]{candidate},null);
        if(c==null || !c.moveToFirst()) return candidate;
      }finally{ if(c!=null) c.close(); }
    }
    return filename;
  }

  private Uri insertPending(String filename,String mimeType) throws Exception {
    ContentResolver cr=getContext().getContentResolver();
    filename=uniqueDownloadName(filename);
    ContentValues v=new ContentValues();
    v.put(MediaStore.Downloads.DISPLAY_NAME,filename);
    v.put(MediaStore.Downloads.MIME_TYPE,mimeType==null?"application/octet-stream":mimeType);
    if(Build.VERSION.SDK_INT>=29) v.put(MediaStore.Downloads.RELATIVE_PATH,Environment.DIRECTORY_DOWNLOADS);
    if(Build.VERSION.SDK_INT>=29) v.put(MediaStore.Downloads.IS_PENDING,1);
    Uri u=cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);
    if(u==null) throw new Exception("Downloads insert failed");
    return u;
  }

  private void finishPending(Uri u) {
    if(Build.VERSION.SDK_INT>=29){
      ContentValues v=new ContentValues();
      v.put(MediaStore.Downloads.IS_PENDING,0);
      getContext().getContentResolver().update(u,v,null,null);
    }
  }

  private byte[] decodeBase64(String data) throws Exception {
    if(data==null||data.isEmpty()) throw new Exception("empty data");
    int comma=data.indexOf(',');
    if(data.startsWith("data:") && comma>0) data=data.substring(comma+1);
    return Base64.decode(data, Base64.DEFAULT);
  }

  private File writeCacheFile(String filename, byte[] bytes) throws Exception {
    File dir=new File(getContext().getCacheDir(), "share");
    if(!dir.exists() && !dir.mkdirs()) throw new Exception("cache dir failed");
    String safe=(filename==null?"file.bin":filename).replaceAll("[\\/]+","_");
    File out=new File(dir, safe);
    try(FileOutputStream fos=new FileOutputStream(out)){
      fos.write(bytes);
      fos.flush();
    }
    return out;
  }

  private Uri saveToDownloads(String filename, String mimeType, byte[] bytes) throws Exception {
    Uri u=insertPending(filename, mimeType);
    try(OutputStream out=getContext().getContentResolver().openOutputStream(u)){
      if(out==null) throw new Exception("open output failed");
      out.write(bytes);
      out.flush();
    }
    finishPending(u);
    return u;
  }

  @com.getcapacitor.PluginMethod public void saveBase64ToDownloads(PluginCall call){
    try{
      String filename=call.getString("filename","download.bin");
      String mime=call.getString("mimeType","application/octet-stream");
      String data=call.getString("data","");
      byte[] bytes=decodeBase64(data);
      Uri u=saveToDownloads(filename, mime, bytes);
      call.resolve(new JSObject().put("uri",u.toString()).put("filename",filename).put("ok",true));
    }catch(Exception e){ call.reject("save_download_failed",e); }
  }

  /* ===== پشتیبان خودکار: پوشهٔ Downloads/HesabKetab (اندروید ۱۰ به بالا؛ بعد از حذف نرم‌افزار هم می‌ماند) ===== */
  private static final String AUTO_DIR="HesabKetab";
  private String autoRel(){ return Environment.DIRECTORY_DOWNLOADS+"/"+AUTO_DIR+"/"; }
  private boolean autoSafeName(String n){ return n!=null && n.matches("hesab-(auto|safety|latest)-[0-9A-Za-z._-]{1,80}[.]json"); }
  /* حافظهٔ داخلی خود نرم‌افزار (در فایل‌منیجر دیده نمی‌شود): پشتیبان‌های روزانه و ایمنی؛ در Downloads فقط «آخرین پشتیبان» */
  private boolean isInternal(PluginCall c){ return "internal".equals(c.getString("store","")); }
  private File internalDir(){ File d=new File(getContext().getFilesDir(),"backups"); if(!d.exists()) d.mkdirs(); return d; }
  private byte[] readFileBytes(File f) throws Exception {
    if(f.length()>64L*1024*1024) throw new Exception("too_large");
    try(java.io.FileInputStream in=new java.io.FileInputStream(f)){
      ByteArrayOutputStream bo=new ByteArrayOutputStream(); byte[] buf=new byte[65536]; int r;
      while((r=in.read(buf))>0) bo.write(buf,0,r);
      return bo.toByteArray();
    }
  }
  private void saveInternal(PluginCall call, String name, byte[] bytes) throws Exception {
    File dir=internalDir(), f=new File(dir,name), tmp=new File(dir,name+".tmp");
    if(f.exists()){ call.reject("name_exists"); return; }
    try(FileOutputStream out=new FileOutputStream(tmp)){ out.write(bytes); out.flush(); try{ out.getFD().sync(); }catch(Exception ignored){} }
    byte[] back=readFileBytes(tmp);
    if(!java.util.Arrays.equals(back,bytes)){ tmp.delete(); throw new Exception("verify_failed"); }
    if(!tmp.renameTo(f)){ tmp.delete(); throw new Exception("finish_failed"); }
    call.resolve(new JSObject().put("ok",true).put("verified",true).put("filename",name).put("folder","internal"));
  }

  @com.getcapacitor.PluginMethod public void saveAutoBackup(PluginCall call){
    if(Build.VERSION.SDK_INT<29){ call.reject("unsupported"); return; }
    try{
      String name=call.getString("filename","");
      if(!autoSafeName(name)){ call.reject("bad_name"); return; }
      byte[] bytes=decodeBase64(call.getString("data",""));
      if(isInternal(call)){ saveInternal(call,name,bytes); return; }
      ContentResolver cr=getContext().getContentResolver();
      /* نوشتن امن بدون هیچ حذفی: هر پشتیبان نام یکتای خودش را دارد (برنامه زمان را در نام می‌گذارد)، پس فایل تازه
         هرگز جای فایل قبلی را نمی‌گیرد. ترتیب: درج با نام نهایی در حالت pending (نامرئی) ← نوشتن ← خواندن دوباره و
         مقایسهٔ بایت‌به‌بایت ← تمام‌کردن pending ← اطمینان از اینکه با همان نام و شناسه به‌عنوان فایل تمام‌شده پیدا می‌شود.
         هر شکستی فقط همین آیتم تازهٔ ناتمام را برمی‌دارد؛ فایل‌های قبلی هرگز اینجا حذف نمی‌شوند (پاک‌کردن نسخه‌های قدیمی
         فقط با هرس سمت برنامه و فقط پس از تأیید همین فایل انجام می‌شود). */
      if(findCompletedAuto(cr,name)!=null){ call.reject("name_exists"); return; }
      ContentValues v=new ContentValues();
      v.put(MediaStore.Downloads.DISPLAY_NAME,name);
      v.put(MediaStore.Downloads.MIME_TYPE,"application/json");
      v.put(MediaStore.Downloads.RELATIVE_PATH,autoRel());
      v.put(MediaStore.Downloads.IS_PENDING,1);
      Uri u=cr.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI,v);
      if(u==null){ call.reject("insert_failed"); return; }
      try{
        /* اگر سیستم نام را عوض کرده باشد (مثلاً «(1)»)، این فایل پذیرفته نمی‌شود */
        if(!name.equals(queryDisplayName(cr,u))) throw new Exception("name_conflict");
        try(OutputStream out=cr.openOutputStream(u)){
          if(out==null) throw new Exception("open output failed");
          out.write(bytes); out.flush();
        }
        byte[] back=readAllBytes(cr,u);
        if(back==null || !java.util.Arrays.equals(back,bytes)) throw new Exception("verify_failed");
        ContentValues done=new ContentValues();
        done.put(MediaStore.Downloads.IS_PENDING,0);
        if(cr.update(u,done,null,null)<1) throw new Exception("finish_failed");
        Long found=findCompletedAuto(cr,name);
        if(found==null || found.longValue()!=android.content.ContentUris.parseId(u)) throw new Exception("not_discoverable");
      }catch(Exception we){ try{ cr.delete(u,null,null); }catch(Exception ignored){} throw we; }
      call.resolve(new JSObject().put("ok",true).put("verified",true).put("uri",u.toString()).put("filename",name).put("folder","Download/"+AUTO_DIR));
    }catch(Exception e){ call.reject("auto_backup_failed",e); }
  }

  @com.getcapacitor.PluginMethod public void listAutoBackups(PluginCall call){
    if(isInternal(call)){
      try{
        com.getcapacitor.JSArray arr=new com.getcapacitor.JSArray();
        File[] fs=internalDir().listFiles();
        if(fs!=null) for(File f: fs){ if(f.isFile() && autoSafeName(f.getName())) arr.put(new JSObject().put("name",f.getName()).put("size",f.length()).put("modified",f.lastModified()/1000)); }
        call.resolve(new JSObject().put("files",arr));
      }catch(Exception e){ call.reject("list_failed",e); }
      return;
    }
    if(Build.VERSION.SDK_INT<29){ call.reject("unsupported"); return; }
    android.database.Cursor c=null;
    try{
      com.getcapacitor.JSArray arr=new com.getcapacitor.JSArray();
      c=getContext().getContentResolver().query(MediaStore.Downloads.EXTERNAL_CONTENT_URI,
        new String[]{MediaStore.Downloads.DISPLAY_NAME, MediaStore.Downloads.SIZE, MediaStore.Downloads.DATE_MODIFIED},
        MediaStore.Downloads.RELATIVE_PATH+"=? AND "+MediaStore.Downloads.IS_PENDING+"=0", new String[]{autoRel()}, null);
      while(c!=null && c.moveToNext()){
        String n=c.getString(0);
        if(!autoSafeName(n)) continue;
        arr.put(new JSObject().put("name",n).put("size",c.getLong(1)).put("modified",c.getLong(2)));
      }
      call.resolve(new JSObject().put("files",arr));
    }catch(Exception e){ call.reject("list_failed",e); }
    finally{ if(c!=null) c.close(); }
  }

  private byte[] readAllBytes(ContentResolver cr, Uri u) throws Exception {
    try(java.io.InputStream in=cr.openInputStream(u)){
      if(in==null) return null;
      ByteArrayOutputStream bo=new ByteArrayOutputStream();
      byte[] buf=new byte[65536]; int r; long total=0;
      while((r=in.read(buf))>0){ total+=r; if(total>64L*1024*1024) throw new Exception("too_large"); bo.write(buf,0,r); }
      return bo.toByteArray();
    }
  }
  /** شناسهٔ یک پشتیبان خودکار تمام‌شده (نه pending) با همین نام در پوشهٔ HesabKetab، یا null */
  private Long findCompletedAuto(ContentResolver cr, String name){
    android.database.Cursor c=null;
    try{
      c=cr.query(MediaStore.Downloads.EXTERNAL_CONTENT_URI, new String[]{MediaStore.Downloads._ID},
        MediaStore.Downloads.DISPLAY_NAME+"=? AND "+MediaStore.Downloads.RELATIVE_PATH+"=? AND "+MediaStore.Downloads.IS_PENDING+"=0", new String[]{name, autoRel()}, null);
      if(c!=null && c.moveToFirst()) return Long.valueOf(c.getLong(0));
    }catch(Exception ignored){}
    finally{ if(c!=null) c.close(); }
    return null;
  }
  private String queryDisplayName(ContentResolver cr, Uri u){
    android.database.Cursor c=null;
    try{
      c=cr.query(u,new String[]{MediaStore.Downloads.DISPLAY_NAME},null,null,null);
      if(c!=null && c.moveToFirst()) return c.getString(0);
    }catch(Exception ignored){}
    finally{ if(c!=null) c.close(); }
    return null;
  }
  /** خواندن یک پشتیبان خودکار تمام‌شده (فقط پوشهٔ HesabKetab و فقط نام‌های مجاز) — برای تأیید پیش از پاک‌سازی */
  @com.getcapacitor.PluginMethod public void readAutoBackup(PluginCall call){
    if(isInternal(call)){
      try{
        String name=call.getString("name","");
        if(!autoSafeName(name)){ call.reject("bad_name"); return; }
        File f=new File(internalDir(),name);
        if(!f.isFile()){ call.reject("not_found"); return; }
        byte[] bytes=readFileBytes(f);
        call.resolve(new JSObject().put("data",Base64.encodeToString(bytes,Base64.NO_WRAP)).put("size",bytes.length));
      }catch(Exception e){ call.reject("read_failed",e); }
      return;
    }
    if(Build.VERSION.SDK_INT<29){ call.reject("unsupported"); return; }
    android.database.Cursor c=null;
    try{
      String name=call.getString("name","");
      if(!autoSafeName(name)){ call.reject("bad_name"); return; }
      ContentResolver cr=getContext().getContentResolver();
      c=cr.query(MediaStore.Downloads.EXTERNAL_CONTENT_URI, new String[]{MediaStore.Downloads._ID},
        MediaStore.Downloads.DISPLAY_NAME+"=? AND "+MediaStore.Downloads.RELATIVE_PATH+"=? AND "+MediaStore.Downloads.IS_PENDING+"=0", new String[]{name, autoRel()}, null);
      if(c==null || !c.moveToFirst()){ call.reject("not_found"); return; }
      Uri u=android.content.ContentUris.withAppendedId(MediaStore.Downloads.EXTERNAL_CONTENT_URI, c.getLong(0));
      byte[] bytes=readAllBytes(cr,u);
      if(bytes==null){ call.reject("read_failed"); return; }
      call.resolve(new JSObject().put("data",Base64.encodeToString(bytes,Base64.NO_WRAP)).put("size",bytes.length));
    }catch(Exception e){ call.reject("read_failed",e); }
    finally{ if(c!=null) c.close(); }
  }

  @com.getcapacitor.PluginMethod public void deleteAutoBackup(PluginCall call){
    if(isInternal(call)){
      String name=call.getString("name","");
      if(!autoSafeName(name)){ call.reject("bad_name"); return; }
      File f=new File(internalDir(),name);
      call.resolve(new JSObject().put("deleted", f.isFile() && f.delete() ? 1 : 0));
      return;
    }
    if(Build.VERSION.SDK_INT<29){ call.reject("unsupported"); return; }
    try{
      String name=call.getString("name","");
      if(!autoSafeName(name)){ call.reject("bad_name"); return; }
      int n=getContext().getContentResolver().delete(MediaStore.Downloads.EXTERNAL_CONTENT_URI,
        MediaStore.Downloads.DISPLAY_NAME+"=? AND "+MediaStore.Downloads.RELATIVE_PATH+"=?", new String[]{name, autoRel()});
      call.resolve(new JSObject().put("deleted",n));
    }catch(Exception e){ call.reject("delete_failed",e); }
  }

  /** باز کردن فایل ذخیره‌شده با انتخاب برنامه (فهرست برنامه‌های سازگار، مثلاً نمایشگرهای PDF) */
  @com.getcapacitor.PluginMethod public void openUri(PluginCall call){
    try{
      String uri=call.getString("uri","");
      String mime=call.getString("mimeType","application/pdf");
      String title=call.getString("title","باز کردن با");
      if(uri==null || !uri.startsWith("content://")){ call.reject("bad_uri"); return; }
      Intent view=new Intent(Intent.ACTION_VIEW);
      view.setDataAndType(Uri.parse(uri), mime);
      view.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
      Intent chooser=Intent.createChooser(view, title);
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_GRANT_READ_URI_PERMISSION);
      getActivity().startActivity(chooser);
      call.resolve(new JSObject().put("ok", true));
    }catch(android.content.ActivityNotFoundException e){ call.reject("no_app",e); }
    catch(Exception e){ call.reject("open_failed",e); }
  }

  @com.getcapacitor.PluginMethod public void shareBase64File(PluginCall call){
    try{
      String filename=call.getString("filename","share.bin");
      String mime=call.getString("mimeType","application/octet-stream");
      String data=call.getString("data","");
      String title=call.getString("title","اشتراک‌گذاری");
      boolean alsoDownload = true;
      try { Boolean b = call.getBoolean("saveToDownloads", true); if(b!=null) alsoDownload=b; } catch(Exception ignored){}
      byte[] bytes=decodeBase64(data);

      Uri downloadUri=null;
      if(alsoDownload){
        try{ downloadUri=saveToDownloads(filename, mime, bytes); }catch(Exception e){ /* continue to share */ }
      }

      File cacheFile=writeCacheFile(filename, bytes);
      String authority=getContext().getPackageName()+".fileprovider";
      Uri contentUri=FileProvider.getUriForFile(getContext(), authority, cacheFile);

      Intent send=new Intent(Intent.ACTION_SEND);
      send.setType(mime==null?"application/octet-stream":mime);
      send.putExtra(Intent.EXTRA_STREAM, contentUri);
      send.putExtra(Intent.EXTRA_SUBJECT, title);
      send.putExtra(Intent.EXTRA_TEXT, title);
      send.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

      Intent chooser=Intent.createChooser(send, title);
      chooser.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
      getActivity().startActivity(chooser);

      JSObject r=new JSObject();
      r.put("ok", true);
      r.put("shared", true);
      r.put("uri", contentUri.toString());
      if(downloadUri!=null) r.put("downloadUri", downloadUri.toString());
      r.put("filename", filename);
      call.resolve(r);
    }catch(Exception e){ call.reject("share_failed",e); }
  }

  @com.getcapacitor.PluginMethod public void exportHtmlToPdf(final PluginCall call){
    final String html=call.getString("html","");
    final String filename=call.getString("filename","hesab.pdf");
    if(html==null||html.isEmpty()){ call.reject("empty_html"); return; }

    getActivity().runOnUiThread(new Runnable(){
      @Override public void run(){
        final FrameLayout root=(FrameLayout)getActivity().getWindow().getDecorView();
        final FrameLayout host=new FrameLayout(getContext());
        host.setBackgroundColor(android.graphics.Color.WHITE);
        final int viewW = 794; // A4 width at 96dpi CSS px
        FrameLayout.LayoutParams hp=new FrameLayout.LayoutParams(viewW, 1600);
        // پشت محتوای نرم‌افزار (اندیس ۰): همان چیدمان و رندر قبلی، ولی صفحه‌های گزارش روی صفحه دیده نمی‌شوند
        root.addView(host,0,hp);

        final WebView web=new WebView(getContext());
        web.setBackgroundColor(android.graphics.Color.WHITE);
        // SOFTWARE: capture با web.draw قابل‌اعتمادتر از HARDWARE است
        web.setLayerType(android.view.View.LAYER_TYPE_SOFTWARE,null);
        web.getSettings().setJavaScriptEnabled(true);
        web.getSettings().setDefaultTextEncodingName("UTF-8");
        web.getSettings().setLoadWithOverviewMode(false);
        web.getSettings().setUseWideViewPort(false);
        web.getSettings().setDomStorageEnabled(true);
        // امنیت: این WebView فقط HTML گزارش را نشان می‌دهد؛ دسترسی به فایل/محتوای گوشی لازم نیست
        web.getSettings().setAllowFileAccess(false);
        web.getSettings().setAllowContentAccess(false);
        web.getSettings().setGeolocationEnabled(false);
        web.setInitialScale(100);
        host.addView(web,new FrameLayout.LayoutParams(viewW, 1600));

        web.setWebViewClient(new WebViewClient(){
          private boolean started=false;
          private int attempts=0;
          @Override public void onPageFinished(final WebView view,String url){
            if(started) return;
            final Runnable[] holder = new Runnable[1];
            holder[0] = new Runnable(){
              @Override public void run(){
                if(started) return;
                attempts++;
                try{
                  view.evaluateJavascript(
                    "(function(){var b=document.body,h=document.documentElement;var pages=document.querySelectorAll('.pdf-page');var ph=0;if(pages&&pages.length){for(var i=0;i<pages.length;i++){ph+=Math.max(pages[i].offsetHeight,pages[i].scrollHeight,1080);}return Math.max(ph,b.scrollHeight,b.offsetHeight,h.scrollHeight);}return Math.max(b.scrollHeight,b.offsetHeight,h.clientHeight,h.scrollHeight,h.offsetHeight);})()",
                    new android.webkit.ValueCallback<String>(){
                      @Override public void onReceiveValue(String value){
                        if(started) return;
                        int measured = 0;
                        try{
                          if(value!=null && !value.equals("null")) measured = (int)Math.ceil(Double.parseDouble(value));
                        }catch(Exception ignored){}
                        if(measured < 80){
                          measured = (int)Math.ceil(view.getContentHeight() * view.getScale());
                        }
                        if(measured < 80 && attempts < 8){
                          new Handler(Looper.getMainLooper()).postDelayed(holder[0], 500L);
                          return;
                        }
                        if(measured < 100 && attempts < 10){
                          new Handler(Looper.getMainLooper()).postDelayed(holder[0], 400L);
                          return;
                        }
                        if(measured < 100){
                          started=true;
                          call.reject("pdf_content_too_short");
                          try{ host.removeView(view); root.removeView(host); }catch(Exception ignored){}
                          view.destroy();
                          return;
                        }
                        measured = (int)(measured * 1.08) + 48;
                        started=true;
                        createPdfByPages(view,filename,call,host,root, viewW);
                      }
                    }
                  );
                }catch(Exception e){
                  try{
                    int measured = (int)Math.ceil(view.getContentHeight() * view.getScale());
                    if(measured < 80 && attempts < 8){
                      new Handler(Looper.getMainLooper()).postDelayed(holder[0], 500L);
                      return;
                    }
                    if(measured < 100 && attempts < 10){
                      new Handler(Looper.getMainLooper()).postDelayed(holder[0], 400L);
                      return;
                    }
                    if(measured < 100){
                      started=true;
                      call.reject("pdf_content_too_short");
                      try{ host.removeView(view); root.removeView(host); }catch(Exception ignored){}
                      view.destroy();
                      return;
                    }
                    measured = (int)(measured * 1.08) + 48;
                    started=true;
                    createPdfByPages(view,filename,call,host,root, viewW);
                  }catch(Exception e2){
                    started=true;
                    call.reject("pdf_measure_failed",e2);
                    try{ host.removeView(view); root.removeView(host); }catch(Exception ignored){}
                    view.destroy();
                  }
                }
              }
            };
            new Handler(Looper.getMainLooper()).postDelayed(holder[0], 1400L);
          }
        });
        web.loadDataWithBaseURL("https://hesabketab.local/",html,"text/html","UTF-8",null);
      }
    });
  }

  private void createPdf(WebView web,String filename,PluginCall call,FrameLayout host,FrameLayout root,int contentH, int viewW){
    // سازگاری با فراخوانی قدیمی — به مسیر صفحه به صفحه هدایت می‌شود
    createPdfByPages(web, filename, call, host, root, viewW);
  }

  /** رندر هر .pdf-page جداگانه — JS تنها مرجع مرز صفحات است */
  private void createPdfByPages(final WebView web, final String filename, final PluginCall call,
                                final FrameLayout host, final FrameLayout root, final int viewW){
    web.evaluateJavascript(
      "(function(){var ps=document.querySelectorAll('.pdf-page');return ps?ps.length:0;})()",
      new android.webkit.ValueCallback<String>(){
        @Override public void onReceiveValue(String value){
          int pageCount = 0;
          try {
            if (value != null && !value.equals("null")) pageCount = (int)Double.parseDouble(value);
          } catch (Exception ignored) {}
          if (pageCount < 1) {
            // fallback: یک صفحه از کل body
            pageCount = 1;
          }
          final int total = pageCount;
          final android.graphics.pdf.PdfDocument doc = new android.graphics.pdf.PdfDocument();
          final int[] index = new int[]{0};
          final int scaleCap = 4; // کیفیت فعلی را حفظ کن
          final int layoutW = viewW > 0 ? viewW : 794;

          final Runnable[] step = new Runnable[1];
          step[0] = new Runnable(){
            @Override public void run(){
              if (index[0] >= total) {
                // تمام — ذخیره
                Uri uri = null;
                try {
                  java.io.ByteArrayOutputStream bos = new java.io.ByteArrayOutputStream();
                  doc.writeTo(bos);
                  doc.close();
                  byte[] pdfBytes = bos.toByteArray();
                  if (pdfBytes == null || pdfBytes.length < 100) {
                    call.reject("pdf_empty");
                    cleanupWeb(web, host, root);
                    return;
                  }
                  uri = saveToDownloads(filename, "application/pdf", pdfBytes);
                  call.resolve(new JSObject().put("uri", uri.toString()).put("filename", filename).put("ok", true).put("pages", total));
                } catch (Exception e) {
                  try { doc.close(); } catch (Exception ignored) {}
                  call.reject("pdf_export_failed", e);
                } finally {
                  cleanupWeb(web, host, root);
                }
                return;
              }

              final int pageIndex = index[0];
              // فقط این صفحه را نمایش بده
              String js =
                "(function(){" +
                "var ps=document.querySelectorAll('.pdf-page');" +
                "for(var i=0;i<ps.length;i++){ps[i].style.display=(i===" + pageIndex + "?'block':'none');}" +
                "var p=ps[" + pageIndex + "];" +
                "if(!p)return JSON.stringify({h:0,empty:true});" +
                "var h=Math.max(p.scrollHeight,p.offsetHeight,1);" +
                "var text=(p.innerText||'').replace(/\s+/g,'');" +
                "return JSON.stringify({h:h,empty:text.length<3});" +
                "})()";

              web.evaluateJavascript(js, new android.webkit.ValueCallback<String>(){
                @Override public void onReceiveValue(String jsonRaw){
                  try {
                    String raw = jsonRaw;
                    if (raw != null && raw.length() >= 2 && raw.charAt(0) == '"') {
                      // evaluateJavascript returns JSON-quoted string
                      raw = new org.json.JSONArray("[" + raw + "]").getString(0);
                    }
                    org.json.JSONObject info;
                    try {
                      String jsonSrc = (raw != null && raw.length() > 0) ? raw : "{}";
                      info = new org.json.JSONObject(jsonSrc);
                    } catch (Exception parseEx) {
                      info = new org.json.JSONObject();
                    }
                    boolean empty = info.optBoolean("empty", false);
                    int cssH = Math.max(1, info.optInt("h", 400));
                    if (empty) {
                      // صفحه خالی را رد کن
                      index[0]++;
                      new android.os.Handler(android.os.Looper.getMainLooper()).post(step[0]);
                      return;
                    }

                    // layout WebView به اندازه همین صفحه
                    final int layoutH = cssH + 8;
                    web.measure(
                      android.view.View.MeasureSpec.makeMeasureSpec(layoutW, android.view.View.MeasureSpec.EXACTLY),
                      android.view.View.MeasureSpec.makeMeasureSpec(layoutH, android.view.View.MeasureSpec.EXACTLY));
                    web.layout(0, 0, layoutW, layoutH);
                    host.updateViewLayout(web, new FrameLayout.LayoutParams(layoutW, layoutH));
                    host.measure(
                      android.view.View.MeasureSpec.makeMeasureSpec(layoutW, android.view.View.MeasureSpec.EXACTLY),
                      android.view.View.MeasureSpec.makeMeasureSpec(layoutH, android.view.View.MeasureSpec.EXACTLY));
                    host.layout(0, 0, layoutW, layoutH);

                    new android.os.Handler(android.os.Looper.getMainLooper()).postDelayed(new Runnable(){
                      @Override public void run(){
                        android.graphics.Bitmap bmp = null;
                        try {
                          int bmpW = layoutW * scaleCap;
                          int bmpH = layoutH * scaleCap;
                          bmp = android.graphics.Bitmap.createBitmap(bmpW, bmpH, android.graphics.Bitmap.Config.ARGB_8888);
                          android.graphics.Canvas bmpCanvas = new android.graphics.Canvas(bmp);
                          bmpCanvas.drawColor(android.graphics.Color.WHITE);
                          bmpCanvas.scale(scaleCap, scaleCap);
                          web.draw(bmpCanvas);

                          // رد bitmap تقریباً سفید
                          int stepPx = Math.max(8, Math.min(bmpW, bmpH) / 40);
                          int dark = 0, n = 0;
                          for (int yy = 0; yy < bmpH; yy += stepPx) {
                            for (int xx = 0; xx < bmpW; xx += stepPx) {
                              int p = bmp.getPixel(Math.min(xx, bmpW - 1), Math.min(yy, bmpH - 1));
                              int r = (p >> 16) & 0xFF, g = (p >> 8) & 0xFF, b = p & 0xFF;
                              n++;
                              if (r < 250 || g < 250 || b < 250) dark++;
                            }
                          }
                          if (n > 0 && (dark * 100) / n < 2) {
                            // سفید — رد
                            if (bmp != null && !bmp.isRecycled()) bmp.recycle();
                            index[0]++;
                            new android.os.Handler(android.os.Looper.getMainLooper()).post(step[0]);
                            return;
                          }

                          final int pageW = 595;
                          final int pageH = 842;
                          final int margin = 18;
                          final float usableW = pageW - 2f * margin;
                          float pxPerPt = bmpW / usableW;
                          float dstH = Math.min(pageH - 2f * margin, bmpH / pxPerPt);

                          android.graphics.pdf.PdfDocument.PageInfo pinfo =
                            new android.graphics.pdf.PdfDocument.PageInfo.Builder(pageW, pageH, index[0] + 1).create();
                          android.graphics.pdf.PdfDocument.Page page = doc.startPage(pinfo);
                          android.graphics.Canvas c = page.getCanvas();
                          c.drawColor(android.graphics.Color.WHITE);
                          android.graphics.Paint paint = new android.graphics.Paint(
                            android.graphics.Paint.ANTI_ALIAS_FLAG | android.graphics.Paint.FILTER_BITMAP_FLAG);
                          android.graphics.Rect src = new android.graphics.Rect(0, 0, bmpW, bmpH);
                          android.graphics.RectF dst = new android.graphics.RectF(margin, margin, margin + usableW, margin + dstH);
                          c.drawBitmap(bmp, src, dst, paint);
                          doc.finishPage(page);
                        } catch (Exception e) {
                          try { doc.close(); } catch (Exception ignored) {}
                          call.reject("pdf_page_failed", e);
                          cleanupWeb(web, host, root);
                          return;
                        } finally {
                          if (bmp != null && !bmp.isRecycled()) try { bmp.recycle(); } catch (Exception ignored) {}
                        }
                        index[0]++;
                        new android.os.Handler(android.os.Looper.getMainLooper()).post(step[0]);
                      }
                    }, 120);
                  } catch (Exception e) {
                    try { doc.close(); } catch (Exception ignored) {}
                    call.reject("pdf_page_meta_failed", e);
                    cleanupWeb(web, host, root);
                  }
                }
              });
            }
          };
          new android.os.Handler(android.os.Looper.getMainLooper()).post(step[0]);
        }
      }
    );
  }

  private void cleanupWeb(WebView web, FrameLayout host, FrameLayout root){
    try { host.removeView(web); } catch (Exception ignored) {}
    try { root.removeView(host); } catch (Exception ignored) {}
    try { web.destroy(); } catch (Exception ignored) {}
  }
}
