private struct RomeWidgetInstanceSession: Decodable {
  let version: Int
  let origin: String
  let cookieName: String
  let token: String
  let expiresAt: String
}

private enum RomeWidgetRefreshError: Error {
  case missingCredential
  case keychainUnavailable
  case invalidConfiguration
  case invalidResponse
  case unauthorized
}

private final class RomeWidgetTransport: NSObject, URLSessionTaskDelegate, @unchecked Sendable {
  private lazy var session: URLSession = {
    let configuration = URLSessionConfiguration.ephemeral
    configuration.requestCachePolicy = .reloadIgnoringLocalCacheData
    configuration.timeoutIntervalForRequest = 15
    configuration.timeoutIntervalForResource = 20
    configuration.httpCookieAcceptPolicy = .never
    configuration.httpShouldSetCookies = false
    return URLSession(configuration: configuration, delegate: self, delegateQueue: nil)
  }()

  func urlSession(
    _ session: URLSession,
    task: URLSessionTask,
    willPerformHTTPRedirection response: HTTPURLResponse,
    newRequest request: URLRequest,
    completionHandler: @escaping (URLRequest?) -> Void
  ) {
    completionHandler(nil)
  }

  func refresh(origin: URL, token: String) async throws -> [String: Any] {
    guard let endpoint = URL(string: "/api/ai-tools/refresh", relativeTo: origin)?.absoluteURL,
          RomeWidgetRefreshEngine.sameOrigin(endpoint, origin) else {
      throw RomeWidgetRefreshError.invalidConfiguration
    }
    var request = URLRequest(url: endpoint)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Accept")
    request.setValue("rome_session=\(token)", forHTTPHeaderField: "Cookie")

    let (data, rawResponse) = try await session.data(for: request)
    guard let response = rawResponse as? HTTPURLResponse,
          let responseURL = response.url,
          RomeWidgetRefreshEngine.sameOrigin(responseURL, origin) else {
      throw RomeWidgetRefreshError.invalidResponse
    }
    if response.statusCode == 401 || response.statusCode == 403 {
      throw RomeWidgetRefreshError.unauthorized
    }
    guard response.statusCode == 200,
          let body = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
      throw RomeWidgetRefreshError.invalidResponse
    }
    return body
  }
}

actor RomeWidgetRefreshEngine {
  static let shared = RomeWidgetRefreshEngine()

  private static let timelineKey = "__expo_widgets_TokenUsageWidget_timeline"
  private static let credentialKey = "rome.widget.instance-session.v1"
  // Expo SecureStore appends this suffix when requireAuthentication is false.
  private static let credentialService = "cc.romeos.mobile.widget-session:no-auth"
  private static let scheduledCooldown: TimeInterval = 15 * 60
  private static let normalRetry: TimeInterval = 30 * 60
  private static let extendedRetry: TimeInterval = 60 * 60

  private let transport = RomeWidgetTransport()
  private var refreshInFlight: (id: UUID, task: Task<Date?, Never>)?

  func refresh() async -> Date? {
    if let refreshInFlight {
      return await refreshInFlight.task.value
    }
    let id = UUID()
    let task = Task { await self.performRefresh() }
    refreshInFlight = (id, task)
    let nextRefreshAt = await task.value
    if refreshInFlight?.id == id {
      refreshInFlight = nil
    }
    return nextRefreshAt
  }

  private func performRefresh() async -> Date? {
    guard let defaults = UserDefaults(suiteName: WidgetsStorage.appGroupIdentifier) else {
      return nil
    }
    let now = Date()
    let current = currentProps(defaults: defaults, now: now)
    let requestId = (current?["refreshRequestId"] as? NSNumber)?.doubleValue
    let handledRequestId = defaults.double(forKey: "rome.widget.refresh.handledRequestId")
    let isManual = requestId.map { $0 > handledRequestId } ?? false

    do {
      let credential = try readCredential()
      guard credential.version == 1,
            credential.cookieName == "rome_session",
            validSessionToken(credential.token),
            let origin = Self.exactOrigin(credential.origin),
            let expiresAt = Self.parseDate(credential.expiresAt),
            expiresAt > now else {
        throw RomeWidgetRefreshError.missingCredential
      }

      let identity = "\(credential.origin)|\(credential.expiresAt)"
      let previousIdentity = defaults.string(forKey: "rome.widget.refresh.credentialIdentity")
      let lastAttemptAt = previousIdentity == identity
        ? defaults.double(forKey: "rome.widget.refresh.lastAttemptAt")
        : 0
      defaults.set(identity, forKey: "rome.widget.refresh.credentialIdentity")
      if !isManual,
         lastAttemptAt > 0,
         now.timeIntervalSince1970 - lastAttemptAt < Self.scheduledCooldown {
        return Date(timeIntervalSince1970: lastAttemptAt + Self.scheduledCooldown)
      }
      if isManual, let requestId {
        defaults.set(requestId, forKey: "rome.widget.refresh.handledRequestId")
      }
      defaults.set(now.timeIntervalSince1970, forKey: "rome.widget.refresh.lastAttemptAt")

      let freshSnapshot = try await fetchSnapshot(
        origin: origin,
        token: credential.token,
        now: now
      )
      guard let activeCredential = try? readCredential(),
            activeCredential.origin == credential.origin,
            activeCredential.token == credential.token else {
        return now.addingTimeInterval(60)
      }
      writeSnapshot(freshSnapshot, preserving: current, defaults: defaults, now: now)
      defaults.set(now.timeIntervalSince1970, forKey: "rome.widget.refresh.lastSuccessAt")
      defaults.removeObject(forKey: "rome.widget.refresh.lastFailureAt")
      defaults.set(0, forKey: "rome.widget.refresh.failureCount")
      return now.addingTimeInterval(Self.normalRetry)
    } catch RomeWidgetRefreshError.missingCredential {
      writeSnapshot(authRequiredSnapshot(now: now), preserving: current, defaults: defaults, now: now)
      return nil
    } catch RomeWidgetRefreshError.unauthorized {
      deleteCredential()
      defaults.removeObject(forKey: "rome.widget.refresh.credentialIdentity")
      defaults.removeObject(forKey: "rome.widget.refresh.lastAttemptAt")
      writeSnapshot(authRequiredSnapshot(now: now), preserving: current, defaults: defaults, now: now)
      defaults.set(now.timeIntervalSince1970, forKey: "rome.widget.refresh.lastFailureAt")
      return nil
    } catch RomeWidgetRefreshError.keychainUnavailable {
      recordTransientFailure(current: current, defaults: defaults, now: now)
      return retryDate(defaults: defaults, now: now)
    } catch {
      recordTransientFailure(current: current, defaults: defaults, now: now)
      return retryDate(defaults: defaults, now: now)
    }
  }

  private func fetchSnapshot(origin: URL, token: String, now: Date) async throws -> [String: Any] {
    let state = try await transport.refresh(origin: origin, token: token)
    guard let snapshot = Self.usageSnapshot(from: state, now: now) else {
      throw RomeWidgetRefreshError.invalidResponse
    }
    return snapshot
  }

  private func currentProps(defaults: UserDefaults, now: Date) -> [String: Any]? {
    guard let timeline = defaults.array(forKey: Self.timelineKey) as? [[String: Any]] else {
      return nil
    }
    let nowMilliseconds = now.timeIntervalSince1970 * 1000
    return timeline
      .filter { (($0["timestamp"] as? NSNumber)?.doubleValue ?? 0) <= nowMilliseconds }
      .max { lhs, rhs in
        ((lhs["timestamp"] as? NSNumber)?.doubleValue ?? 0) <
          ((rhs["timestamp"] as? NSNumber)?.doubleValue ?? 0)
      }?["props"] as? [String: Any] ?? timeline.first?["props"] as? [String: Any]
  }

  private func writeSnapshot(
    _ value: [String: Any],
    preserving current: [String: Any]?,
    defaults: UserDefaults,
    now: Date
  ) {
    var snapshot = value
    if let assets = current?["assets"] {
      snapshot["assets"] = assets
    }
    snapshot.removeValue(forKey: "refreshRequestId")
    snapshot.removeValue(forKey: "stale")
    defaults.set(
      [["timestamp": Int(now.timeIntervalSince1970 * 1000), "props": snapshot]],
      forKey: Self.timelineKey
    )
  }

  private func recordTransientFailure(
    current: [String: Any]?,
    defaults: UserDefaults,
    now: Date
  ) {
    var snapshot = current ?? emptySnapshot(now: now)
    snapshot["state"] = "offline"
    snapshot["updatedAt"] = Int(now.timeIntervalSince1970 * 1000)
    writeSnapshot(snapshot, preserving: current, defaults: defaults, now: now)
    defaults.set(now.timeIntervalSince1970, forKey: "rome.widget.refresh.lastFailureAt")
    defaults.set(
      defaults.integer(forKey: "rome.widget.refresh.failureCount") + 1,
      forKey: "rome.widget.refresh.failureCount"
    )
  }

  private func retryDate(defaults: UserDefaults, now: Date) -> Date {
    let delay = defaults.integer(forKey: "rome.widget.refresh.failureCount") >= 2
      ? Self.extendedRetry
      : Self.normalRetry
    return now.addingTimeInterval(delay)
  }

  private func emptySnapshot(now: Date) -> [String: Any] {
    [
      "schemaVersion": 1,
      "state": "empty",
      "updatedAt": Int(now.timeIntervalSince1970 * 1000),
      "providers": [
        ["id": "codex", "status": "unavailable", "quotaExhausted": false],
        ["id": "claude", "status": "unavailable", "quotaExhausted": false],
      ],
    ]
  }

  private func authRequiredSnapshot(now: Date) -> [String: Any] {
    var snapshot = emptySnapshot(now: now)
    snapshot["state"] = "auth-required"
    return snapshot
  }

  private func validSessionToken(_ token: String) -> Bool {
    !token.isEmpty &&
      !token.contains(";") &&
      token.rangeOfCharacter(from: .newlines) == nil
  }

  private func readCredential() throws -> RomeWidgetInstanceSession {
    guard let accessGroup = Bundle.main.object(forInfoDictionaryKey: "RomeKeychainAccessGroup") as? String,
          !accessGroup.isEmpty else {
      throw RomeWidgetRefreshError.invalidConfiguration
    }
    let keyData = Data(Self.credentialKey.utf8)
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: Self.credentialService,
      kSecAttrGeneric as String: keyData,
      kSecAttrAccount as String: keyData,
      kSecAttrAccessGroup as String: accessGroup,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var item: CFTypeRef?
    let status = SecItemCopyMatching(query as CFDictionary, &item)
    if status == errSecInteractionNotAllowed || status == errSecNotAvailable {
      throw RomeWidgetRefreshError.keychainUnavailable
    }
    guard status == errSecSuccess, let data = item as? Data else {
      throw RomeWidgetRefreshError.missingCredential
    }
    do {
      return try JSONDecoder().decode(RomeWidgetInstanceSession.self, from: data)
    } catch {
      throw RomeWidgetRefreshError.missingCredential
    }
  }

  private func deleteCredential() {
    guard let accessGroup = Bundle.main.object(forInfoDictionaryKey: "RomeKeychainAccessGroup") as? String,
          !accessGroup.isEmpty else {
      return
    }
    let keyData = Data(Self.credentialKey.utf8)
    SecItemDelete([
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: Self.credentialService,
      kSecAttrGeneric as String: keyData,
      kSecAttrAccount as String: keyData,
      kSecAttrAccessGroup as String: accessGroup,
    ] as CFDictionary)
  }

  private static func usageSnapshot(from state: [String: Any], now: Date) -> [String: Any]? {
    guard let codex = state["codex"] as? [String: Any],
          let claude = state["claude"] as? [String: Any] else {
      return nil
    }
    let providers = [
      providerSnapshot(id: "codex", provider: codex),
      providerSnapshot(id: "claude", provider: claude),
    ]
    let nowMilliseconds = now.timeIntervalSince1970 * 1000
    let ready = providers.contains { ($0["status"] as? String) == "ready" }
    return [
      "schemaVersion": 1,
      "state": ready ? "ready" : "empty",
      "updatedAt": Int(nowMilliseconds),
      "providers": providers,
    ]
  }

  private static func providerSnapshot(
    id: String,
    provider: [String: Any]
  ) -> [String: Any] {
    if (provider["loggedIn"] as? Bool) == false {
      return ["id": id, "status": "not-connected", "quotaExhausted": false]
    }
    let usage = provider["usage"] as? [String: Any]
    let fiveHour = usageWindow(usage?["fiveHour"])
    let sevenDay = usageWindow(usage?["sevenDay"])
    let hasUsage = fiveHour != nil || sevenDay != nil
    let exhausted = (provider["quotaExhausted"] as? Bool) == true ||
      ((fiveHour?["usedPercent"] as? NSNumber)?.doubleValue ?? 0) >= 100 ||
      ((sevenDay?["usedPercent"] as? NSNumber)?.doubleValue ?? 0) >= 100
    var snapshot: [String: Any] = [
      "id": id,
      "status": hasUsage ? "ready" : "unavailable",
      "quotaExhausted": exhausted,
    ]
    if hasUsage,
       let checkedAtValue = usage?["checkedAt"] as? String,
       let checkedAt = parseDate(checkedAtValue) {
      snapshot["checkedAt"] = Int(checkedAt.timeIntervalSince1970 * 1000)
    }
    if let fiveHour {
      snapshot["fiveHour"] = fiveHour
    }
    if let sevenDay {
      snapshot["sevenDay"] = sevenDay
    }
    return snapshot
  }

  private static func usageWindow(_ value: Any?) -> [String: Any]? {
    guard let window = value as? [String: Any],
          let rawPercent = (window["usedPercent"] as? NSNumber)?.doubleValue,
          rawPercent.isFinite else {
      return nil
    }
    var projected: [String: Any] = ["usedPercent": min(100, max(0, rawPercent))]
    if let resetsAtValue = window["resetsAt"] as? String,
       let resetsAt = parseDate(resetsAtValue) {
      projected["resetsAt"] = Int(resetsAt.timeIntervalSince1970 * 1000)
    }
    return projected
  }

  static func parseDate(_ value: String) -> Date? {
    let fractional = ISO8601DateFormatter()
    fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    return fractional.date(from: value) ?? ISO8601DateFormatter().date(from: value)
  }

  static func exactOrigin(_ value: String) -> URL? {
    guard let components = URLComponents(string: value),
          components.scheme == "https",
          components.host != nil,
          components.user == nil,
          components.password == nil,
          (components.path.isEmpty || components.path == "/"),
          components.query == nil,
          components.fragment == nil,
          let url = components.url else {
      return nil
    }
    return url
  }

  static func sameOrigin(_ lhs: URL, _ rhs: URL) -> Bool {
    lhs.scheme?.lowercased() == rhs.scheme?.lowercased() &&
      lhs.host?.lowercased() == rhs.host?.lowercased() &&
      lhs.port == rhs.port
  }
}
