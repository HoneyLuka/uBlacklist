//
//  SceneDelegate.swift
//  iOS (App)
//
//  Created by Luka on 14/9/2026.
//

import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {

    var window: UIWindow?

    func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
        guard let windowScene = scene as? UIWindowScene else { return }

        window = UIWindow(windowScene: windowScene)
        window?.backgroundColor = .black

        let vc = MainViewController()
        window?.rootViewController = vc
        window?.makeKeyAndVisible()
    }
}
