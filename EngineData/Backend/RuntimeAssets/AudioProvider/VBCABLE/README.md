# VB-CABLE Release Provider Payload

This directory owns the controlled release staging contract for the initial TranslateIT Meeting audio provider.

## Provider Policy

The initial bundled-provider direction is the **standard VB-Audio VB-CABLE** package only.

Do not substitute or additionally bundle:

- VB-CABLE A+B or C+D;
- Voicemeeter / Banana / Potato;
- another third-party virtual cable;
- a custom TranslateIT audio driver.

The application runtime continues to own route detection/use through the existing Rust/CPAL matched-pair path. This directory is release payload only; it does not become a second audio runtime owner.

## Controlled Layout

```text
VBCABLE/
├─ README.md
├─ NOTICE.txt
└─ Package/                 # ignored by Git; staged only for an authorized release
   ├─ VBCABLE_Setup_x64.exe
   ├─ VBCABLE_Setup.exe
   └─ provider package support files required by the official installer
```

The package must remain extracted as an intact official VB-CABLE distribution because the vendor installer requires access to its accompanying files.

## Distribution Boundary

The R3 release profile is **general end-user distribution only**. VB-Audio's current published licensing page explicitly allows the standard VB-CABLE package to be distributed with another application, free or commercial, and embedded in that application's installer when the donationware model remains applicable. For this profile, the end user must be able to identify VB-CABLE as a VB-Audio product and must be in a position to donate/pay for a license if they find it useful. `NOTICE.txt` therefore carries the official origin plus a direct VB-Audio license/donation page and must remain user-accessible in the installed resources.

This source profile does **not** clear managed professional/company/institution deployment where users or employees are not in a position to see/license VB-CABLE themselves. VB-Audio states that those deployments require volume licensing; distributor licences are governed separately by section 3.4 of its General Terms. Such a release needs its own concrete purchase/agreement evidence before provider bytes may be distributed in that context.

Official terms reviewed for this boundary:

```text
https://vb-audio.com/Services/licensing.htm
https://shop.vb-audio.com/en/content/3-Terms-of-use
https://shop.vb-audio.com/en/win-apps/11-vb-cable.html
```

This is a source-side distribution boundary based on the vendor's published terms, not legal advice. Do not rebrand the driver as a TranslateIT-owned Windows device.

## Exact Pack45 Provenance

The only approved standard Windows provider payload for the current release profile is the public package linked by VB-Audio's official VB-CABLE page:

```text
source URL          https://download.vb-audio.com/Download_CABLE/VBCABLE_Driver_Pack45.zip
package             VBCABLE_Driver_Pack45.zip
official page date  OCT 2024
archive bytes       1318877
archive SHA-256     b950e39f01af1d04ea623c8f6d8eb9b6ea5c477c637295fabf20631c85116bfb
extracted files     31
VBCABLE_Setup.exe   01ffc86b623ff3c75a883aa900c0215a89482988e1c8e55988fc0a9fb513dbed
VBCABLE_Setup_x64   734c35dfa6d98f48782a451633ceb471166ec70d60482fd89a1123d0ee3c4f41
Win10 x64 driver    3.3.1.7 / 2024-10-07
```

Hosted Windows inspection of the exact archive confirmed valid Authenticode signatures on both setup executables from `BUREL VINCENT Entrepreneur individuel`, valid catalog signatures, and the expected Win10 x64 driver metadata. Pack45 contains the ARM64 driver payload but no separate `VBCABLE_Setup_ARM64.exe`; do not invent or require a file that is not in the official archive.

`Package/` must be an exact flat extraction of the reviewed archive. Release preflight pins all 31 filenames and SHA-256 values; a modified, partial, alternate, A+B/C+D, or newly published package must be re-reviewed rather than silently accepted.

## Installation Boundary

The vendor package requires an administrator-level Windows driver installation and recommends/requires restart after installation. Windows may still present its driver/security consent UI even when the vendor installer is invoked in a hidden/silent mode.

Do not add autoclick workarounds, unsigned-driver bypasses, custom certificate handling, or another driver installer merely to suppress Windows consent.

Actual NSIS provider installation behavior, restart handling, endpoint appearance, and meeting-application reception remain installed/target-Windows proof.
