package ir.hesabketab.app;

import android.app.KeyguardManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.os.Build;
import android.os.PowerManager;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import androidx.fragment.app.FragmentActivity;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.concurrent.Executor;

@CapacitorPlugin(name="AppLock")
public class AppLockPlugin extends Plugin {
  static final String PREFS = "app_lock_secure_v1";
  static final String K_HASH = "pin_hash";
  static final String K_SALT = "pin_salt";
  static final String K_ENABLED = "enabled";
  static final String K_BIO = "bio_enabled";
  static final String K_LEN = "pin_len";
  static final String K_AUTO = "auto_lock_sec";
  /** فقط وقتی صفحه گوشی واقعاً خاموش/قفل شده — مستقل از onPause تعویض اپ */
  static final String K_WAS_LOCKED = "device_was_locked";

  private BroadcastReceiver screenOffReceiver;

  private SharedPreferences sp() {
    return getContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
  }

  private void markDeviceLocked() {
    try { sp().edit().putBoolean(K_WAS_LOCKED, true).apply(); } catch (Exception ignored) {}
  }

  private boolean isScreenOff() {
    try {
      PowerManager pm = (PowerManager) getContext().getSystemService(Context.POWER_SERVICE);
      if (pm != null && !pm.isInteractive()) return true;
    } catch (Exception ignored) {}
    return false;
  }

  private boolean isKeyguardLockedNow() {
    try {
      KeyguardManager km = (KeyguardManager) getContext().getSystemService(Context.KEYGUARD_SERVICE);
      if (km != null && km.isKeyguardLocked()) return true;
    } catch (Exception ignored) {}
    return false;
  }

  @Override
  public void load() {
    super.load();
    try {
      if (screenOffReceiver == null) {
        screenOffReceiver = new BroadcastReceiver() {
          @Override public void onReceive(Context context, Intent intent) {
            if (intent != null && Intent.ACTION_SCREEN_OFF.equals(intent.getAction())) {
              markDeviceLocked();
            }
          }
        };
        IntentFilter f = new IntentFilter(Intent.ACTION_SCREEN_OFF);
        Context appCtx = getContext().getApplicationContext();
        if (Build.VERSION.SDK_INT >= 33) {
          appCtx.registerReceiver(screenOffReceiver, f, Context.RECEIVER_NOT_EXPORTED);
        } else {
          appCtx.registerReceiver(screenOffReceiver, f);
        }
      }
    } catch (Exception ignored) {}
  }

  @Override
  protected void handleOnPause() {
    super.handleOnPause();
    // تعویض اپ → صفحه روشن → هیچ DEVICE_LOCK
    // قفل صفحه → صفحه خاموش یا keyguard → DEVICE_LOCK
    if (isScreenOff() || isKeyguardLockedNow()) {
      markDeviceLocked();
    }
  }

  @Override
  protected void handleOnStop() {
    super.handleOnStop();
    if (isScreenOff() || isKeyguardLockedNow()) {
      markDeviceLocked();
    }
  }

  private static String toHex(byte[] b) {
    StringBuilder sb = new StringBuilder(b.length * 2);
    for (byte x : b) sb.append(String.format("%02x", x));
    return sb.toString();
  }

  private static byte[] fromHex(String s) {
    int n = s.length();
    byte[] out = new byte[n / 2];
    for (int i = 0; i < n; i += 2) {
      out[i / 2] = (byte) Integer.parseInt(s.substring(i, i + 2), 16);
    }
    return out;
  }

  private static String sha256(String pin, byte[] salt) throws Exception {
    MessageDigest md = MessageDigest.getInstance("SHA-256");
    md.update(salt);
    md.update(pin.getBytes("UTF-8"));
    byte[] once = md.digest();
    md.reset();
    md.update(salt);
    md.update(once);
    return toHex(md.digest());
  }

  @com.getcapacitor.PluginMethod
  public void isEnabled(PluginCall call) {
    boolean en = sp().getBoolean(K_ENABLED, false) && sp().contains(K_HASH);
    call.resolve(new JSObject().put("enabled", en));
  }

  @com.getcapacitor.PluginMethod
  public void getPinLength(PluginCall call) {
    call.resolve(new JSObject().put("length", sp().getInt(K_LEN, 6)));
  }

  @com.getcapacitor.PluginMethod
  public void setPin(PluginCall call) {
    try {
      String pin = call.getString("pin", "");
      if (pin == null) pin = "";
      pin = pin.replaceAll("[^0-9]", "");
      if (!(pin.length() == 4 || pin.length() == 6)) {
        call.reject("pin_invalid_length");
        return;
      }
      byte[] salt = new byte[16];
      new SecureRandom().nextBytes(salt);
      String hash = sha256(pin, salt);
      sp().edit()
        .putString(K_HASH, hash)
        .putString(K_SALT, toHex(salt))
        .putBoolean(K_ENABLED, true)
        .putInt(K_LEN, pin.length())
        .apply();
      call.resolve(new JSObject().put("ok", true));
    } catch (Exception e) {
      call.reject("set_pin_failed", e);
    }
  }

  @com.getcapacitor.PluginMethod
  public void verifyPin(PluginCall call) {
    try {
      String pin = call.getString("pin", "");
      if (pin == null) pin = "";
      pin = pin.replaceAll("[^0-9]", "");
      String hash = sp().getString(K_HASH, null);
      String saltHex = sp().getString(K_SALT, null);
      if (hash == null || saltHex == null) {
        call.resolve(new JSObject().put("ok", false));
        return;
      }
      String h = sha256(pin, fromHex(saltHex));
      call.resolve(new JSObject().put("ok", hash.equals(h)));
    } catch (Exception e) {
      call.resolve(new JSObject().put("ok", false));
    }
  }

  @com.getcapacitor.PluginMethod
  public void disable(PluginCall call) {
    sp().edit().clear().apply();
    call.resolve(new JSObject().put("ok", true));
  }

  @com.getcapacitor.PluginMethod
  public void isBiometricEnabled(PluginCall call) {
    call.resolve(new JSObject().put("enabled", sp().getBoolean(K_BIO, false)));
  }

  @com.getcapacitor.PluginMethod
  public void setBiometricEnabled(PluginCall call) {
    boolean on = false;
    try { Boolean v = call.getBoolean("enabled", false); if (v != null) on = v; } catch (Exception ignored) {}
    sp().edit().putBoolean(K_BIO, on).apply();
    call.resolve(new JSObject().put("ok", true));
  }

  @com.getcapacitor.PluginMethod
  public void getAutoLockSeconds(PluginCall call) {
    call.resolve(new JSObject().put("seconds", sp().getInt(K_AUTO, 0)));
  }

  @com.getcapacitor.PluginMethod
  public void setAutoLockSeconds(PluginCall call) {
    int sec = 0;
    try { Integer v = call.getInt("seconds", 0); if (v != null) sec = v; } catch (Exception ignored) {}
    sp().edit().putInt(K_AUTO, sec).apply();
    call.resolve(new JSObject().put("ok", true));
  }

  /** فقط flag مربوط به DEVICE_LOCK را برمی‌گرداند و پاک می‌کند — مستقل از TIMEOUT و APP_EXIT */
  @com.getcapacitor.PluginMethod
  public void consumeDeviceLockedFlag(PluginCall call) {
    boolean was = false;
    try {
      was = sp().getBoolean(K_WAS_LOCKED, false);
      sp().edit().putBoolean(K_WAS_LOCKED, false).apply();
    } catch (Exception ignored) {}
    call.resolve(new JSObject().put("wasLocked", was));
  }

  @com.getcapacitor.PluginMethod
  public void isDeviceLocked(PluginCall call) {
    call.resolve(new JSObject().put("locked", isScreenOff() || isKeyguardLockedNow()));
  }

  @com.getcapacitor.PluginMethod
  public void canUseBiometric(PluginCall call) {
    try {
      BiometricManager bm = BiometricManager.from(getContext());
      int can = bm.canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_WEAK);
      boolean ok = (can == BiometricManager.BIOMETRIC_SUCCESS);
      call.resolve(new JSObject().put("available", ok));
    } catch (Exception e) {
      call.resolve(new JSObject().put("available", false));
    }
  }

  @com.getcapacitor.PluginMethod
  public void authenticateBiometric(PluginCall call) {
    call.setKeepAlive(true);
    try {
      final FragmentActivity act = (FragmentActivity) getActivity();
      if (act == null) { call.reject("no_activity"); return; }
      final Executor ex = ContextCompat.getMainExecutor(getContext());
      final String title = call.getString("title", "احراز هویت");
      final String subtitle = call.getString("subtitle", "");
      act.runOnUiThread(new Runnable() {
        @Override public void run() {
          try {
            BiometricPrompt prompt = new BiometricPrompt(act, ex, new BiometricPrompt.AuthenticationCallback() {
              @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) {
                call.resolve(new JSObject().put("ok", true));
              }
              @Override public void onAuthenticationError(int errorCode, CharSequence errString) {
                call.resolve(new JSObject().put("ok", false).put("error", String.valueOf(errString)));
              }
              @Override public void onAuthenticationFailed() {
              }
            });
            BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
              .setTitle(title != null ? title : "احراز هویت")
              .setSubtitle(subtitle != null ? subtitle : "")
              .setNegativeButtonText("انصراف")
              .setAllowedAuthenticators(BiometricManager.Authenticators.BIOMETRIC_WEAK)
              .setConfirmationRequired(false)
              .build();
            prompt.authenticate(info);
          } catch (Exception e) {
            call.reject("bio_failed", e);
          }
        }
      });
    } catch (Exception e) {
      call.reject("bio_failed", e);
    }
  }
}
