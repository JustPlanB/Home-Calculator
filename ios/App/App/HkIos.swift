import UIKit
import Capacitor
import AppIntents

// حساب‌کتاب — بخش‌های بومی iOS
// - اکشن «ثبت پیامک بانکی» برای برنامهٔ میان‌برها (Shortcuts): متن پیامک را می‌گیرد و فقط روی همین گوشی در صف می‌گذارد.
//   تجزیه و ثبت ردیف با باز شدن نرم‌افزار، با همان مسیر نسخهٔ اندروید (parseBankSms / enqueueBankSms) انجام می‌شود.
// - افزونهٔ HkIosSms برای خواندن و خالی کردن همان صف از سمت جاوااسکریپت.
// هیچ چیزی از گوشی بیرون فرستاده نمی‌شود.

enum HkSmsQueue {
    static let key = "hk_ios_sms_queue"
    static let maxItems = 200
    static let maxLen = 2000

    static func push(_ text: String) -> Bool {
        let t = text.trimmingCharacters(in: .whitespacesAndNewlines)
        if t.isEmpty { return false }
        let clipped = String(t.prefix(maxLen))
        let d = UserDefaults.standard
        var arr = d.array(forKey: key) as? [[String: Any]] ?? []
        arr.append(["t": clipped, "ts": Int(Date().timeIntervalSince1970 * 1000)])
        if arr.count > maxItems { arr.removeFirst(arr.count - maxItems) }
        d.set(arr, forKey: key)
        return true
    }

    static func drain() -> [[String: Any]] {
        let d = UserDefaults.standard
        let arr = d.array(forKey: key) as? [[String: Any]] ?? []
        d.removeObject(forKey: key)
        return arr
    }

    static func count() -> Int {
        return (UserDefaults.standard.array(forKey: key) as? [Any])?.count ?? 0
    }

    static func clear() { UserDefaults.standard.removeObject(forKey: key) }
}

@available(iOS 16.0, *)
struct HkImportBankSmsIntent: AppIntent {
    static var title: LocalizedStringResource = "ثبت پیامک بانکی"
    static var description = IntentDescription("متن پیامک بانکی را به حساب‌کتاب می‌دهد تا با باز شدن نرم‌افزار ثبت شود. همه‌چیز روی همین گوشی می‌ماند.")
    static var openAppWhenRun: Bool = false

    @Parameter(title: "متن پیامک")
    var text: String

    func perform() async throws -> some IntentResult {
        _ = HkSmsQueue.push(text)
        return .result()
    }
}

@available(iOS 16.0, *)
struct HkAppShortcuts: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(intent: HkImportBankSmsIntent(),
                    phrases: ["ثبت پیامک بانکی در \(.applicationName)", "Import bank SMS in \(.applicationName)"],
                    shortTitle: "ثبت پیامک بانکی",
                    systemImageName: "text.bubble")
    }
}

@objc(HkIosSmsPlugin)
public class HkIosSmsPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "HkIosSmsPlugin"
    public let jsName = "HkIosSms"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "drain", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "count", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise)
    ]

    @objc func drain(_ call: CAPPluginCall) {
        call.resolve(["items": HkSmsQueue.drain()])
    }

    @objc func count(_ call: CAPPluginCall) {
        call.resolve(["count": HkSmsQueue.count()])
    }

    @objc func clear(_ call: CAPPluginCall) {
        HkSmsQueue.clear()
        call.resolve()
    }
}

/// ریشهٔ صفحهٔ نرم‌افزار؛ افزونه‌های داخل خود برنامه این‌جا ثبت می‌شوند
class HkBridgeViewController: CAPBridgeViewController {
    override open func capacitorDidLoad() {
        bridge?.registerPluginInstance(HkIosSmsPlugin())
    }
}
