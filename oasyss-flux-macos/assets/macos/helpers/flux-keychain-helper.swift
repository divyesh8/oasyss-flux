import Foundation
import Security

// Oasyss Flux — Divyesh Edition
// Native macOS Keychain Helper
// Interfaces directly with Apple Security.framework for secure credential storage.

let serviceName = "com.divyesh.oasyssflux"

func setSecret(account: String, secret: String) -> Bool {
    guard let secretData = secret.data(using: .utf8) else { return false }

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
    print("{\"error\": \"Usage: flux-keychain-helper <get|set|delete> <account> [secret]\"}")
    exit(1)
}

let action = args[1]
let account = args[2]

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
    guard args.count >= 4 else {
        print("{\"error\": \"Missing secret argument\"}")
        exit(1)
    }
    let secret = args[3]
    let ok = setSecret(account: account, secret: secret)
    print("{\"success\": \(ok)}")
case "delete":
    let ok = deleteSecret(account: account)
    print("{\"success\": \(ok)}")
default:
    print("{\"error\": \"Unknown action\"}")
    exit(1)
}
