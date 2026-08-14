from pathlib import Path

repo = Path('.')
readme_path = repo / 'EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/README.md'
notice_path = repo / 'EngineData/Backend/RuntimeAssets/AudioProvider/VBCABLE/NOTICE.txt'
validator_path = repo / 'EngineData/Frontend/RustApp/scripts/validate_release_payload.mjs'
contract_path = repo / 'EngineData/Frontend/RustApp/scripts/validate_release_package_contract.mjs'

readme = readme_path.read_text(encoding='utf-8')
old = '''## Distribution Boundary

VB-Audio permits the standard VB-CABLE package to be distributed with another application when its donationware model remains applicable. Professional/organizational distribution can require paid volume licensing depending on how end users are able to see/license the product.

TranslateIT source does **not** prove that a particular release has the required redistribution/license rights. Release operators must only stage the official package after the applicable distribution terms for that release have been satisfied.

The bundled notice must remain user-visible in the installed resources and identify VB-CABLE as VB-Audio donationware. Do not rebrand the driver as a TranslateIT-owned Windows device.
'''
new = '''## Distribution Boundary

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
'''
if old not in readme:
    raise SystemExit('provider README distribution boundary anchor missing')
readme = readme.replace(old, new, 1)
readme_path.write_text(readme, encoding='utf-8')

notice_path.write_text('''VB-CABLE is provided by VB-Audio Software. Official origin: https://vb-cable.com/\n\nVB-CABLE is donationware. All participation is welcome. End users can donate/license the standard Windows VB-CABLE directly from VB-Audio: https://shop.vb-audio.com/en/win-apps/11-vb-cable.html\n\nTranslateIT does not claim ownership of the VB-CABLE driver or brand. This package is bundled only under the general end-user donationware distribution profile described by VB-Audio. Managed professional/company/institution deployment where users cannot license VB-CABLE themselves requires separate applicable volume/distributor licensing evidence.\n\nThis bundled provider is used only to provide the virtual playback/recording pair required for TranslateIT Meeting audio routing.\n''', encoding='utf-8')

validator = validator_path.read_text(encoding='utf-8')
anchor = 'const expectedFfmpegLicenseSha256 = "da7eabb7bafdf7d3ae5e9f223aa5bdc1eece45ac569dc21b3b037520b4464768";\n'
insert = '''const expectedVbCableFiles = {
  "pin_in.ico": "934865449455103c1c5997d8220acd160c3891f8a870f8e745b743d12681ac42",
  "pin_out.ico": "e8728a811e1f1af7d2ba31f77e47d449d5bba091e3e89a0df325ac7a3e67652c",
  "readme.txt": "f865f3e78e37006d48e56c93f51eff4ca79acda9969854400d79bfa3db38a8d5",
  "vbaudio_cable_2003.cat": "23a10e3bcd6ffe0de6d3d67830be4c447724b3299e13e954dd6bd2257cf55da1",
  "vbaudio_cable_2003.sys": "9650e20c38429d4680a7e603ecbe6601914ec4c94f8473112f21515bf53b84cf",
  "vbaudio_cable_vista.cat": "810b30193a400b1559302c23f81ef8aaadf038b3caf3aff9bf200b59688a2def",
  "vbaudio_cable_vista.sys": "8b02c26313b75ceb8fb9bd16b6b167cf70d7f3bc977dfc1986c0859f8c72b49f",
  "vbaudio_cable_win7.cat": "1c38afacf115818c925bc26faf216e3563e85bbc4d6d793e5f76f2aa670d08e7",
  "vbaudio_cable_win7.sys": "d047e3ee66e3ee023e598232ea22aa28dbb39adeabe818adfb2a72ab738df0b9",
  "vbaudio_cable_xp.cat": "51434ebbda13caf3c7617ef3035126baacca3e523feaf6828b398d52503d70d2",
  "vbaudio_cable_xp.sys": "9f9bc80a96cc94c761887749e51d9b4fb7ee6741ce624b8b2f9f85cd2e3fb02e",
  "vbaudio_cable64_2003.cat": "70f88e34c857c999367eb5b0303e23f5676b15a79ed4054f374749232baa0e3a",
  "vbaudio_cable64_2003.sys": "5a726f3f1616f587c9f118bf337fd359df3f7cb9fc967a14229d59a31f2a9720",
  "vbaudio_cable64_vista.cat": "cc17731e91f2f071e4a108bba34a2b8dcb69ea5975f4b9c39fcbc670e5cf15fb",
  "vbaudio_cable64_vista.sys": "703572fa9e8aa1616e6b2abd36b91a4718de77eadc02ae05ed2c8f304d058afc",
  "vbaudio_cable64_win10.cat": "0a921ebadbe39cf3fa7c14ff37d1ca22565a9651244bd3ac177dc810bc99072e",
  "vbaudio_cable64_win10.sys": "f01344602472f1b527de5ee98f18987c03db48fea444e457d061e937f1d531d5",
  "vbaudio_cable64_win7.cat": "800b541f06bba3925ba058e7cc7ca837cfd4d845e073309eb2a9d36a2626403a",
  "vbaudio_cable64_win7.sys": "c7f3be383c81ab9aa642479f95872e40e19a4cfd72d4c8d7de80abc11b713e21",
  "vbaudio_cable64arm_win10.sys": "2dc35db3dfad0f25771a3e59af38e8b1268878ebe127476ea75fee109f2927dd",
  "VBCABLE_ControlPanel.exe": "f5b44706fe7ba2eed0516dee791f826dc7a9891e997f6ce9704e2899300b14ff",
  "VBCABLE_Setup_x64.exe": "734c35dfa6d98f48782a451633ceb471166ec70d60482fd89a1123d0ee3c4f41",
  "VBCABLE_Setup.exe": "01ffc86b623ff3c75a883aa900c0215a89482988e1c8e55988fc0a9fb513dbed",
  "vbMmeCable_2003.inf": "64b67f80535d92a1a8625b4c9b9f7302ed959cb375947ca993b8cbaf205d3569",
  "vbMmeCable_vista.inf": "50761a7e817b3a5e96a4eb8e3d31fbc249b0601343dcb732dd3cbe0b0a70f232",
  "vbMmeCable_win7.inf": "5664f33116c1021f4280cfde1c571554fbb70b5480bd58a4fd53b281cd4f515c",
  "vbMmeCable_xp.inf": "58d9737fa732c11c8cc52839a3f61ecf2cb2a98a7dfffe423e3e591de7f56d46",
  "vbMmeCable64_2003.inf": "73aa40eef245da221c6fc6ea3299983421c9a9051df8da7414652304f01bb835",
  "vbMmeCable64_vista.inf": "340feb0ce66ffb7922595a763bf23d2fec07bed9e50b6cb6327e559174c515d4",
  "vbMmeCable64_win10.inf": "61c857be74831cc299d9be62f8d49d137f14063454fc54f859d5bc9b4b813daf",
  "vbMmeCable64_win7.inf": "da35387ccfe813f5c553bb7e0caf4e67adbb4429e742c2bd3c2014f80e6ec516",
};
'''
if anchor not in validator:
    raise SystemExit('release validator constant anchor missing')
validator = validator.replace(anchor, anchor + insert, 1)
old_provider = '''requireFile(join(vbCableRoot, "NOTICE.txt"), "AudioProvider/VBCABLE/NOTICE.txt");
if (existsSync(join(vbCableRoot, "NOTICE.txt"))) {
  const notice = readFileSync(join(vbCableRoot, "NOTICE.txt"), "utf8").toLowerCase();
  if (!notice.includes("vb-audio") || !notice.includes("donationware") || !notice.includes("vb-cable")) {
    fail("VB-CABLE distribution notice must identify VB-Audio, VB-CABLE, and its donationware model.");
  }
}
requireDir(vbCablePackageRoot, "AudioProvider/VBCABLE/Package");
requireFile(join(vbCablePackageRoot, "VBCABLE_Setup_x64.exe"), "AudioProvider/VBCABLE/Package/VBCABLE_Setup_x64.exe");
requireFile(join(vbCablePackageRoot, "VBCABLE_Setup.exe"), "AudioProvider/VBCABLE/Package/VBCABLE_Setup.exe");
for (const forbiddenProviderName of [
  "VBCable_AB_PackSetup.exe",
  "VBCable_CD_PackSetup.exe",
  "VoicemeeterSetup.exe",
  "VoicemeeterProSetup.exe",
  "VoicemeeterPotatoSetup.exe",
]) {
  if (existsSync(join(vbCablePackageRoot, forbiddenProviderName))) {
    fail(`Unapproved alternate audio-provider payload must not be bundled: ${forbiddenProviderName}`);
  }
}
'''
new_provider = '''requireFile(join(vbCableRoot, "NOTICE.txt"), "AudioProvider/VBCABLE/NOTICE.txt");
if (existsSync(join(vbCableRoot, "NOTICE.txt"))) {
  const notice = readFileSync(join(vbCableRoot, "NOTICE.txt"), "utf8").toLowerCase();
  for (const marker of [
    "vb-audio",
    "donationware",
    "vb-cable",
    "https://vb-cable.com/",
    "https://shop.vb-audio.com/en/win-apps/11-vb-cable.html",
    "managed professional/company/institution",
  ]) {
    if (!notice.includes(marker)) fail(`VB-CABLE distribution notice marker is missing: ${marker}`);
  }
}
requireDir(vbCablePackageRoot, "AudioProvider/VBCABLE/Package");
if (existsSync(vbCablePackageRoot) && statSync(vbCablePackageRoot).isDirectory()) {
  const entries = readdirSync(vbCablePackageRoot, { withFileTypes: true });
  const actualNames = entries.map((entry) => entry.name).sort((a, b) => a.localeCompare(b));
  const expectedNames = Object.keys(expectedVbCableFiles).sort((a, b) => a.localeCompare(b));
  if (entries.some((entry) => !entry.isFile()) || JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    fail("AudioProvider/VBCABLE/Package must be the exact flat 31-file extraction of reviewed VBCABLE_Driver_Pack45.zip.");
  }
  for (const [name, expectedHash] of Object.entries(expectedVbCableFiles)) {
    const path = join(vbCablePackageRoot, name);
    requireFile(path, `AudioProvider/VBCABLE/Package/${name}`);
    if (existsSync(path) && sha256File(path) !== expectedHash) {
      fail(`VB-CABLE Pack45 file does not match reviewed official bytes: ${name}`);
    }
  }
}
'''
if old_provider not in validator:
    raise SystemExit('release validator provider block anchor missing')
validator = validator.replace(old_provider, new_provider, 1)
validator_path.write_text(validator, encoding='utf-8')

contract = contract_path.read_text(encoding='utf-8')
old_markers = '''for (const marker of [
  "standard VB-Audio VB-CABLE",
  "Do not substitute or additionally bundle",
  "A+B or C+D",
  "Voicemeeter",
  "custom TranslateIT audio driver",
  "particular release has the required redistribution/license rights",
]) {
  if (!providerReadme.includes(marker)) fail(`VB-CABLE release policy marker is missing: ${marker}`);
}
const normalizedNotice = providerNotice.toLowerCase();
for (const marker of ["vb-audio", "vb-cable", "donationware"]) {
  if (!normalizedNotice.includes(marker)) fail(`VB-CABLE user notice marker is missing: ${marker}`);
}
'''
new_markers = '''for (const marker of [
  "standard VB-Audio VB-CABLE",
  "Do not substitute or additionally bundle",
  "A+B or C+D",
  "Voicemeeter",
  "custom TranslateIT audio driver",
  "general end-user distribution only",
  "managed professional/company/institution deployment",
  "VBCABLE_Driver_Pack45.zip",
  "b950e39f01af1d04ea623c8f6d8eb9b6ea5c477c637295fabf20631c85116bfb",
  "734c35dfa6d98f48782a451633ceb471166ec70d60482fd89a1123d0ee3c4f41",
  "01ffc86b623ff3c75a883aa900c0215a89482988e1c8e55988fc0a9fb513dbed",
]) {
  if (!providerReadme.includes(marker)) fail(`VB-CABLE release policy marker is missing: ${marker}`);
}
const normalizedNotice = providerNotice.toLowerCase();
for (const marker of [
  "vb-audio",
  "vb-cable",
  "donationware",
  "https://vb-cable.com/",
  "https://shop.vb-audio.com/en/win-apps/11-vb-cable.html",
  "managed professional/company/institution",
]) {
  if (!normalizedNotice.includes(marker)) fail(`VB-CABLE user notice marker is missing: ${marker}`);
}
'''
if old_markers not in contract:
    raise SystemExit('release package provider marker block anchor missing')
contract = contract.replace(old_markers, new_markers, 1)
contract_path.write_text(contract, encoding='utf-8')

print('[r3] provider distribution/provenance contract patch applied')
