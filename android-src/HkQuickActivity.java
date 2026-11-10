package ir.hesabketab.app;

import android.app.Activity;
import android.content.Intent;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.os.Bundle;
import android.text.InputType;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import org.json.JSONObject;

public class HkQuickActivity extends Activity {
  /* ۱.۳.۸۲: فونت نرم‌افزار (وزیر) همه‌جا؛ بولد بماند بولد */
  private Typeface hkFB, hkFR;
  @Override public void setContentView(View v){ hkVazir(v); super.setContentView(v); }
  void hkVazir(View v){
    try{ if(hkFB==null){ hkFB=androidx.core.content.res.ResourcesCompat.getFont(this, R.font.hk_vazir_bold); hkFR=androidx.core.content.res.ResourcesCompat.getFont(this, R.font.hk_vazir_regular); } }catch(Exception ignored){}
    if(v instanceof TextView){ TextView tv=(TextView)v; Typeface cur=tv.getTypeface(); Typeface f=(cur!=null && cur.isBold())?hkFB:hkFR; if(f!=null) tv.setTypeface(f); }
    else if(v instanceof android.view.ViewGroup){ android.view.ViewGroup g=(android.view.ViewGroup)v; for(int i=0;i<g.getChildCount();i++) hkVazir(g.getChildAt(i)); }
  }
  private int nid;
  private LinearLayout box;
  private int dp(float v){ return (int)TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP,v,getResources().getDisplayMetrics()); }
  private GradientDrawable round(int color,float r){ GradientDrawable g=new GradientDrawable(); g.setColor(color); g.setCornerRadius(dp(r)); return g; }
  /** ۱.۳.۴۵: همهٔ نوشته‌ها راست‌چین */
  private void rtl(TextView v){ v.setGravity(Gravity.RIGHT); v.setTextDirection(View.TEXT_DIRECTION_RTL); v.setTextAlignment(View.TEXT_ALIGNMENT_GRAVITY); }
  private LinearLayout.LayoutParams full(){ return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT); }

  @Override protected void onCreate(Bundle b){
    super.onCreate(b);
    getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE|WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE);
    /* ۱.۳.۴۶: پنجرهٔ شناور بالای صفحه (کیبورد پایین باز می‌شود و روی «ثبت» نمی‌آید) */
    try{
      getWindow().setBackgroundDrawable(new android.graphics.drawable.ColorDrawable(0x00000000));
      getWindow().setLayout(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT);
      WindowManager.LayoutParams wl=getWindow().getAttributes(); wl.gravity=Gravity.TOP; wl.y=dp(56); wl.dimAmount=0.45f; getWindow().setAttributes(wl);
      getWindow().addFlags(WindowManager.LayoutParams.FLAG_DIM_BEHIND);
    }catch(Exception ignored){}
    nid=getIntent()!=null?getIntent().getIntExtra("nid",0):0;
    JSONObject it=nid!=0?HkQuickReplyReceiver.findItem(this,nid):null;
    ScrollView sv=new ScrollView(this);
    box=new LinearLayout(this);
    box.setOrientation(LinearLayout.VERTICAL);
    box.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
    box.setPadding(dp(18),dp(18),dp(18),dp(18));
    box.setBackground(round(0xFF1C1C1E,22));
    LinearLayout.LayoutParams outer=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT);
    sv.setPadding(dp(10),dp(10),dp(10),dp(10));
    sv.addView(box,outer);
    setContentView(sv);
    if(it==null){ showGone(); return; }
    String text=it.optString("text",""), sender=it.optString("sender","");
    boolean personal=BankSmsReceiver.isPersonal(sender);
    TextView t=new TextView(this);
    /* ۱.۳.۶۴: عنوان به رنگ عملیات (سبز واریز / قرمز برداشت نرم‌افزار) */
    final int qsg=BankSmsReceiver.txSign(text);
    t.setText(personal?("⚠️ پیامک شخصی \u2066"+sender.replace(" ","")+"\u2069"):BankSmsReceiver.txTitle(qsg));
    t.setTextColor(personal?0xFFFF9F0A:(qsg>0?0xFF9EE858:(qsg<0?0xFFFF6B4A:0xFFFFFFFF))); t.setTextSize(17); t.setTypeface(Typeface.DEFAULT_BOLD); rtl(t);
    box.addView(t,full());
    if(personal){
      TextView w=new TextView(this);
      w.setText("از سرشمارهٔ بانک نیامده؛ اگر مطمئنید ثبت کنید");
      w.setTextColor(0xFFFFB340); w.setTextSize(13); w.setPadding(0,dp(4),0,0); rtl(w);
      box.addView(w,full());
    }
    TextView sms=new TextView(this);
    sms.setText(text); sms.setTextColor(0xFFD1D1D6); sms.setTextSize(14); sms.setLineSpacing(0,1.15f);
    sms.setPadding(dp(14),dp(10),dp(14),dp(10)); rtl(sms);
    /* متن پیامک آخرِ باکس و در قاب کوتاهِ قابل اسکرول */
    ScrollView smsSv=new ScrollView(this); smsSv.setBackground(round(0xFF2C2C2E,14)); smsSv.addView(sms);
    final EditText et=new EditText(this);
    et.setHint("بابت چی بود؟ (شرح)"); et.setHintTextColor(0xFF8E8E93); et.setTextColor(0xFFFFFFFF); et.setTextSize(19);
    et.setSingleLine(true); et.setInputType(InputType.TYPE_CLASS_TEXT|InputType.TYPE_TEXT_FLAG_CAP_SENTENCES); et.setImeOptions(EditorInfo.IME_ACTION_DONE);
    /* ۱.۳.۶۴: هایلایت آبی (همان آبی نرم‌افزار) تا فیلد شرح سریع پیدا شود */
    /* ۱.۳.۹۸: فیلد «بابت چی بود؟» به رنگ نوع تراکنش: برداشت نارنجی، واریز سبز نرم‌افزار */ int etC=qsg>0?0xFF9EE858:(qsg<0?0xFFFF6B4A:0xFF08B5F5); GradientDrawable etBg=round((etC&0x00FFFFFF)|0x26000000,14); etBg.setStroke(Math.max(2,dp(1.5f)),etC); et.setBackground(etBg); et.setPadding(dp(14),dp(12),dp(14),dp(12)); et.setGravity(Gravity.RIGHT|Gravity.CENTER_VERTICAL); et.setTextDirection(View.TEXT_DIRECTION_RTL); et.setTextAlignment(View.TEXT_ALIGNMENT_GRAVITY);
    /* ۱.۳.۴۵: نشانگر تایپ سفید (قبلاً مشکی و نامعلوم بود) */
    if(android.os.Build.VERSION.SDK_INT>=29){ GradientDrawable cur=new GradientDrawable(); cur.setColor(0xFFFFFFFF); cur.setSize(dp(2),dp(22)); et.setTextCursorDrawable(cur); }
    LinearLayout.LayoutParams lp2=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,dp(54)); lp2.topMargin=dp(12);
    box.addView(et,lp2);
    LinearLayout row=new LinearLayout(this); row.setOrientation(LinearLayout.HORIZONTAL); row.setLayoutDirection(View.LAYOUT_DIRECTION_RTL);
    /* ۱.۳.۴۵: دو دکمهٔ هم‌اندازه با قلم هم‌سایز؛ «ثبت» سبز مات مبالغ درآمد نرم‌افزار */
    Button ok=new Button(this); ok.setText("ثبت"); ok.setAllCaps(false); ok.setTextColor(0xFF10200A); ok.setTextSize(15); ok.setTypeface(Typeface.DEFAULT_BOLD); ok.setBackground(round(0xD99EE858,14));
    Button open=new Button(this); open.setText("باز کردن نرم‌افزار"); open.setAllCaps(false); open.setTextColor(0xFFFFFFFF); open.setTextSize(15); open.setTypeface(Typeface.DEFAULT_BOLD); open.setBackground(round(0xFF3A3A3C,14));
    LinearLayout.LayoutParams bl=new LinearLayout.LayoutParams(0,dp(50),1f); LinearLayout.LayoutParams bl2=new LinearLayout.LayoutParams(0,dp(50),1f); bl2.setMarginStart(dp(10));
    row.addView(ok,bl); row.addView(open,bl2);
    LinearLayout.LayoutParams lp3=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.WRAP_CONTENT); lp3.topMargin=dp(12);
    box.addView(row,lp3);
    LinearLayout.LayoutParams lp=new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,Math.min(dp(150),ViewGroup.LayoutParams.WRAP_CONTENT)); lp.topMargin=dp(12);
    smsSv.setLayoutParams(lp);
    box.addView(smsSv);
    smsSv.post(()->{ try{ if(smsSv.getHeight()>dp(150)){ ViewGroup.LayoutParams q=smsSv.getLayoutParams(); q.height=dp(150); smsSv.setLayoutParams(q);} }catch(Exception ignored){} });
    ok.setOnClickListener(v->submit(et.getText().toString()));
    et.setOnEditorActionListener((v,a,e)->{ if(a==EditorInfo.IME_ACTION_DONE){ submit(et.getText().toString()); return true; } return false; });
    open.setOnClickListener(v->{ try{ Intent li=getPackageManager().getLaunchIntentForPackage(getPackageName()); if(li!=null){ li.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK|Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP); startActivity(li); } }catch(Exception ignored){} finish(); });
    et.requestFocus();
  }

  private void submit(String raw){
    String desc=raw==null?"":raw.trim(); if(desc.length()>200) desc=desc.substring(0,200);
    boolean found=HkQuickReplyReceiver.saveDesc(this,nid,desc);
    HkQuickReplyReceiver.notifyDone(this,nid,desc,found);
    try{ ((android.view.inputmethod.InputMethodManager)getSystemService(INPUT_METHOD_SERVICE)).hideSoftInputFromWindow(box.getWindowToken(),0); }catch(Exception ignored){}
    if(!found){ showGone(); return; }
    box.removeAllViews();
    box.setGravity(Gravity.CENTER_HORIZONTAL);
    ImageView iv=new ImageView(this); iv.setImageBitmap(HkQuickReplyReceiver.tick(dp(56)));
    box.addView(iv,new LinearLayout.LayoutParams(dp(56),dp(56)));
    TextView d=new TextView(this); d.setText(desc.isEmpty()?"بدون شرح":"بابت: "+desc); d.setTextColor(0xFFFFFFFF); d.setTextSize(16); d.setGravity(Gravity.CENTER); d.setPadding(0,dp(12),0,0);
    box.addView(d);
    TextView ok=new TextView(this); ok.setText("ثبت شد"); ok.setTextColor(0xFF30D158); ok.setTextSize(18); ok.setTypeface(Typeface.DEFAULT_BOLD); ok.setGravity(Gravity.CENTER); ok.setPadding(0,dp(6),0,0);
    box.addView(ok);
    hkVazir(box);
    box.postDelayed(this::finish,1300);
  }

  private void showGone(){
    box.removeAllViews();
    TextView t=new TextView(this); t.setText("این تراکنش قبلاً ثبت یا رد شده"); t.setTextColor(0xFFFFFFFF); t.setTextSize(16); t.setGravity(Gravity.CENTER);
    box.addView(t);
    hkVazir(box);
    box.postDelayed(this::finish,1600);
  }
}
