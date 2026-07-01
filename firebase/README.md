# Firebase Draft Files

이 폴더는 실제 Firebase 연결 전 보안 설계 초안을 보관한다.

현재 상태:

- `firestore.rules`는 production 배포용 확정 파일이 아니라 검토/테스트용 초안이다.
- Firestore client write는 아직 앱에서 비활성화되어 있다.
- Firebase Emulator 기반 rules test가 추가되어 있으며, 통과하기 전까지 production Firestore에 연결하지 않는다.

## 테스트 실행

```powershell
cd apps/workbench
npm run test:firestore-rules
```

이 명령은 `firebase.json` 설정으로 Firestore Emulator를 띄운 뒤 `apps/workbench/src/services/firebase/firestoreRules.emulator.test.ts`를 실행한다.
Firestore Emulator 실행에는 JDK 11 이상이 필요하다.
`firebase-tools`는 앱 의존성으로 설치하지 않고 `npx firebase-tools@15.22.4`로만 호출한다.

다음 단계:

1. 거부/허용 케이스 유지 보수
2. 교사용 Firebase Auth 연결
3. 학생 anonymous Auth + trusted join endpoint 연결
4. 제한 beta 수업방에서 제출 저장 활성화
