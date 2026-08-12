from __future__ import annotations

from pathlib import Path

helper = Path(__file__).with_name("backend_prelocal_b1_patch.py")
source = helper.read_text(encoding="utf-8")
needle = '''if "virtualAudioRouteRuntime" in startup or "routeProvider" in startup or "prepare_meeting_virtual_audio_route_provider" in startup:\n    raise RuntimeError("startup validator still contains retired route-provider ownership")\nwrite(startup_path, startup)'''
replacement = '''startup = regex_once(\n    startup,\n    r\'''requireMarkers\\(source\\.meetingSession, "Meeting route provider preparation before authority", \\[.*?\\]\\);\\n\''',\n    \'''requireMarkers(source.meetingSession, "Rust Meeting output preparation before authority", [\\n  "prepare_meeting_output_device",\\n  '\"meeting_output_prepare_failed\"',\\n  "let starting = begin_application_meeting_session();",\\n]);\\n\''',\n    "startup native Meeting output preparation assertion",\n)\nif "virtualAudioRouteRuntime" in startup or "routeProvider" in startup or "prepare_meeting_virtual_audio_route_provider" in startup:\n    raise RuntimeError("startup validator still contains retired route-provider ownership")\nwrite(startup_path, startup)'''
if source.count(needle) != 1:
    raise RuntimeError(f"temporary B1 helper safety hook changed unexpectedly: {source.count(needle)} matches")
source = source.replace(needle, replacement, 1)
exec(compile(source, str(helper), "exec"), {"__name__": "__main__", "__file__": str(helper)})
