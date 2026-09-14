# uBlacklist for Safari

The app is a wrapper of [uBlacklist](https://github.com/iorate/uBlacklist) for Safari.

For more information about uBlacklist usage, please visit the [uBlacklist home page](https://github.com/iorate/uBlacklist).

## How to use

### 1. Fetch the code

```
git clone --recurse-submodules https://github.com/HoneyLuka/uBlacklist.git

cd uBlacklist

git checkout safari-port
```

### 2. Build uBlacklist

To build this extension, [Node.js](https://nodejs.org/en/)>=18 is required.

```
pnpm install

pnpm build -b safari
```

### 3. Build uBlacklist for Safari project

To build this project, [Cocoapods](https://cocoapods.org) and Xcode 16 or later (the project uses file system synchronized folders) are required.

```
cd safari-project

pod install
```

### 4. Change project version (Optional)

```
cd scripts

ruby change_version.rb #{version} #{build_number}

# Example: ruby change_version.rb 5.1.0 2026091401
```

The build number follows the `YYYYMMDDNN` rule (e.g. `2026091401` is the first build on Sep 14, 2026).

### Note

**If the plugin is not found in Safari when you run it, you may need to turn on 'Allow Unsigned Extensions' in Safari.**

## Release to the App Store (GitHub Actions)

The [Release to App Store](../.github/workflows/app-store-release.yml) workflow builds both the iOS and macOS apps and uploads them to App Store Connect. After it finishes, edit the release notes on [App Store Connect](https://appstoreconnect.apple.com) and submit for review as usual.

### One-time setup (repository secrets)

| Secret                    | Value                                                                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `ASC_KEY_ID`              | App Store Connect API key ID                                                                                                                                                         |
| `ASC_ISSUER_ID`           | App Store Connect API issuer ID                                                                                                                                                      |
| `ASC_API_KEY`             | Base64-encoded contents of the API key `.p8` file (`base64 -i AuthKey_XXXX.p8`)                                                                                                      |
| `DROPBOX_API_KEY`         | Same value as `.env.local`                                                                                                                                                           |
| `DROPBOX_API_SECRET`      | Same value as `.env.local`                                                                                                                                                           |
| `GOOGLE_DRIVE_API_KEY`    | Same value as `.env.local`                                                                                                                                                           |
| `GOOGLE_DRIVE_API_SECRET` | Same value as `.env.local`                                                                                                                                                           |
| `ONEDRIVE_CLIENT_ID`      | _Optional_. Safari builds never show the OneDrive sync option (upstream gates it by browser), so this is normally unneeded; set it only if upstream ever enables OneDrive for Safari |

The App Store Connect API key needs the **Admin** role: cloud signing requires access to the certificates and profiles resources, which only Admin keys have (an App Manager key can read apps/builds but fails export with "Cloud signing permission error"). Signing is fully automatic: `xcodebuild -allowProvisioningUpdates` uses the Xcode-managed (cloud) distribution certificate, so no `.p12` is stored in the repository.

### Usage

1. Merge the upstream release into `safari-port` locally and push (this step is manual by design).
2. On GitHub, open **Actions → Release to App Store → Run workflow**, choose the branch, and run it. Both inputs are optional:
   - **version**: defaults to the version in `package.json`
   - **build number**: defaults to `YYYYMMDDNN`, where `NN` is one more than the highest `NN` already uploaded to App Store Connect today (queried via the App Store Connect API; falls back to `01` if unavailable)
3. Wait for the two `Build and upload` jobs to finish, then edit the version metadata and submit for review on App Store Connect.

## Locale

The project uses file system synchronized folders, so locale files are picked up automatically; adding a locale only requires copying the `.lproj` directory.

### Use script

```
cd scripts

ruby add_locale.rb #{based_locale} #{target_locale}

# Example: ruby add_locale.rb en ja
```

Then translate `Localizable.strings` at `safari-project/iOS (App)/Common/Intl/#{target_locale}.lproj` and `safari-project/macOS (App)/Common/Intl/#{target_locale}.lproj`

## License

The app is licensed under [MIT License](LICENSE).
