import Foundation
import Security

// Oasyss Flux — Divyesh Edition
// Native macOS Keychain Helper (Hardened & Stdin Protocol)
// Interfaces directly with Apple Security.framework for secure credential storage.
// SECRETS ARE READ EXCLUSIVELY VIA STDIN TO PREVENT ARGV LEAKAGE.

let serviceName = "com.divyesh.oasyssflux"

func setSecret(account: String, secretData: Data) -> Bool {
    guard !secretData.isEmpty else { return false }

    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: serviceName,
        kSecAttrAccount as String: account
    ]

    // Check if item already exists
    let status = SecItemCopyMatching(query as CFDictionary, nil)

    if status == errSecSuccess {
        // Update existing item
        let attributesToUpdate: [String: Any] = [
            kSecValueData as String: secretData
        ]
        let updateStatus = SecItemUpdate(query as CFDictionary, attributesToUpdate as CFDictionary)
        return updateStatus == errSecSuccess
    } else if status == errSecItemNotFound {
        // Add new item
        var newItem = query
        newItem[kSecValueData as String] = secretData
        newItem[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlocked
        let addStatus = SecItemAdd(newItem as CFDictionary, nil)
        return addStatus == errSecSuccess
    }
    return false
}

func getSecret(account: String) -> String? {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: serviceName,
        kSecAttrAccount as String: account,
        kSecReturnData as String: true,
        kSecMatchLimit as String: kSecMatchLimitOne
    ]

    var dataTypeRef: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &dataTypeRef)

    if status == errSecSuccess, let data = dataTypeRef as? Data, let secret = String(data: data, encoding: .utf8) {
        return secret
    }
    return nil
}

func deleteSecret(account: String) -> Bool {
    let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: serviceName,
        kSecAttrAccount as String: account
    ]
    let status = SecItemDelete(query as CFDictionary)
    return status == errSecSuccess || status == errSecItemNotFound
}

let args = CommandLine.arguments

if args.count < 3 {
    let errJson = ["error": "Usage: flux-keychain-helper <get|set|delete> <account>"]
    if let data = try? JSONSerialization.data(withJSONObject: errJson), let str = String(data: data, encoding: .utf8) {
        print(str)
    }
    exit(1)
}

let action = args[1]
let account = args[2]

// Validate account name: alphanumeric, underscore, dot, hyphen, max 128 chars
let accountRegex = try! NSRegularExpression(pattern: "^[a-zA-Z0-9_.-]{1,128}$")
let range = NSRange(location: 0, length: account.utf16.count)
guard accountRegex.firstMatch(in: account, options: [], range: range) != nil else {
    let errJson = ["success": false, "error": "Invalid account identifier format"] as [String : Any]
    if let data = try? JSONSerialization.data(withJSONObject: errJson), let str = String(data: data, encoding: .utf8) {
        print(str)
    }
    exit(1)
}

switch action {
case "get":
    if let secret = getSecret(account: account) {
        let json = ["success": true, "secret": secret] as [String : Any]
        if let data = try? JSONSerialization.data(withJSONObject: json), let str = String(data: data, encoding: .utf8) {
            print(str)
        }
    } else {
        print("{\"success\": false, \"message\": \"Item not found in Keychain\"}")
    }
case "set":
    // Read secret exclusively from standard input (stdin)
    let stdinHandle = FileHandle.standardInput
    let secretData = stdinHandle.readDataToEndOfFile()
    
    // Trim trailing newline or whitespace if any
    var trimmedData = secretData
    if let str = String(data: secretData, encoding: .utf8)?.trimmingCharacters(in: .whitespacesAndNewlines),
       let utf8 = str.data(using: .utf8) {
        trimmedData = utf8
    }

    guard !trimmedData.isEmpty else {
        print("{\"success\": false, \"error\": \"No secret provided on stdin\"}")
        exit(1)
    }

    let ok = setSecret(account: account, secretData: trimmedData)
    print("{\"success\": \(ok)}")
    exit(ok ? 0 : 1)
case "delete":
    let ok = deleteSecret(account: account)
    print("{\"success\": \(ok)}")
    exit(ok ? 0 : 1)
default:
    print("{\"error\": \"Unknown action\"}")
    exit(1)
}
