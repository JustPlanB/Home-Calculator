const fs = require('fs'), path = require('path');

const root = path.resolve(__dirname, '..');
const pkg = 'ir.hesabketab.app';
const base = path.join(root, 'android');
const javaDir = path.join(base, 'app/src/main/java', ...pkg.split('.'));

fs.mkdirSync(javaDir, { recursive: true });

const receiver = String.raw`package ${pkg};

import android.Manifest;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.provider.Telephony;
import android.telephony.SmsMessage;

import androidx.core.app.NotificationCompat;

import org.json.JSONArray;
import org.json.JSONObject;

public class BankSmsReceiver extends BroadcastReceiver {

    static final String PREFS = "bank_sms_bridge";
    static final String QUEUE = "pending_queue";
    static final String CHANNEL = "bank_sms";

    @Override
    public void onReceive(Context context, Intent intent) {

        if (!Telephony.Sms.Intents.SMS_RECEIVED_ACTION.equals(intent.getAction())) {
            return;
        }

        if (context.checkSelfPermission(Manifest.permission.RECEIVE_SMS)
                != PackageManager.PERMISSION_GRANTED) {
            return;
        }

        SmsMessage[] msgs =
                Telephony.Sms.Intents.getMessagesFromIntent(intent);

        if (msgs == null || msgs.length == 0) {
            return;
        }

        StringBuilder body = new StringBuilder();
        String sender = msgs[0].getOriginatingAddress();
        long ts = msgs[0].getTimestampMillis();

        for (SmsMessage m : msgs) {
            if (m != null && m.getMessageBody() != null) {
                body.append(m.getMessageBody()).append("\\n");
            }
        }

        String text = body.toString().trim();

        if (!looksLikeBankTransaction(text)) {
            return;
        }

        SharedPreferences sp =
                context.getSharedPreferences(PREFS, Context.MODE_PRIVATE);

        try {

            JSONArray q =
                    new JSONArray(sp.getString(QUEUE, "[]"));

            long now = System.currentTimeMillis();

            // جلوگیری از ثبت دوباره همان پیام
            for (int i = 0; i < q.length(); i++) {

                JSONObject x = q.optJSONObject(i);

                if (x != null
                        && text.equals(x.optString("text"))
                        && now - x.optLong("receivedAt", 0) < 60000) {

                    return;
                }
            }

            JSONObject item = new JSONObject();

            item.put("text", text);
            item.put(
                    "sender",
                    sender == null ? "" : sender
            );
            item.put(
                    "receivedAt",
                    ts > 0 ? ts : now
            );

            q.put(item);

            // حداکثر 20 پیام در صف
            while (q.length() > 20) {

                JSONArray nq = new JSONArray();

                for (int i = 1; i < q.length(); i++) {
                    nq.put(q.get(i));
                }

                q = nq;
            }

            sp.edit()
                    .putString(QUEUE, q.toString())
                    .apply();

            postNotification(context, text);

        } catch (Exception ignored) {
        }
    }

    static boolean looksLikeBankTransaction(String s) {

        String t =
                s.toLowerCase(java.util.Locale.ROOT);

        boolean tx =
                t.contains("واریز")
                || t.contains("برداشت")
                || t.contains("کسر")
                || t.contains("خرید")
                || t.contains("انتقال")
                || t.contains("پرداخت")
                || t.contains("deposit")
                || t.contains("withdraw");

        boolean money =
                t.matches("(?s).*\\d[\\d,٬،. ]{2,}.*");

        boolean bank =
                t.contains("بانک")
                || t.contains("موجودی")
                || t.contains("مانده")
                || t.contains("کارت")
                || t.contains("حساب")
                || t.contains("atm")
                || t.contains("pos")
                || t.contains("mellat")
                || t.contains("melli")
                || t.contains("tejarat")
                || t.contains("saderat");

        return tx && money && bank;
    }

    static void postNotification(Context c, String text) {

        if (Build.VERSION.SDK_INT >= 33
                && c.checkSelfPermission(
                        Manifest.permission.POST_NOTIFICATIONS)
                != PackageManager.PERMISSION_GRANTED) {

           
