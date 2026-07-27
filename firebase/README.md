# Firebase Security Files

이 폴더는 앱에 연결된 Firestore 권한 규칙과 emulator 검증 설정을 보관한다.
현재 working tree의 trusted endpoint 및 client service는 구현되어 있지만,
production 배포·환경 연결은 별도 승인과 live QA가 필요하다.

현재 상태:

- `firestore.rules`는 emulator 회귀를 통과한 현재 후보이며 production 반영 전
  배포 환경과 운영 절차를 다시 확인한다.
- Firestore client service와 trusted create/join/save/list/feedback endpoint가
  앱에 연결되어 있다.
- 서버 환경변수나 멤버십 조건이 없으면 학생은 명시된 deferred/local 활동만
  계속할 수 있다. 개인정보가 포함된 제출 snapshot을 browser localStorage에
  fallback 저장하거나 제출 완료로 표시하지 않는다.
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

1. 승인된 Vercel Firebase Admin 환경변수 연결
2. 테스트 수업방에서 수업코드 + 입장 확인코드 기반 멤버십·제출·피드백 live QA
3. 입장 확인코드 회전 절차 확정
4. 학생 자료 보유 기간·관리자 삭제·incident 대응 절차 확정
5. 제한 beta 수업방에서 제출 저장 활성화
