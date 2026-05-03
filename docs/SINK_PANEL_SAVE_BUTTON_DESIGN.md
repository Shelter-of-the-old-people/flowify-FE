# Sink Panel Save Button Design

## 1. 목적

Google Drive 등 sink 상세 설정 패널에서 사용자가 값을 입력하는 즉시 설정이 반영되는 현재 동작을 중단하고,
**반드시 패널 내부 저장 버튼을 눌렀을 때만 sink 설정이 editor store에 반영되도록** 구조를 재설계한다.

이번 설계는 `features/configure-node`의 편집 책임과 `features/workflow-editor`의 저장 책임을 분리하고,
컨벤션의 상태 관리 원칙에 맞게 panel local draft와 global store를 다시 정렬하는 것을 목표로 한다.

---

## 2. 현재 구현 상태

### 2.1 현재 sink 패널 동작

현재 [SinkNodePanel.tsx](/d:/flowify-fe/src/features/configure-node/ui/panels/SinkNodePanel.tsx) 는 다음 흐름으로 동작한다.

1. 각 입력 필드가 local `draftValues`를 가진다.
2. 입력 필드에서 포커스가 빠질 때 `onBlur`로 `commitFieldChange()`가 호출된다.
3. `commitFieldChange()`는 즉시 `updateNodeConfig()`를 호출한다.
4. `updateNodeConfig()`는 workflow store의 해당 node config를 바로 수정하고 `isDirty = true`를 만든다.
5. required field가 모두 채워졌다면 sink node의 `config.isConfigured`도 같이 갱신된다.

즉 지금은 **편집 중인 값(draft)** 과 **editor에 반영된 값(committed config)** 사이에 중간 단계가 없다.

### 2.2 현재 구조의 문제

이 구조 때문에 사용자는 다음과 같이 느낀다.

- 다른 필드를 클릭하는 순간 현재 필드 blur가 발생한다.
- blur 시점에 config가 store에 반영된다.
- required field가 모두 충족되면 완료 상태도 같이 바뀐다.
- 결과적으로 "입력 중"과 "설정 저장 완료"가 구분되지 않는다.

특히 Google Drive sink는 backend schema 기준 required field가 `folder_id` 하나뿐이어서,
`folder_id`가 들어가는 순간 사용자는 "저장 버튼도 없는데 저장돼 버린다"고 느끼게 된다.

관련 코드:

- [SinkNodePanel.tsx](/d:/flowify-fe/src/features/configure-node/ui/panels/SinkNodePanel.tsx)
- [workflowStore.ts](/d:/flowify-fe/src/features/workflow-editor/model/workflowStore.ts)
- backend schema: [sink_catalog.json](/d:/flowify-be/flowify-BE-spring/src/main/resources/catalog/sink_catalog.json)

---

## 3. 문제 정의

현재 문제는 단순히 blur 이벤트가 불편한 수준이 아니라, 아래 두 책임이 섞여 있다는 점이다.

1. **패널 내부 편집 상태**
   - 사용자가 지금 입력 중인 임시 값
   - 아직 확정되지 않은 값

2. **editor global state**
   - 캔버스/노드 요약/저장 payload에 반영되는 값
   - workflow dirty state를 변경하는 값

컨벤션 기준으로 보면 panel 내부 편집 상태는 `Zustand` global store가 아니라 **로컬 state** 여야 하고,
global store는 **명시적 사용자 액션 이후에만** 갱신되는 편이 맞다.

참고:
- `docs/CONVENTION.md` 4.4 관사 분리 기준
- `docs/CONVENTION.md` 7.2 Zustand 사용 규칙

---

## 4. 설계 원칙

### 4.1 panel draft와 editor store를 분리한다

- 입력 중 값은 `SinkNodePanel` 내부 local state로 유지한다.
- workflow store는 저장 버튼을 눌렀을 때만 갱신한다.

### 4.2 저장 버튼은 panel 수준의 "설정 반영"이다

이번에 추가하는 버튼은 **워크플로우 전체를 서버에 저장하는 버튼이 아니다.**

정확한 의미는 다음과 같다.

- panel draft -> workflow editor store 반영
- 이후 상단 remote bar의 저장 버튼을 눌러야 서버 저장

즉 저장 단계는 2단계다.

1. sink panel 저장 버튼: local draft를 editor graph에 반영
2. workflow 저장 버튼: editor graph를 backend에 저장

### 4.3 완료 상태는 저장 버튼 이후에만 계산한다

- 타이핑 중에는 `config.isConfigured`를 바꾸지 않는다.
- 저장 버튼 클릭 시점에 required field 충족 여부를 검사한다.
- required field가 모두 채워졌을 때만 committed config와 `isConfigured`를 함께 반영한다.

### 4.4 빈 값은 `null`이 아니라 config에서 제거한다

- sink field를 비웠을 때 `key: null` 형태로 저장하지 않는다.
- `buildCommittedConfigFromDraft()`는 schema field를 순회하면서 **값이 있는 field만** committed config에 포함한다.
- optional field를 비우면 committed config에서 해당 key를 제거한다.
- required field가 비어 있으면 local validation에서 저장을 막고, backend payload에도 key를 넣지 않는다.

이 규칙이 필요한 이유는 backend sink lifecycle이 required field를 볼 때
값 자체보다 **config key 존재 여부**를 기준으로 판단하기 때문이다.

### 4.5 backend lifecycle는 계속 authoritative source로 유지한다

- 최종 실행 가능 여부, missing fields, executable 판단은 여전히 `nodeStatuses`가 authoritative다.
- panel 저장 버튼은 local committed state만 바꾼다.
- backend lifecycle 반영은 workflow save 후 detail refetch로 맞춘다.
- `config.isConfigured`는 panel/canvas의 즉시 UX 힌트로만 사용하고,
  실행 가능 여부나 최종 configured 판정은 계속 `nodeStatuses`를 따른다.

---

## 5. 목표 UX

### 5.1 입력 중

- 사용자가 텍스트를 입력해도 다른 필드로 이동하는 순간 store가 바로 바뀌지 않는다.
- 캔버스 노드 요약이나 완료 상태가 입력 중간에 흔들리지 않는다.

### 5.2 저장 전

- panel 안에 `설정 저장` 버튼이 보인다.
- draft가 store와 달라졌으면 버튼이 활성화된다.
- required field가 비어 있으면 버튼 클릭 시 로컬 validation 메시지를 보여준다.

### 5.3 저장 후

- 버튼을 누른 뒤에만 node config가 store에 반영된다.
- 이 시점에 `isDirty`가 true가 된다.
- required field 충족 시 local `config.isConfigured`도 true가 된다.
- optional field를 비운 경우 committed config에서 해당 key가 제거된다.

### 5.4 workflow 저장 후

- 상단 remote bar 저장 후 detail refetch
- backend `nodeStatuses.configured / missingFields / executable`가 최신화된다

---

## 6. 구체적 변경 설계

## 6.1 `SinkNodePanel`를 draft-driven panel로 재구성

### 현재

- `onBlur` 즉시 `commitFieldChange()`
- field 단위 store 반영

### 변경

- `draftValues`는 유지
- `committedConfigSnapshot` 또는 현재 `sinkConfig`와 비교해 dirty 여부 계산
- 각 입력은 `draftValues`만 갱신
- `설정 저장` 버튼 클릭 시 `applyDraftToNode()` 호출

### 패널 내부 함수 제안

- `getDraftStringValue(fieldKey)`
- `validateDraft(draftValues, sinkSchema)`
- `buildCommittedConfigFromDraft(draftValues, sinkSchema, sinkConfig)`
- `handleSaveDraft()`
- `handleResetDraft()` 또는 `handleDiscardChanges()`

## 6.2 blur 커밋 제거

다음 동작은 제거한다.

- 입력 필드 `onBlur -> updateNodeConfig()`
- select/button 클릭 즉시 store 반영

select의 경우에도 동일하게 local draft만 바꾸고,
저장 버튼을 눌렀을 때 최종 반영한다.

## 6.3 `updateNodeConfig()` 사용 위치 축소

`updateNodeConfig()`는 "편집 중 intermediate state"가 아니라
"사용자 의도로 확정된 config mutation"에만 쓰이도록 의미를 좁힌다.

다만 sink panel은 optional field 제거가 필요하므로
부분 merge 기반 `updateNodeConfig()`만으로는 충분하지 않다.
이번 단계에서는 **전체 config를 명시적으로 교체하는 action (`replaceNodeConfig()`)** 을 추가하고,
sink panel 저장 버튼은 이 action을 사용한다.

즉 panel에서의 호출 시점은:

- communication panel처럼 single-click selection이 곧 확정인 경우
- sink panel에서 저장 버튼을 눌렀을 경우 (`replaceNodeConfig()`)

로 제한한다.

## 6.4 panel local validation 추가

`SinkNodePanel`에 local validation state를 추가한다.

예:

- `validationErrors: Record<string, string>`
- required field 미입력
- number 타입 파싱 실패

validation은 저장 버튼 클릭 시 보여주고,
입력 중에는 공격적으로 완료 상태를 바꾸지 않는다.

## 6.5 버튼 UI 추가

`NodePanelShell` 하단 또는 `SinkNodePanel` 내부에 action row를 추가한다.

임시 설계:

- 좌측: 변경 사항 안내 (`저장되지 않은 변경 사항`)
- 우측:
  - `초기화` 또는 `되돌리기`
  - `설정 저장`

버튼 정책:

- 변경 사항이 없으면 `설정 저장` 비활성화
- readOnly면 둘 다 비활성화
- validation 실패 시 저장 차단

## 6.6 local completed state와 backend completed state 구분

### local

- panel 저장 버튼 클릭 후
- required field 충족 시 `config.isConfigured = true`

이 값은 **local committed state** 이며,
아직 backend detail refetch를 거치지 않은 상태일 수 있다.

### backend authoritative

- workflow save + detail refetch 후
- `nodeStatuses[nodeId].configured`

표시 우선순위는 계속 다음을 유지한다.

- 실행 가능 여부/필수 누락 안내: `nodeStatuses`
- panel 편집 완료 여부/도우미 텍스트: local `config.isConfigured`

---

## 7. 파일별 변경 범위

### 7.1 [src/features/configure-node/ui/panels/SinkNodePanel.tsx](/d:/flowify-fe/src/features/configure-node/ui/panels/SinkNodePanel.tsx)

주요 변경:

- blur 저장 제거
- field edit = local draft only
- validation state 추가
- `설정 저장` 버튼 추가
- `설정 저장` 클릭 시에만 `updateNodeConfig()` 호출

### 7.2 [src/features/configure-node/ui/panels/NodePanelShell.tsx](/d:/flowify-fe/src/features/configure-node/ui/panels/NodePanelShell.tsx)

선택 변경:

- shell에 action slot 추가 가능
- 또는 sink panel 내부에만 action row를 둘 수도 있음

현재 변경 범위를 작게 가져가려면
**shell 공통화보다 SinkNodePanel 내부 배치가 우선**이다.

### 7.3 [src/features/workflow-editor/model/workflowStore.ts](/d:/flowify-fe/src/features/workflow-editor/model/workflowStore.ts)

주요 변경:

- `updateNodeConfig()`는 지금처럼 "부분 config 반영" API로 유지
- `replaceNodeConfig()`를 추가해 전체 committed config 교체를 지원
- sink panel 저장 버튼은 `replaceNodeConfig()`를 사용
- panel draft 편집 단계에서는 어떤 store action도 호출하지 않는다

### 7.4 [src/features/configure-node/ui/panels/CommunicationPanel.tsx](/d:/flowify-fe/src/features/configure-node/ui/panels/CommunicationPanel.tsx)

이 패널은 single action이 곧 확정이라 즉시 반영 유지 가능.

즉 sink panel과 다르게:

- select = commit
- 별도 저장 버튼 없음

으로 남겨도 된다.

---

## 8. 구현 단계 제안

### 단계 1. sink panel 저장 방식 전환

- blur commit 제거
- draft-only 입력 구조로 변경
- `설정 저장` 버튼 추가
- local validation 추가

### 단계 2. 완료 상태 전환 시점 정리

- 저장 버튼 클릭 시에만 `config.isConfigured` 변경
- 캔버스/패널 helper text 재검토

### 단계 3. 회귀 검토

- Google Drive sink
- Notion sink
- select field / text field 혼합 케이스
- workflow save 후 nodeStatuses 재동기화

---

## 9. 체크리스트

### 설계 체크리스트

- [ ] panel draft와 store mutation 책임이 분리된다
- [ ] blur는 저장 트리거가 아니다
- [ ] 저장 버튼 클릭만이 sink config commit 트리거다
- [ ] required field validation은 local panel에서 먼저 수행된다
- [ ] nodeStatuses는 backend authoritative source로 유지된다

### 구현 체크리스트

- [ ] `SinkNodePanel` 입력이 local state만 갱신한다
- [ ] `설정 저장` 버튼이 추가된다
- [ ] 저장 버튼 클릭 시 `replaceNodeConfig()`가 한 번만 호출된다
- [ ] select field도 즉시 commit하지 않고 draft만 바꾼다
- [ ] validation 실패 시 config 반영이 차단된다
- [ ] 비운 optional field가 committed config에서 제거된다
- [ ] `pnpm run build` 통과

---

## 10. 완료 조건

- sink 상세 설정 입력 중에는 다른 필드를 클릭해도 자동 저장되지 않는다
- required field를 모두 채워도 저장 버튼 전에는 완료 상태가 바뀌지 않는다
- 저장 버튼을 눌렀을 때만 sink config가 editor store에 반영된다
- workflow 서버 저장은 기존 remote bar 저장 흐름을 그대로 따른다
