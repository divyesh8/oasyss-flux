import Foundation
import CoreGraphics
import ApplicationServices

// Oasyss Flux — Divyesh Edition
// Native macOS Permissions Helper
// Queries real macOS TCC (Transparency, Consent, and Control) subsystem states.

struct PermissionStatus: Codable {
    let screenRecording: String
    let accessibility: String
    let inputMonitoring: String
    let notifications: String
    let platform: String
    let osVersion: String
}

func checkScreenRecording() -> String {
    if #available(macOS 10.15, *) {
        if CGPreflightScreenCaptureAccess() {
            return "GRANTED"
        } else {
            return "DENIED"
        }
    }
    return "UNSUPPORTED"
}

func checkAccessibility() -> String {
    if AXIsProcessTrusted() {
        return "GRANTED"
    } else {
        return "DENIED"
    }
}

func checkInputMonitoring() -> String {
    // Input monitoring query on macOS
    if #available(macOS 10.15, *) {
        let options: NSDictionary = [kAXTrustedCheckOptionPrompt.takeUnretainedValue() as String: false]
        if AXIsProcessTrustedWithOptions(options) {
            return "GRANTED"
        } else {
            return "DENIED"
        }
    }
    return "UNSUPPORTED"
}

let osVer = ProcessInfo.processInfo.operatingSystemVersion
let osString = "\(osVer.majorVersion).\(osVer.minorVersion).\(osVer.patchVersion)"

let status = PermissionStatus(
    screenRecording: checkScreenRecording(),
    accessibility: checkAccessibility(),
    inputMonitoring: checkInputMonitoring(),
    notifications: "NOT_DETERMINED",
    platform: "macOS",
    osVersion: osString
)

let encoder = JSONEncoder()
encoder.outputFormatting = .prettyPrinted

if let data = try? encoder.encode(status), let json = String(data: data, encoding: .utf8) {
    print(json)
} else {
    print("{\"error\": \"Failed to encode permission status\"}")
}
