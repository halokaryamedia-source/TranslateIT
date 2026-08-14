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

VB-Audio permits the standard VB-CABLE package to be distributed with another application when its donationware model remains applicable. Professional/organizational distribution can require paid volume licensing depending on how end users are able to see/license the product.

TranslateIT source does **not** prove that a particular release has the required redistribution/license rights. Release operators must only stage the official package after the applicable distribution terms for that release have been satisfied.

The bundled notice must remain user-visible in the installed resources and identify VB-CABLE as VB-Audio donationware. Do not rebrand the driver as a TranslateIT-owned Windows device.

## Installation Boundary

The vendor package requires an administrator-level Windows driver installation and recommends/requires restart after installation. Windows may still present its driver/security consent UI even when the vendor installer is invoked in a hidden/silent mode.

Do not add autoclick workarounds, unsigned-driver bypasses, custom certificate handling, or another driver installer merely to suppress Windows consent.

Actual NSIS provider installation behavior, restart handling, endpoint appearance, and meeting-application reception remain installed/target-Windows proof.
