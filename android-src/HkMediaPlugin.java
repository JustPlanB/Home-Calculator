package ir.hesabketab.app;

import android.Manifest;
import android.content.Intent;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.net.Uri;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Base64;
import androidx.activity.result.ActivityResult;
import androidx.core.content.FileProvider;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.ByteArrayOutputStream;
import java.io.File;

/** پیوست ردیف: گرفتن عکس با دوربین (نه گالری) و اجازهٔ میکروفون برای ضبط یادداشت صوتی */
@CapacitorPlugin(name="HkMedia", permissions={
  @Permission(strings={Manifest.permission.RECORD_AUDIO, Manifest.permission.MODIFY_AUDIO_SETTINGS}, alias="mic")
})
public class HkMediaPlugin extends Plugin {
  private File photoFile;

  @com.getcapacitor.PluginMethod public void micPermission(PluginCall call){
    if(getPermissionState("mic")==PermissionState.GRANTED){ call.resolve(new JSObject().put("granted",true)); return; }
    requestPermissionForAlias("mic",call,"micCb");
  }
  @PermissionCallback private void micCb(PluginCall call){
    boolean ok=getPermissionState("mic")==PermissionState.GRANTED;
    boolean never=!ok && getActivity()!=null && !getActivity().shouldShowRequestPermissionRationale(Manifest.permission.RECORD_AUDIO);
    call.resolve(new JSObject().put("granted",ok).put("blocked",never));
  }
  @com.getcapacitor.PluginMethod public void openAppSettings(PluginCall call){
    try{
      Intent i=new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:"+getContext().getPackageName()));
      i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK); getContext().startActivity(i); call.resolve();
    }catch(Exception e){ call.reject("open_failed",e); }
  }
  @com.getcapacitor.PluginMethod public void takePhoto(PluginCall call){
    try{
      File dir=new File(getContext().getCacheDir(),"capture"); if(!dir.exists()) dir.mkdirs();
      File[] old=dir.listFiles(); if(old!=null) for(File f: old) f.delete();
      photoFile=new File(dir,"photo_"+System.currentTimeMillis()+".jpg");
      Uri u=FileProvider.getUriForFile(getContext(), getContext().getPackageName()+".fileprovider", photoFile);
      Intent i=new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
      i.putExtra(MediaStore.EXTRA_OUTPUT,u);
      i.addFlags(Intent.FLAG_GRANT_WRITE_URI_PERMISSION|Intent.FLAG_GRANT_READ_URI_PERMISSION);
      startActivityForResult(call,i,"photoCb");
    }catch(Exception e){ call.reject("camera_failed",e); }
  }
  @ActivityCallback private void photoCb(PluginCall call, ActivityResult result){
    if(call==null) return;
    try{
      if(photoFile==null || !photoFile.exists() || photoFile.length()==0){ call.reject("cancelled"); return; }
      /* کوچک‌کردن در خود گوشی (ضلع بلند ۱۶۰۰) و چرخاندن طبق EXIF؛ JPEG کیفیت ۸۲ */
      BitmapFactory.Options o=new BitmapFactory.Options(); o.inJustDecodeBounds=true;
      BitmapFactory.decodeFile(photoFile.getAbsolutePath(),o);
      int max=Math.max(o.outWidth,o.outHeight), ss=1;
      while(max/(ss*2)>=1600) ss*=2;
      BitmapFactory.Options o2=new BitmapFactory.Options(); o2.inSampleSize=ss;
      Bitmap b=BitmapFactory.decodeFile(photoFile.getAbsolutePath(),o2);
      if(b==null){ call.reject("decode_failed"); return; }
      float k=Math.min(1f,1600f/Math.max(b.getWidth(),b.getHeight()));
      int rot=0;
      try{
        androidx.exifinterface.media.ExifInterface ex=new androidx.exifinterface.media.ExifInterface(photoFile.getAbsolutePath());
        int or=ex.getAttributeInt(androidx.exifinterface.media.ExifInterface.TAG_ORIENTATION,1);
        rot= or==6?90: or==3?180: or==8?270: 0;
      }catch(Throwable ignored){}
      Matrix m=new Matrix(); m.postScale(k,k); if(rot!=0) m.postRotate(rot);
      Bitmap out=Bitmap.createBitmap(b,0,0,b.getWidth(),b.getHeight(),m,true);
      ByteArrayOutputStream bo=new ByteArrayOutputStream();
      out.compress(Bitmap.CompressFormat.JPEG,82,bo);
      photoFile.delete();
      call.resolve(new JSObject().put("data",Base64.encodeToString(bo.toByteArray(),Base64.NO_WRAP)).put("mime","image/jpeg"));
    }catch(Exception e){ call.reject("photo_failed",e); }
  }
  /* خواندن عکس از Uri با کوچک‌کردن هنگام خواندن (ضلع بلند MAXS) و چرخش EXIF؛ HEIC و عکس خیلی بزرگ هم */
  static Bitmap decodeScaled(android.content.Context ctx, Uri u, final int MAXS) throws Exception {
      Bitmap b=null; boolean rotated=false;
      if(android.os.Build.VERSION.SDK_INT>=28){
        try{
          android.graphics.ImageDecoder.Source src=android.graphics.ImageDecoder.createSource(ctx.getContentResolver(),u);
          b=android.graphics.ImageDecoder.decodeBitmap(src,(dec,info,s)->{
            int w=info.getSize().getWidth(), h=info.getSize().getHeight(), mx=Math.max(w,h);
            if(mx>MAXS){ float k=MAXS/(float)mx; dec.setTargetSize(Math.max(1,Math.round(w*k)),Math.max(1,Math.round(h*k))); }
            dec.setAllocator(android.graphics.ImageDecoder.ALLOCATOR_SOFTWARE);
          });
          rotated=true;
        }catch(Throwable t){ b=null; }
      }
      if(b==null){
        BitmapFactory.Options o=new BitmapFactory.Options(); o.inJustDecodeBounds=true;
        try(java.io.InputStream in=ctx.getContentResolver().openInputStream(u)){ BitmapFactory.decodeStream(in,null,o); }
        int max=Math.max(o.outWidth,o.outHeight), ss=1;
        while(max/(ss*2)>=MAXS) ss*=2;
        BitmapFactory.Options o2=new BitmapFactory.Options(); o2.inSampleSize=ss;
        try(java.io.InputStream in=ctx.getContentResolver().openInputStream(u)){ b=BitmapFactory.decodeStream(in,null,o2); }
      }
      if(b==null) return null;
      int rot=0;
      if(!rotated){
        try(java.io.InputStream in=ctx.getContentResolver().openInputStream(u)){
          androidx.exifinterface.media.ExifInterface ex=new androidx.exifinterface.media.ExifInterface(in);
          int or=ex.getAttributeInt(androidx.exifinterface.media.ExifInterface.TAG_ORIENTATION,1);
          rot= or==6?90: or==3?180: or==8?270: 0;
        }catch(Throwable ignored){}
      }
      float k=Math.min(1f,(float)MAXS/Math.max(b.getWidth(),b.getHeight()));
      Bitmap out=b;
      if(k<1f || rot!=0){ Matrix m=new Matrix(); m.postScale(k,k); if(rot!=0) m.postRotate(rot); out=Bitmap.createBitmap(b,0,0,b.getWidth(),b.getHeight(),m,true); }
      return out;
  }
  /* ۱.۳.۳۷: عکس یا PDF که از برنامهٔ دیگر (بانک، گالری، …) با «اشتراک‌گذاری» به نرم‌افزار داده شده → پیوست یک ردیف.
     Uriها نگه داشته می‌شوند و با takeShared (در رشتهٔ افزونه، نه رشتهٔ اصلی) کوچک و JPEG می‌شوند؛ PDF = صفحهٔ اول به‌صورت عکس */
  private static final java.util.ArrayList<Uri> sharedUris=new java.util.ArrayList<>();
  private static final java.util.ArrayList<String> sharedTypes=new java.util.ArrayList<>();
  public static boolean captureShared(android.app.Activity act, Intent intent){
    try{
      if(intent==null) return false;
      String a=intent.getAction(), t=intent.getType();
      if(!(Intent.ACTION_SEND.equals(a) || Intent.ACTION_SEND_MULTIPLE.equals(a))) return false;
      java.util.ArrayList<Uri> us=new java.util.ArrayList<>();
      if(Intent.ACTION_SEND.equals(a)){ Object x=intent.getParcelableExtra(Intent.EXTRA_STREAM); if(x instanceof Uri) us.add((Uri)x); }
      else { java.util.ArrayList<android.os.Parcelable> l=intent.getParcelableArrayListExtra(Intent.EXTRA_STREAM); if(l!=null) for(android.os.Parcelable q: l) if(q instanceof Uri) us.add((Uri)q); }
      if(us.isEmpty()) return false;
      android.content.ContentResolver cr=act.getContentResolver();
      boolean any=false;
      synchronized(sharedUris){
        for(Uri u: us){
          if(sharedUris.size()>=10) break;
          String mt=null; try{ mt=cr.getType(u); }catch(Exception ignored){}
          if(mt==null) mt=t;
          if(mt==null) continue;
          if(mt.startsWith("image/") || mt.equals("application/pdf")){ sharedUris.add(u); sharedTypes.add(mt); any=true; }
        }
      }
      if(any){ intent.setAction(Intent.ACTION_MAIN); intent.removeExtra(Intent.EXTRA_STREAM); }
      return any;
    }catch(Exception e){ return false; }
  }
  private Bitmap renderPdfFirstPage(Uri u) throws Exception {
    android.os.ParcelFileDescriptor pfd=getContext().getContentResolver().openFileDescriptor(u,"r");
    if(pfd==null) return null;
    try(android.graphics.pdf.PdfRenderer r=new android.graphics.pdf.PdfRenderer(pfd)){
      if(r.getPageCount()<1) return null;
      try(android.graphics.pdf.PdfRenderer.Page pg=r.openPage(0)){
        int w=pg.getWidth(), h=pg.getHeight(); float k=1600f/Math.max(1,Math.max(w,h));
        Bitmap b=Bitmap.createBitmap(Math.max(1,Math.round(w*k)),Math.max(1,Math.round(h*k)),Bitmap.Config.ARGB_8888);
        b.eraseColor(android.graphics.Color.WHITE);
        pg.render(b,null,null,android.graphics.pdf.PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY);
        return b;
      }
    }
  }
  @com.getcapacitor.PluginMethod public void takeShared(PluginCall call){
    java.util.ArrayList<Uri> us; java.util.ArrayList<String> ts;
    synchronized(sharedUris){ us=new java.util.ArrayList<>(sharedUris); ts=new java.util.ArrayList<>(sharedTypes); sharedUris.clear(); sharedTypes.clear(); }
    com.getcapacitor.JSArray arr=new com.getcapacitor.JSArray();
    int failed=0;
    for(int i=0;i<us.size();i++){
      try{
        boolean pdf="application/pdf".equals(ts.get(i));
        Bitmap b=pdf? renderPdfFirstPage(us.get(i)) : decodeScaled(getContext(),us.get(i),1600);
        if(b==null){ failed++; continue; }
        ByteArrayOutputStream bo=new ByteArrayOutputStream();
        b.compress(Bitmap.CompressFormat.JPEG,82,bo);
        arr.put(new JSObject().put("data",Base64.encodeToString(bo.toByteArray(),Base64.NO_WRAP)).put("mime","image/jpeg").put("pdf",pdf));
      }catch(Throwable e){ failed++; }
    }
    call.resolve(new JSObject().put("items",arr).put("failed",failed));
  }
  /* انتخاب از گالری با انتخابگر خود اندروید: HEIC و عکس‌های خیلی بزرگ هم اینجا خوانده می‌شوند
     (ImageDecoder از اندروید ۹ با کوچک‌کردن هنگام خواندن و چرخش EXIF؛ پیش از آن BitmapFactory با inSampleSize + EXIF)؛ خروجی JPEG کوچک‌شده */
  @com.getcapacitor.PluginMethod public void pickImage(PluginCall call){
    try{
      Intent i=new Intent(Intent.ACTION_GET_CONTENT); i.setType("image/*"); i.addCategory(Intent.CATEGORY_OPENABLE);
      /* ۱.۳.۵۳: چند عکس با هم (نگه داشتن روی یک عکس در گالری = حالت انتخاب چندتایی) */
      i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE,true);
      startActivityForResult(call,i,"pickCb");
    }catch(Exception e){ call.reject("picker_failed",e); }
  }
  @ActivityCallback private void pickCb(PluginCall call, ActivityResult result){
    if(call==null) return;
    try{
      Intent d=result.getData();
      java.util.ArrayList<Uri> uris=new java.util.ArrayList<>();
      if(d!=null && d.getClipData()!=null){ android.content.ClipData cd=d.getClipData(); for(int k=0;k<cd.getItemCount()&&k<10;k++){ Uri cu=cd.getItemAt(k).getUri(); if(cu!=null) uris.add(cu); } }
      else if(d!=null && d.getData()!=null) uris.add(d.getData());
      if(result.getResultCode()!=android.app.Activity.RESULT_OK || uris.isEmpty()){ call.reject("cancelled"); return; }
      com.getcapacitor.JSArray items=new com.getcapacitor.JSArray();
      String first=null;
      for(Uri u:uris){
        Bitmap out=decodeScaled(getContext(),u,1600);
        if(out==null) continue;
        ByteArrayOutputStream bo=new ByteArrayOutputStream();
        out.compress(Bitmap.CompressFormat.JPEG,82,bo);
        String b64=Base64.encodeToString(bo.toByteArray(),Base64.NO_WRAP);
        if(first==null) first=b64;
        items.put(new JSObject().put("data",b64).put("mime","image/jpeg"));
      }
      if(first==null){ call.reject("decode_failed"); return; }
      call.resolve(new JSObject().put("data",first).put("mime","image/jpeg").put("items",items));
    }catch(Throwable e){ call.reject("pick_failed",e instanceof Exception?(Exception)e:new Exception(e)); }
  }
}
