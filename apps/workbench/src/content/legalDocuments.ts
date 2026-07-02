export type LegalDocumentId = 'privacy' | 'terms' | 'manager';

type LegalSection = {
  title: string;
  paragraphs: string[];
  items?: string[];
};

type LegalDocument = {
  id: LegalDocumentId;
  eyebrow: string;
  title: string;
  effectiveDate: string;
  summary: string;
  sections: LegalSection[];
};

export const informationManager = {
  name: '이원재',
  affiliation: '서울 강동고등학교',
  role: '교사',
  contact: '02-427-0231',
  note: '개인정보 보호를 위하여 교사의 개인 휴대전화 번호는 공개하지 않습니다.',
};

export const legalDocuments: Record<LegalDocumentId, LegalDocument> = {
  privacy: {
    id: 'privacy',
    eyebrow: '개인정보 보호',
    title: '개인정보처리방침',
    effectiveDate: '2026년 7월 1일',
    summary:
      '본 서비스는 학생 회원가입과 서버 제출 저장을 아직 운영하지 않으며, 학생 활동은 수업코드와 수업용 닉네임 또는 익명 ID를 중심으로 처리합니다.',
    sections: [
      {
        title: '제1조 개인정보의 처리 목적',
        paragraphs: [
          '본 서비스는 수업 활동 입장, 분자구조 모델링 활동 진행, 활동 결과 임시 저장 및 내보내기, 교사용 기능 준비를 위하여 필요한 최소 범위의 정보를 처리합니다.',
          '처리 목적이 변경되는 경우에는 관련 법령에 따라 별도 안내 또는 동의 절차를 진행합니다.',
        ],
      },
      {
        title: '제2조 개인정보의 처리 및 보유기간',
        paragraphs: [
          '현재 본 서비스는 학생 개인정보와 제출물을 서버에 저장하지 않습니다.',
          '학생 세션 정보는 현재 브라우저의 앱 실행 상태에서만 유지되며, 활동 결과 임시 저장은 학생이 사용하는 브라우저의 localStorage에만 보관됩니다.',
          '향후 Firestore 저장 기능을 도입하는 경우, 보유 기간과 삭제 절차를 별도로 안내합니다.',
        ],
      },
      {
        title: '제3조 처리하는 개인정보 항목',
        paragraphs: [
          '현재 단계에서 서버로 학생 개인정보를 수집하지 않습니다. 다만 웹앱 사용 과정에서 수업코드, 수업용 닉네임 또는 익명 ID, 활동 질문 응답, 학생이 그린 분자 구조 데이터, 구조 확인 결과가 브라우저 내부에서 처리될 수 있습니다.',
        ],
        items: [
          '수집하지 않는 정보: 주민등록번호, 주소, 전화번호, 학생 이메일, 실명, 학번, 민감정보',
          '향후 교사용 Firebase Auth 연결 시 교사 계정의 이메일, 표시 이름, 인증 UID 등이 처리될 수 있습니다.',
        ],
      },
      {
        title: '제4조 만 14세 미만 아동의 개인정보 처리',
        paragraphs: [
          '현재 본 서비스는 학생 회원가입과 서버 제출 저장을 운영하지 않습니다. 학교 수업에서 만 14세 미만 학생이 사용하는 경우, 담당 교사는 학교의 개인정보 보호 지침과 가정통신문 등 필요한 절차를 확인해야 합니다.',
        ],
      },
      {
        title: '제5조 개인정보의 파기',
        paragraphs: [
          '현재 서버 DB 파기 대상은 없습니다. 브라우저 임시 저장 정보는 이용자가 브라우저 저장공간을 삭제하거나 앱에서 저장 결과를 삭제하면 제거됩니다.',
          '향후 서버 저장 도입 시 보유 기간 경과 또는 처리 목적 달성 후 지체 없이 파기합니다.',
        ],
      },
      {
        title: '제6조 안전성 확보조치',
        paragraphs: [
          '본 서비스는 학생 실명, 학번, 연락처를 기본 입력 항목으로 요구하지 않습니다. Firebase 설정값과 배포 환경값은 환경변수로 관리하고, 비공개 키는 공개 저장소에 저장하지 않습니다.',
          'Firestore Security Rules와 교사용 인증 구조가 확정되기 전까지 학생 제출 데이터를 production 서버에 저장하지 않습니다.',
        ],
      },
      {
        title: '제7조 정보주체와 법정대리인의 권리',
        paragraphs: [
          '학생 및 법정대리인은 개인정보 열람, 정정, 삭제, 처리정지를 요청할 수 있습니다. 현재 브라우저에 임시 저장한 활동 결과는 해당 브라우저에서 직접 삭제할 수 있습니다.',
        ],
      },
      {
        title: '제8조 개인정보 보호책임자',
        paragraphs: [
          `${informationManager.name} ${informationManager.role}(${informationManager.affiliation})가 개인정보 처리에 관한 업무를 총괄합니다. 문의 연락처는 ${informationManager.contact}입니다.`,
          informationManager.note,
        ],
      },
      {
        title: '제9조 개인정보처리방침 변경',
        paragraphs: [
          '이 개인정보처리방침은 2026년 7월 1일부터 적용됩니다. 학생 계정, 교사 인증, Firestore 저장, 제출물 서버 저장 등이 활성화되는 경우 본 방침을 수정하고 웹앱 화면을 통해 안내합니다.',
        ],
      },
    ],
  },
  terms: {
    id: 'terms',
    eyebrow: '서비스 이용',
    title: '이용약관',
    effectiveDate: '2026년 7월 1일',
    summary:
      '본 약관은 고등학교 화학 수업용 웹앱의 무료 이용, 학생 활동, 교사용 준비 화면, 외부 3D 자료 사용 기준을 설명합니다.',
    sections: [
      {
        title: '제1조 목적',
        paragraphs: [
          '이 약관은 본 서비스가 제공하는 무료 교육용 웹 애플리케이션을 이용함에 있어 서비스 제공자와 이용자의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.',
        ],
      },
      {
        title: '제2조 정의',
        paragraphs: [
          '서비스란 분자 구조 그리기, 구조 확인, 분자식 및 평균 분자량 표시, 3D 구조 보기, 수업 활동 기록 기능을 말합니다.',
          '이용자란 학생, 교사 및 기타 이용자를 말하며, 학생 이용자는 수업코드와 수업용 닉네임 또는 익명 ID로 활동에 입장합니다.',
        ],
      },
      {
        title: '제3조 약관의 명시와 개정',
        paragraphs: [
          '본 서비스는 이용자가 쉽게 확인할 수 있도록 웹앱 화면 하단에 이용약관 링크를 게시합니다. 약관을 개정할 경우 적용일자 및 개정사유를 서비스 화면 또는 문서로 안내합니다.',
        ],
      },
      {
        title: '제4조 서비스의 제공',
        paragraphs: [
          '본 서비스는 2D 분자 구조 입력, 구조 확인, 3D 구조 시각화, 예제 분자 불러오기, 활동 질문 응답, 결과 임시 저장, 보고서 저장, 활동지 인쇄 기능을 무료로 제공합니다.',
        ],
      },
      {
        title: '제5조 서비스의 중단',
        paragraphs: [
          '시스템 점검, 배포, 오류 수정, 외부 라이브러리 장애, 통신 장애 등의 사유가 발생한 경우 서비스 제공을 일시적으로 중단할 수 있습니다.',
          'PubChem 등 외부 자료 제공 서비스의 응답 실패 또는 네트워크 실패로 인해 일부 3D 자료를 불러오지 못할 수 있습니다.',
        ],
      },
      {
        title: '제6조 학생 이용',
        paragraphs: [
          '학생은 회원가입 없이 수업코드와 수업용 닉네임 또는 익명 ID로 활동에 입장합니다. 실명, 학번, 전화번호, 이메일, 주소 등 불필요한 개인정보를 입력하지 않아야 합니다.',
          '학생이 임시 저장한 활동 결과는 현재 사용하는 브라우저에만 저장됩니다.',
        ],
      },
      {
        title: '제7조 교사 이용',
        paragraphs: [
          '교사용 화면은 Firebase Auth 로그인을 사용할 수 있으며, 교사용 비공개 기능은 teacher custom claim 확인 이후 단계적으로 활성화합니다. Firestore 서버 저장 기능은 보안 규칙과 수업 입장 절차가 확정되기 전까지 production에 연결하지 않습니다.',
        ],
      },
      {
        title: '제8조 이용자의 의무',
        paragraphs: [
          '이용자는 타인의 개인정보 입력, 활동 결과 도용, 서비스 운영 방해, 공서양속에 반하는 정보 입력, 화학 모델 결과의 오용을 해서는 안 됩니다.',
        ],
      },
      {
        title: '제9조 저작권',
        paragraphs: [
          '본 서비스가 작성한 화면 구성, 활동 템플릿, 설명 문구, 문서에 대한 저작권은 서비스 제공자에게 귀속됩니다. 외부 라이브러리와 PubChem 자료는 각 제공자의 라이선스 및 이용 조건을 따릅니다.',
        ],
      },
      {
        title: '제10조 화학 정보 및 외부 자료에 관한 고지',
        paragraphs: [
          '분자식과 평균 분자량은 구조 확인을 통과한 데이터에 기반하여 표시합니다. 3D 구조와 VSEPR 예측 모형은 수업 이해를 돕기 위한 교육용 자료이며 정밀 실험값으로 단정해서는 안 됩니다.',
        ],
      },
      {
        title: '제11조 면책조항',
        paragraphs: [
          '본 서비스는 무료 교육용 웹앱으로, 외부 라이브러리, 외부 데이터베이스, 네트워크 상태로 인해 일부 기능이 정상 작동하지 않을 수 있습니다.',
          '전문 연구, 의약품 개발, 안전성 판정, 실험 설계의 단독 근거로 사용해서는 안 됩니다.',
        ],
      },
      {
        title: '제12조 분쟁해결 및 부칙',
        paragraphs: [
          '본 서비스와 이용자 간에 발생한 분쟁에 관하여는 대한민국 법을 적용합니다. 이 약관은 2026년 7월 1일부터 시행됩니다.',
        ],
      },
    ],
  },
  manager: {
    id: 'manager',
    eyebrow: '문의 및 책임자',
    title: '정보관리책임자',
    effectiveDate: '2026년 7월 1일',
    summary:
      '서비스 이용, 개인정보 처리, 수업 운영 중 데이터 관리 관련 문의를 담당합니다.',
    sections: [
      {
        title: '담당자 정보',
        paragraphs: [
          `성명: ${informationManager.name}`,
          `소속: ${informationManager.affiliation}`,
          `직위: ${informationManager.role}`,
          `연락처: ${informationManager.contact}`,
          informationManager.note,
        ],
      },
    ],
  },
};
