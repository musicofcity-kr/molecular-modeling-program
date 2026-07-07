# Firebase Draft Files

이 폴더는 실제 Firebase 연결 전 보안 설계 초안을 보관한다.

현재 상태:

- `firestore.rules`는 production 배포용 확정 파일이 아니라 검토/테스트용 초안이다.
- Firestore client service와 trusted join endpoint 초안은 앱에 연결되어 있다.
- 서버 환경변수, 교사 권한, 학생 멤버십, Security Rules 조건이 맞지 않으면 앱은 브라우저-local fallback으로 동작한다.
- Firebase Emulator 기반 rules test가 추가되어 있으며, production 확대 전 계속 통과해야 한다.

## 테스트 실행

```powershell
cd apps/workbench
npm run test:firestore-rules
```

이 명령은 `firebase.json` 설정으로 Firestore Emulator를 띄운 뒤 `apps/workbench/src/services/firebase/firestoreRules.emulator.test.ts`를 실행한다.
Firestore Emulator 실행에는 JDK 11 이상이 필요하다.
`firebase-tools`는 앱 의존성으로 설치하지 않고 `npx firebase-tools@15.22.4`로만 호출한다.

다음 단계:

1. Vercel Firebase Admin 환경변수 연결
2. 테스트 수업방에서 수업코드 + 입장 확인코드 기반 멤버십 생성 QA
3. 입장 확인코드 최소 길이와 회전 절차 확정
4. 제한 beta 수업방에서 제출 저장 활성화
