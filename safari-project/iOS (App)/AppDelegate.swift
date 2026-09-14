//
//  AppDelegate.swift
//  iOS (App)
//
//  Created by Selina on 16/9/2021.
//

import UIKit
import RevenueCat

@main
class AppDelegate: UIResponder, UIApplicationDelegate {

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        setup()

        return true
    }

    func application(_ application: UIApplication, configurationForConnecting connectingSceneSession: UISceneSession, options: UIScene.ConnectionOptions) -> UISceneConfiguration {
        let configuration = UISceneConfiguration(name: "Default", sessionRole: connectingSceneSession.role)
        configuration.delegateClass = SceneDelegate.self
        return configuration
    }

    private func setup() {
#if DEBUG
        Purchases.logLevel = .debug
#endif

        Purchases.configure(withAPIKey: "appl_zwafgAwCGPMseUkwglZJakzTFRS")

        Toast.setup()
    }
}
