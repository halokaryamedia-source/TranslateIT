# Realtime Status Mapping

## Purpose
Map DesignPreview status cards to the Dev-Rust realtime status payload contract.

## Related contract

```text
EngineData/Backend/RuntimeContracts/realtime_status_payload_contract.json
```

## Preview card mapping

| Preview card | Payload source | UI state |
| --- | --- | --- |
| `ID > EN` | `language_direction` | Neutral or info card |
| `Local-first` | `worker.available`, `worker.fallback_active` | Ready, partial, or fallback card |
| `Preview only` | static preview note | Neutral card only |

## Runtime mapping after approval

| Payload status | UI treatment |
| --- | --- |
| `idle` | Neutral status |
| `checking` | Neutral progress status |
| `ready` | Green ready status |
| `partial_ready` | Blue or amber status depending on missing assets |
| `fallback` | Amber fallback status |
| `error` | Red error status |

## Integration rule
DesignPreview remains static until approved. After approval, the frontend should consume a Tauri command payload that follows the realtime status payload contract.
